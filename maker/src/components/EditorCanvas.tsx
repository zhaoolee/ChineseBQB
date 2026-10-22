import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cellAnchorPolygon, cellWasAdded } from '../lib/char-layout'
import { freeTextBox, pointInTextBox, scaledFontSize, textBoxHandles, type TextHandleName } from '../lib/free-text-box'
import { pointInPolygon, polygonBounds } from '../lib/geometry'
import { segmentGraphemes } from '../lib/grapheme'
import { collectPatches } from '../lib/plan'
import { paintComposite } from '../lib/paint'
import { BeforeAfter } from './BeforeAfter'
import { CanvasTextInput } from './CanvasTextInput'
import { LoadingPreview } from './LoadingPreview'
import {
  beginGesture,
  canCompare,
  deleteFocusedCell,
  endGesture,
  moveFreeText,
  openLocalFile,
  resizeFreeText,
  select,
  setFreeText,
  setTargetText,
  updateManualPolygon,
  editor,
  visibleEdits,
} from '../state/editor-store'
import { useEditor } from './use-editor'
import type { Point } from '../types'

export function EditorCanvas() {
  const state = useEditor()
  const stageRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resizeObserver = useRef<ResizeObserver | null>(null)
  const [frame, setFrame] = useState({ width: 0, height: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const image = state.image
  const present = useMemo(() => visibleEdits(state), [state.history.present, state.gifFrameIndex])
  // Same judgement as the toolbar: comparison only exists while this frame really has edits.
  const comparable = canCompare(state)
  const comparing = state.comparing && comparable
  const selectedText = useMemo(() => {
    const block = present.blocks.find((item) => item.id === present.selectedId)
    if (block) return {
      id: block.id, text: block.targetText, style: block.textStyle,
      bounds: polygonBounds(block.manualPolygon ?? block.polygon), kind: 'block' as const,
    }
    const layer = present.freeTexts.find((item) => item.id === present.selectedId)
    return layer ? {
      id: layer.id, text: layer.text, style: layer.textStyle,
      bounds: freeTextBox(layer), kind: 'free' as const,
    } : null
  }, [present])
  const editing = editingId === selectedText?.id && !comparing && !state.gifPlaying
  useEffect(() => {
    setEditingId(null)
  }, [image?.source.id, state.gifFrameIndex, comparing, state.gifPlaying, present.selectedId])

  function editText(id: string) {
    select(id, { clearCellFocus: true })
    setEditingId(id)
  }
  // boot() 会先等素材索引再打开 ?src=，这段时间画布是空的；索引失败或链接无效时立刻退出提示。
  const waitingForCatalog = state.catalogLoading && Boolean(new URLSearchParams(location.search).get('src'))
    && !state.image && !state.imageError

  const bindStage = useCallback((node: HTMLElement | null) => {
    stageRef.current = node
    resizeObserver.current?.disconnect()
    resizeObserver.current = null
    if (!node) return
    const measure = () => {
      const width = node.clientWidth
      const height = node.clientHeight
      if (width < 2 || height < 2) return
      setFrame((current) => (current.width === width && current.height === height ? current : { width, height }))
    }
    const observer = new ResizeObserver(measure)
    resizeObserver.current = observer
    observer.observe(node)
    measure()
  }, [])

  useEffect(() => () => resizeObserver.current?.disconnect(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    const current = image
    if (!canvas || !current?.imageData) return
    const patches = collectPatches(present.blocks, current.imageData)
    const texts = present.freeTexts
    paintComposite(current.imageData, patches, texts, canvas)
  }, [image, present])

  const deleteAnchor = useMemo(() => {
    if (!image || !present.selectedId) return null
    const block = present.blocks.find((item) => item.id === present.selectedId)
    const focus = state.cellFocus?.id === present.selectedId ? state.cellFocus : null
    if (focus && !cellIsCommitted(focus, block?.targetText ?? present.freeTexts.find((item) => item.id === present.selectedId)?.text ?? '')) return null
    if (block) {
      if (!focus || !cellWasAdded(block, focus.cells, focus.index, image.naturalWidth, image.naturalHeight)) return null
      const polygon = cellAnchorPolygon(block, focus.cells, focus.index, image.naturalWidth, image.naturalHeight)
      const bounds = polygonBounds(polygon)
      const y = bounds.minY
      return { x: (bounds.minX + bounds.maxX) / 2, y, below: y < image.naturalHeight * 0.14 }
    }
    const layer = present.freeTexts.find((item) => item.id === present.selectedId)
    if (!layer) return null
    const parts = segmentGraphemes(layer.text)
    const graphemeIndex = focus ? focus.cells.slice(0, focus.index).filter((cell) => cell.length > 0).length : Math.floor((parts.length - 1) / 2)
    const size = layer.textStyle.fontSize
    const x = parts.length > 1 ? layer.x - ((parts.length - 1) * size) / 2 + graphemeIndex * size : layer.x
    const y = layer.y - size * 0.7
    return { x, y, below: y < image.naturalHeight * 0.14 }
  }, [image, present, state.cellFocus])

  const fitted = useMemo(() => {
    if (!image?.naturalWidth || !image.naturalHeight) return { width: 0, height: 0 }
    if (frame.width < 2 || frame.height < 2) return { width: 0, height: 0 }
    const fit = Math.min(frame.width / image.naturalWidth, frame.height / image.naturalHeight)
    return { width: image.naturalWidth * fit, height: image.naturalHeight * fit }
  }, [frame, image])

  const actionAnchor = selectedText ? {
    x: (selectedText.bounds.minX + selectedText.bounds.maxX) / 2,
    y: selectedText.bounds.minY,
    below: image ? selectedText.bounds.minY < image.naturalHeight * 0.14 : false,
  } : null

  if (state.imageLoading || waitingForCatalog) {
    const pending = state.loadingPreview
    return <LoadingPreview
      key={pending?.src ?? 'local'}
      src={pending?.src}
      name={pending?.name}
      phase={pending?.phase ?? 'decode'}
      label={waitingForCatalog && !pending ? '正在读取素材索引…' : undefined}
    />
  }
  if (!image) {
    return (
      <label className="stage empty-stage" ref={bindStage}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-label="上传图片"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void openLocalFile(file)
          }}
        />
        <p>点这里上传图片。也可以点右上角「图库」选一张表情包，或直接粘贴。选中后会自动识别文字。</p>
      </label>
    )
  }
  if (image.source.animated && !image.imageData) {
    return (
      <div className="stage" ref={bindStage}>
        <img className="animated-preview" src={image.previewUrl} alt={image.source.name} />
        <p className="banner">这一帧读不出来，所以不能识别文字。</p>
      </div>
    )
  }

  function eventPoint(event: { clientX: number; clientY: number }): Point {
    const canvas = canvasRef.current
    const bounds = canvas?.getBoundingClientRect()
    if (!bounds || !image) return { x: 0, y: 0 }
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * image.naturalWidth,
      y: ((event.clientY - bounds.top) / bounds.height) * image.naturalHeight,
    }
  }

  return (
    <div className="stage" ref={bindStage}>
      <div
        className="sheet"
        style={{ width: fitted.width, height: fitted.height, transform: `translate(${state.view.panX}px, ${state.view.panY}px) scale(${state.view.scale})` }}
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('button, input') || comparing || state.gifPlaying) return
          const point = eventPoint(event)
          const layer = [...present.freeTexts].reverse().find((item) => pointInTextBox(point, freeTextBox(item)))
          const block = [...present.blocks].reverse().find((item) => pointInPolygon(point, item.manualPolygon ?? item.polygon))
          const id = layer?.id ?? block?.id
          if (id) editText(id)
        }}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          if (target.dataset.handle || target.dataset.layer) return
          const point = eventPoint(event)
          const hit = [...present.blocks].reverse().find((block) => pointInPolygon(point, block.manualPolygon ?? block.polygon))
          if (hit) {
            select(hit.id)
            return
          }
          const textHit = [...present.freeTexts].reverse().find((layer) => pointInTextBox(point, freeTextBox(layer)))
          if (textHit) {
            select(textHit.id)
            beginGesture()
            event.currentTarget.setPointerCapture(event.pointerId)
            event.currentTarget.dataset.drag = 'text'
            event.currentTarget.dataset.dragId = textHit.id
            event.currentTarget.dataset.grabX = String(point.x)
            event.currentTarget.dataset.grabY = String(point.y)
            event.currentTarget.dataset.originX = String(textHit.x)
            event.currentTarget.dataset.originY = String(textHit.y)
            return
          }
        }}
        onPointerMove={(event) => {
          const mode = event.currentTarget.dataset.drag
          if (!mode) return
          if (mode === 'text' && event.currentTarget.dataset.dragId) {
            const point = eventPoint(event)
            const dx = point.x - Number(event.currentTarget.dataset.grabX)
            const dy = point.y - Number(event.currentTarget.dataset.grabY)
            moveFreeText(
              event.currentTarget.dataset.dragId,
              Number(event.currentTarget.dataset.originX) + dx,
              Number(event.currentTarget.dataset.originY) + dy,
            )
            return
          }
          if (mode === 'text-size' && event.currentTarget.dataset.dragId && event.currentTarget.dataset.handleName) {
            const point = eventPoint(event)
            const size = scaledFontSize(
              Number(event.currentTarget.dataset.startSize),
              event.currentTarget.dataset.handleName as TextHandleName,
              { x: Number(event.currentTarget.dataset.centerX), y: Number(event.currentTarget.dataset.centerY) },
              { x: Number(event.currentTarget.dataset.handleX), y: Number(event.currentTarget.dataset.handleY) },
              point,
            )
            resizeFreeText(event.currentTarget.dataset.dragId, size)
            return
          }
          if (mode === 'box' && event.currentTarget.dataset.dragId && image) {
            const point = eventPoint(event)
            const corner = Number(event.currentTarget.dataset.corner)
            const block = editor.getState().history.present.blocks.find((item) => item.id === event.currentTarget.dataset.dragId)
            if (!block) return
            const next = (block.manualPolygon ?? block.polygon).map((item, index) => index === corner ? clampPoint(point, image.naturalWidth, image.naturalHeight) : item)
            updateManualPolygon(block.id, next)
          }
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.dataset.drag) endGesture()
          delete event.currentTarget.dataset.drag
          delete event.currentTarget.dataset.dragId
          delete event.currentTarget.dataset.corner
          delete event.currentTarget.dataset.grabX
          delete event.currentTarget.dataset.grabY
          delete event.currentTarget.dataset.originX
          delete event.currentTarget.dataset.originY
          delete event.currentTarget.dataset.handleName
          delete event.currentTarget.dataset.handleX
          delete event.currentTarget.dataset.handleY
          delete event.currentTarget.dataset.startSize
          delete event.currentTarget.dataset.centerX
          delete event.currentTarget.dataset.centerY
        }}
      >
        <canvas ref={canvasRef} width={image.naturalWidth} height={image.naturalHeight} />
        <svg className="overlay" style={{ display: comparing || state.gifPlaying ? 'none' : undefined }} viewBox={`0 0 ${image.naturalWidth} ${image.naturalHeight}`}>
          {present.blocks.map((block) => {
            const polygon = block.manualPolygon ?? block.polygon
            const selected = present.selectedId === block.id
            const points = polygon.map((point) => `${point.x},${point.y}`).join(' ')
            return (
              <g key={block.id}>
                <polygon
                  points={points}
                  className={selected ? 'box selected' : 'box'}
                  style={{ pointerEvents: editing && editingId === block.id ? 'none' : undefined }}
                  onDoubleClick={(event) => { event.stopPropagation(); editText(block.id) }}
                >
                  <title>双击改字</title>
                </polygon>
                {selected && polygon.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={Math.max(6, image.naturalWidth * 0.012)}
                    className="handle"
                    data-handle="true"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      select(block.id)
                      beginGesture()
                      const sheet = event.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null
                      if (!sheet) return
                      sheet.dataset.drag = 'box'
                      sheet.dataset.dragId = block.id
                      sheet.dataset.corner = String(index)
                      sheet.setPointerCapture(event.pointerId)
                    }}
                  />
                ))}
              </g>
            )
          })}
          {present.freeTexts.filter((layer) => layer.id === present.selectedId).map((layer) => {
            const box = freeTextBox(layer)
            const handleSize = Math.max(6, image.naturalWidth * 0.012)
            return (
              <g key={layer.id}>
                <rect
                  x={box.minX}
                  y={box.minY}
                  width={box.width}
                  height={box.height}
                  className="box selected text-box"
                  style={{ pointerEvents: editing && editingId === layer.id ? 'none' : undefined }}
                  onDoubleClick={(event) => { event.stopPropagation(); editText(layer.id) }}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    select(layer.id)
                    beginGesture()
                    const sheet = event.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null
                    if (!sheet) return
                    const point = eventPoint(event)
                    sheet.dataset.drag = 'text'
                    sheet.dataset.dragId = layer.id
                    sheet.dataset.grabX = String(point.x)
                    sheet.dataset.grabY = String(point.y)
                    sheet.dataset.originX = String(layer.x)
                    sheet.dataset.originY = String(layer.y)
                    sheet.setPointerCapture(event.pointerId)
                  }}
                />
                {textBoxHandles(box).map((handle) => (
                  <circle
                    key={handle.name}
                    cx={handle.x}
                    cy={handle.y}
                    r={handleSize}
                    className={`handle ${handleCursor(handle.name)}`}
                    data-handle="true"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      select(layer.id)
                      beginGesture()
                      const sheet = event.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null
                      if (!sheet) return
                      sheet.dataset.drag = 'text-size'
                      sheet.dataset.dragId = layer.id
                      sheet.dataset.handleName = handle.name
                      sheet.dataset.handleX = String(handle.x)
                      sheet.dataset.handleY = String(handle.y)
                      sheet.dataset.startSize = String(layer.textStyle.fontSize)
                      sheet.dataset.centerX = String(layer.x)
                      sheet.dataset.centerY = String(layer.y)
                      sheet.setPointerCapture(event.pointerId)
                    }}
                  />
                ))}
              </g>
            )
          })}
        </svg>
        {!comparing && !state.gifPlaying && selectedText && actionAnchor && !editing && (
          <div
            className={`selection-actions${actionAnchor.below ? ' below' : ''}`}
            data-layer="true"
            style={{
              left: `${Math.max(13, Math.min(87, actionAnchor.x / image.naturalWidth * 100))}%`,
              top: `${(actionAnchor.below ? selectedText.bounds.maxY : actionAnchor.y) / image.naturalHeight * 100}%`,
              ['--inv-scale' as string]: String(1 / state.view.scale),
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="编辑选中文字"
              title="改字（也可双击文字框）"
              onClick={(event) => { event.stopPropagation(); editText(selectedText.id) }}
            >改字</button>
            {deleteAnchor && <button
              type="button"
              className="selection-delete"
              onClick={(event) => { event.stopPropagation(); deleteFocusedCell() }}
            >删除</button>}
          </div>
        )}
        {editing && selectedText && (
          <CanvasTextInput
            key={selectedText.id}
            text={selectedText.text}
            style={{
              left: `${selectedText.bounds.minX / image.naturalWidth * 100}%`,
              top: `${selectedText.bounds.minY / image.naturalHeight * 100}%`,
              width: `${(selectedText.bounds.maxX - selectedText.bounds.minX) / image.naturalWidth * 100}%`,
              height: `${(selectedText.bounds.maxY - selectedText.bounds.minY) / image.naturalHeight * 100}%`,
              fontSize: Math.max(16, selectedText.style.fontSize * fitted.width / image.naturalWidth),
              fontFamily: selectedText.style.fontFamily,
              fontWeight: selectedText.style.weight ?? 700,
            }}
            onCommit={(text) => selectedText.kind === 'block'
              ? setTargetText(selectedText.id, text) : setFreeText(selectedText.id, text)}
            onDone={() => setEditingId(null)}
          />
        )}
        {comparing && image.imageData && <BeforeAfter imageData={image.imageData} />}
      </div>
    </div>
  )
}

function cellIsCommitted(focus: { index: number; cells: string[] }, committed: string): boolean {
  const cell = focus.cells[focus.index] ?? ''
  if (!cell) return false
  return focus.cells.filter((item) => item.length > 0).join('') === committed
}

function handleCursor(name: TextHandleName): string {
  if (name === 'n' || name === 's') return 'ns'
  if (name === 'e' || name === 'w') return 'ew'
  if (name === 'ne' || name === 'sw') return 'nesw'
  return 'nwse'
}

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(width, Math.max(0, point.x)),
    y: Math.min(height, Math.max(0, point.y)),
  }
}
