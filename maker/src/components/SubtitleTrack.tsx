import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'
import type { GifFrame } from '../lib/gif'
import { closestFrameBoundary, frameTimes } from '../lib/timeline'
import {
  addFreeText,
  deleteSubtitleBlocks,
  resetDocument,
  runGifOcr,
  selectGifSubtitle,
  setGifSubtitleRange,
  setTargetText,
  skipOcr,
} from '../state/editor-store'
import type { OcrBlock } from '../types'
import { useEditor } from './use-editor'

type SubtitleBlock = OcrBlock & {
  startFrame: number
  endFrame: number
  framePolygons?: { frame: number; polygon: OcrBlock['polygon'] }[]
}
type Timing = ReturnType<typeof frameTimes>

const formatSeconds = (ms: number) => (ms / 1000).toFixed(2)
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function isSubtitleBlock(block: OcrBlock): block is SubtitleBlock {
  return typeof block.startFrame === 'number'
    && typeof block.endFrame === 'number'
    && block.endFrame > block.startFrame
}

function subtitleBlocks(blocks: OcrBlock[]): SubtitleBlock[] {
  return blocks
    .filter(isSubtitleBlock)
    .sort((a, b) => a.startFrame - b.startFrame || a.polygon[0].y - b.polygon[0].y)
}

/**
 * GIF-only subtitle rail. It reads every timed OCR block, not just the playhead frame,
 * so an edit made on one frame stays visible and locatable from the rail.
 */
export function SubtitleTrack() {
  const state = useEditor()
  const frames = state.image?.frames
  const frameCount = frames?.length ?? 0
  const timing = useMemo(() => frameTimes(frames ?? []), [frames])
  const progress = state.gifOcrProgress
  const busy = state.ocrStatus === 'loading'
  const failed = state.ocrStatus === 'error'
  const editable = Boolean(state.image?.imageData)
  const subtitles = useMemo(() => subtitleBlocks(state.history.present.blocks), [state.history.present.blocks])
  const deletable = useMemo(() => subtitles.filter(block => block.targetText !== ''), [subtitles])
  const deletableIds = useMemo(() => new Set(deletable.map(block => block.id)), [deletable])
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedCount = deletable.reduce((count, block) => count + (selected.has(block.id) ? 1 : 0), 0)
  const menu = useRef<HTMLDetailsElement>(null)

  // OCR replacement creates new block ids, resetDocument empties the document and a new
  // image starts a new selection scope. Drop ids that no longer point at a deletable cue.
  useEffect(() => {
    setSelectedIds(previous => {
      const next = previous.filter(id => deletableIds.has(id))
      return next.length === previous.length ? previous : next
    })
  }, [deletableIds])

  useEffect(() => {
    setBatchMode(false)
    setSelectedIds([])
  }, [state.image?.source.id])

  if (!frames || frameCount < 2) return null

  const closeMenu = () => { if (menu.current) menu.current.open = false }
  const exitBatch = () => { setBatchMode(false); setSelectedIds([]) }
  const toggleSelected = (id: string) => {
    if (!deletableIds.has(id)) return
    setSelectedIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id)
      : [...previous, id])
  }
  const percent = progress && progress.total > 0
    ? clamp((progress.completed / progress.total) * 100, 0, 100)
    : 0

  return (
    <section className="subtitle-track" aria-label="字幕">
      <div className="subtitle-head">
        <h3>字幕</h3>
        {subtitles.length > 0 && <span className="subtitle-count">{subtitles.length} 条</span>}
        {subtitles.length > 0 && (
          <button
            type="button"
            className="subtitle-batch-toggle"
            aria-pressed={batchMode}
            aria-label={batchMode ? '退出批量选择字幕' : '批量选择字幕'}
            disabled={busy || (!batchMode && deletable.length === 0)}
            onClick={() => { if (batchMode) exitBatch(); else setBatchMode(true) }}
          >
            批量选择
          </button>
        )}
        <details className="subtitle-menu" ref={menu}>
          <summary aria-label="更多字幕操作" title="更多字幕操作">…</summary>
          <div className="subtitle-menu-list">
            <button type="button" disabled={busy} onClick={() => { closeMenu(); void runGifOcr() }}>重新识别</button>
            <button type="button" disabled={!editable} onClick={() => { closeMenu(); addFreeText() }}>添加文字</button>
            <button type="button" disabled={!editable} onClick={() => { closeMenu(); resetDocument() }}>还原原图</button>
          </div>
        </details>
      </div>
      {batchMode && (
        <div className="subtitle-batch" role="group" aria-label="批量字幕操作">
          <span className="subtitle-selected-count" role="status" aria-live="polite">已选 {selectedCount} 条</span>
          <button
            type="button"
            disabled={busy || deletable.length === 0 || selectedCount === deletable.length}
            onClick={() => setSelectedIds(deletable.map(block => block.id))}
          >
            全选
          </button>
          <button type="button" disabled={selectedCount === 0} onClick={() => setSelectedIds([])}>取消全选</button>
          <button
            type="button"
            className="subtitle-batch-delete"
            disabled={busy || selectedCount === 0}
            onClick={() => { deleteSubtitleBlocks(selectedIds); setSelectedIds([]) }}
          >
            删除所选
          </button>
          <button type="button" onClick={exitBatch}>取消</button>
        </div>
      )}
      {busy && (
        <div className="subtitle-progress" role="group" aria-label="字幕识别">
          <span className="subtitle-status" role="status" aria-live="polite">
            {progress ? `识别中 ${progress.completed}/${progress.total}` : '识别中…'}
          </span>
          <button type="button" onClick={skipOcr}>取消</button>
          {progress && (
            <div
              className="subtitle-progress-track"
              role="progressbar"
              aria-label="字幕识别进度"
              aria-valuemin={0}
              aria-valuemax={Math.max(1, progress.total)}
              aria-valuenow={Math.min(progress.completed, Math.max(1, progress.total))}
              aria-valuetext={`已处理 ${progress.completed}/${progress.total} 帧`}
            >
              <span className="subtitle-progress-done" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}
      {failed && !busy && (
        <div className="subtitle-error" role="status" title={state.ocrMessage}>
          <span>识别失败</span>
          <button type="button" onClick={() => { void runGifOcr() }}>重试</button>
        </div>
      )}
      {!busy && !failed && subtitles.length === 0 && <p className="subtitle-empty">暂无字幕</p>}
      {subtitles.length > 0 && (
        <ul className="subtitle-list">
          {subtitles.map((block, index) => (
            <SubtitleRow
              key={block.id}
              block={block}
              index={index}
              frames={frames}
              timing={timing}
              frameIndex={state.gifFrameIndex}
              busy={busy}
              batchMode={batchMode}
              selected={selected.has(block.id)}
              onToggleSelected={() => toggleSelected(block.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function SubtitleRow({
  block,
  index,
  frames,
  timing,
  frameIndex,
  busy,
  batchMode,
  selected,
  onToggleSelected,
}: {
  block: SubtitleBlock
  index: number
  frames: GifFrame[]
  timing: Timing
  frameIndex: number
  busy: boolean
  batchMode: boolean
  selected: boolean
  onToggleSelected: () => void
}) {
  const frameCount = frames.length
  const startFrame = clamp(Math.floor(block.startFrame), 0, Math.max(0, frameCount - 1))
  const endFrame = clamp(Math.ceil(block.endFrame), startFrame + 1, frameCount)
  const startMs = timing.starts[startFrame] ?? 0
  const endMs = timing.starts[endFrame] ?? timing.total
  const active = frameIndex >= startFrame && frameIndex < endFrame
  const deleted = block.targetText === ''
  const changed = block.targetText !== block.originalText
  const number = index + 1
  const [startDraft, setStartDraft] = useState(() => formatSeconds(startMs))
  const [endDraft, setEndDraft] = useState(() => formatSeconds(endMs))
  const [textDraft, setTextDraft] = useState(block.targetText)
  const composing = useRef(false)

  // Undo/redo and successful re-recognition replace the block object. Pull the new
  // range/target into the local drafts without touching an in-progress IME composition.
  useEffect(() => {
    setStartDraft(formatSeconds(startMs))
    setEndDraft(formatSeconds(endMs))
  }, [block.startFrame, block.endFrame, startMs, endMs])

  useEffect(() => {
    if (!composing.current) setTextDraft(block.targetText)
  }, [block.targetText])

  function commitStart() {
    const seconds = Number(startDraft)
    if (startDraft.trim() === '' || !Number.isFinite(seconds)) {
      setStartDraft(formatSeconds(startMs))
      return
    }
    const boundary = closestFrameBoundary(frames, seconds * 1000)
    const nextStart = clamp(boundary, 0, Math.max(0, frameCount - 1))
    const nextEnd = clamp(Math.max(endFrame, nextStart + 1), nextStart + 1, frameCount)
    setStartDraft(formatSeconds(timing.starts[nextStart] ?? 0))
    setGifSubtitleRange(block.id, nextStart, nextEnd)
  }

  function commitEnd() {
    const seconds = Number(endDraft)
    if (endDraft.trim() === '' || !Number.isFinite(seconds)) {
      setEndDraft(formatSeconds(endMs))
      return
    }
    const boundary = closestFrameBoundary(frames, seconds * 1000)
    const nextEnd = clamp(boundary, startFrame + 1, frameCount)
    setEndDraft(formatSeconds(timing.starts[nextEnd] ?? timing.total))
    setGifSubtitleRange(block.id, startFrame, nextEnd)
  }

  function changeText(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value
    setTextDraft(value)
    const native = event.nativeEvent as Event & { isComposing?: boolean }
    if (!composing.current && native.isComposing !== true) setTargetText(block.id, value)
  }

  function endComposition(event: CompositionEvent<HTMLInputElement>) {
    composing.current = false
    const value = event.currentTarget.value
    setTextDraft(value)
    setTargetText(block.id, value)
  }

  function deleteOriginal() {
    if (busy) return
    selectGifSubtitle(block.id)
    setTargetText(block.id, '')
  }

  function restoreOriginal() {
    if (busy) return
    selectGifSubtitle(block.id)
    setTargetText(block.id, block.originalText)
  }

  return (
    <li
      className={`subtitle-item${active ? ' is-active' : ''}${deleted ? ' is-deleted' : ''}${selected ? ' is-selected' : ''}`}
      aria-current={active ? 'true' : undefined}
    >
      <div className="subtitle-line">
        {batchMode && (
          <input
            type="checkbox"
            className="subtitle-check"
            aria-label={`选择字幕 ${number}`}
            checked={selected}
            disabled={busy || deleted}
            onChange={onToggleSelected}
          />
        )}
        {batchMode ? (
          <span
            className="subtitle-time subtitle-time-static"
            aria-label={`字幕 ${number} 时间范围 ${formatSeconds(startMs)} 到 ${formatSeconds(endMs)} 秒`}
          >
            {formatSeconds(startMs)}–{formatSeconds(endMs)}
          </span>
        ) : (
          <button
            type="button"
            className="subtitle-time"
            aria-label={`字幕 ${number} 时间范围 ${formatSeconds(startMs)} 到 ${formatSeconds(endMs)} 秒，点击定位`}
            title="定位到这条字幕"
            disabled={busy}
            onClick={() => selectGifSubtitle(block.id)}
          >
            {formatSeconds(startMs)}–{formatSeconds(endMs)}
          </button>
        )}
        <input
          className="subtitle-text"
          type="text"
          aria-label={`字幕 ${number} 整句文字`}
          placeholder={deleted ? '已删除' : '输入字幕'}
          value={textDraft}
          disabled={busy || batchMode}
          onFocus={() => selectGifSubtitle(block.id)}
          onChange={changeText}
          onCompositionStart={() => { composing.current = true }}
          onCompositionEnd={endComposition}
          onBlur={() => {
            composing.current = false
            if (textDraft !== block.targetText) setTargetText(block.id, textDraft)
          }}
        />
        {!batchMode && (
          <button
            type="button"
            className="subtitle-icon subtitle-delete"
            aria-label={`删除字幕 ${number} 原文`}
            title="删除原文"
            disabled={busy || deleted}
            onClick={deleteOriginal}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16" />
              <path d="M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1z" />
              <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
        {!batchMode && changed && (
          <button
            type="button"
            className="subtitle-icon subtitle-restore"
            aria-label={`恢复字幕 ${number} 原文`}
            title="恢复原文"
            disabled={busy}
            onClick={restoreOriginal}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9h9a6 6 0 0 1 0 12H8" />
              <path d="m8 5-4 4 4 4" />
            </svg>
          </button>
        )}
        {!batchMode && (
          <details className="subtitle-time-details">
            <summary aria-label={`字幕 ${number} 调整时间`} title="调整时间">…</summary>
            <div className="subtitle-time-row">
              <label>
                开始
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  aria-label={`字幕 ${number} 开始秒数`}
                  value={startDraft}
                  disabled={busy}
                  onChange={(event) => setStartDraft(event.currentTarget.value)}
                  onBlur={commitStart}
                />
              </label>
              <span aria-hidden="true">–</span>
              <label>
                结束
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  aria-label={`字幕 ${number} 结束秒数`}
                  value={endDraft}
                  disabled={busy}
                  onChange={(event) => setEndDraft(event.currentTarget.value)}
                  onBlur={commitEnd}
                />
              </label>
            </div>
          </details>
        )}
      </div>
    </li>
  )
}
