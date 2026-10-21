import { decideCatalogSrc, readCatalog, siteAsset, siteBaseFrom, makerBaseUrl } from '../lib/catalog'
import { createHistory, historyCommit, historyRedo, historyUndo, type HistoryState } from '../lib/history'
import type { GifFrame } from '../lib/gif'
import { cancelGifDecode, decodeGifInWorker } from '../lib/gif-decode'
import { editsAtFrame, segmentAtFrame, splitSegment, type GifSegment } from '../lib/timeline'
import { assertEditableFile, sniffImage } from '../lib/image'
import { cancelOcrRecognition, recognize, scaleOcrBlocks } from '../lib/ocr'
import { prepareOcrInput } from '../lib/ocr-input'
import type { OcrProgress } from '../lib/ocr-progress'
import { addedTextStyle, defaultTextStyle, liveRedraw } from '../lib/plan'
import type { CatalogImage, FreeText, OcrBlock, Point, TextStyle } from '../types'

export type Editable = {
  segments?: GifSegment[]
  blocks: OcrBlock[]
  freeTexts: FreeText[]
  selectedId: string | null
}

export type LoadedImage = {
  source: { kind: 'catalog' | 'local'; id: string; name: string; animated: boolean }
  naturalWidth: number
  naturalHeight: number
  blob: Blob | null
  imageData: ImageData | null
  frames?: GifFrame[]
  previewUrl: string
}

export type CellFocus = {
  id: string
  index: number
  cells: string[]
}

export type LoadingImagePreview = {
  src: string
  name: string
  phase: 'download' | 'decode'
}

export type EditorSnapshot = {
  gifFrameIndex: number
  gifPlaying: boolean
  comparing: boolean
  catalog: CatalogImage[]
  catalogLoading: boolean
  catalogError: string | null
  image: LoadedImage | null
  imageLoading: boolean
  loadingPreview: LoadingImagePreview | null
  imageError: string | null
  ocrStatus: 'idle' | 'loading' | 'ready' | 'error'
  ocrMessage: string
  ocrProgress: OcrProgress | null
  notice: string | null
  view: { scale: number; panX: number; panY: number }
  history: HistoryState<Editable>
  /** Which character cell is being edited. Not part of undo history. */
  cellFocus: CellFocus | null
}

const emptyEditable = (frameCount = 0): Editable => ({ blocks: [], freeTexts: [], selectedId: null,
  segments: frameCount > 1 ? [{ id: 'gif-first', start: 0, end: frameCount }] : undefined,
})

let state: EditorSnapshot = {
  gifFrameIndex: 0,
  gifPlaying: false,
  comparing: false,
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  image: null,
  imageLoading: false,
  loadingPreview: null,
  imageError: null,
  ocrStatus: 'idle',
  ocrMessage: '选一张图后会自动识别文字。',
  ocrProgress: null,
  notice: null,
  view: { scale: 1, panX: 0, panY: 0 },
  history: createHistory(emptyEditable()),
  cellFocus: null,
}

const listeners = new Set<() => void>()
let imageToken = 0
let imageRequest: AbortController | null = null
let ocrToken = 0
let gestureBase: Editable | null = null
let previewUrl = ''

function emit() {
  listeners.forEach((listener) => listener())
}

function update(patch: Partial<EditorSnapshot>) {
  if (patch.ocrStatus && patch.ocrStatus !== 'loading') patch = { ...patch, ocrProgress: null }
  if (patch.imageLoading === false) patch = { ...patch, loadingPreview: null }
  state = { ...state, ...patch }
  emit()
}

export const editor = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function siteHome(): string {
  return siteBaseFrom(makerBaseUrl(import.meta.env.BASE_URL, location.origin)).href
}

export function makerHome(): string {
  return makerBaseUrl(import.meta.env.BASE_URL, location.origin).href
}

export function assetUrl(path: string): string {
  return siteAsset(path, siteBaseFrom(makerBaseUrl(import.meta.env.BASE_URL, location.origin)))
}

export async function boot() {
  await loadCatalog()
  const raw = new URLSearchParams(location.search).get('src')
  if (!raw) return
  const decision = decideCatalogSrc(raw, state.catalog)
  if (!decision.ok) {
    update({ notice: decision.reason })
    return
  }
  await openCatalogImage(decision.image)
}

let catalogTask: Promise<void> | null = null

export function loadCatalog(): Promise<void> {
  if (catalogTask) return catalogTask
  catalogTask = (async () => {
    update({ catalogLoading: true, catalogError: null })
    try {
      const response = await fetch(assetUrl('catalog/search.json'))
      if (!response.ok) throw new Error(`素材索引请求失败（${response.status}）`)
      const images = readCatalog(await response.json())
      if (!images.length) throw new Error('素材索引是空的')
      update({ catalog: images, catalogLoading: false })
    } catch (error) {
      update({
        catalogLoading: false,
        catalogError: error instanceof Error ? error.message : '素材索引加载失败',
      })
    } finally {
      catalogTask = null
    }
  })()
  return catalogTask
}

export async function openCatalogImage(image: CatalogImage) {
  imageRequest?.abort()
  const request = new AbortController()
  imageRequest = request
  cancelOcrRecognition()
  cancelGifDecode()
  const token = ++imageToken
  ocrToken += 1
  revokePreview()
  update({
    gifFrameIndex: 0, gifPlaying: false, comparing: false, cellFocus: null,
    imageLoading: true,
    loadingPreview: { src: assetUrl(image.thumb), name: image.name, phase: 'download' },
    imageError: null,
    notice: null,
    ocrStatus: 'idle',
    ocrMessage: '正在打开图片，接着会自动识别文字。',
    view: { scale: 1, panX: 0, panY: 0 },
    history: createHistory(emptyEditable()),
    image: null,
  })
  const url = new URL(location.href)
  url.searchParams.set('src', image.src)
  history.replaceState(null, '', url)
  try {
    const response = await fetch(assetUrl(image.src), { signal: request.signal })
    if (token !== imageToken) return
    if (!response.ok) throw new Error(`原图加载失败（${response.status}）`)
    const blob = await response.blob()
    if (token !== imageToken) return
    if (blob.size > 15_000_000) throw new Error('图片超过 15 MB，请先缩小。')
    update({ loadingPreview: { src: assetUrl(image.thumb), name: image.name, phase: 'decode' } })
    const decoded = await decodeBlob(blob, () => token === imageToken)
    if (token !== imageToken) return
    previewUrl = decoded.frames ? '' : URL.createObjectURL(blob)
    update({
      imageLoading: false,
      history: createHistory(emptyEditable(decoded.frames?.length)),
      notice: animationNotice(decoded),
      image: {
        source: { kind: 'catalog', id: image.src, name: image.name, animated: image.animated || decoded.singleFrameAnimation || Boolean(decoded.frames) },
        naturalWidth: decoded.width,
        naturalHeight: decoded.height,
        blob: decoded.frames ? null : blob,
        imageData: decoded.imageData,
        frames: decoded.frames,
        previewUrl,
      },
    })
    void runOcr()
  } catch (error) {
    if (token !== imageToken) return
    update({ imageLoading: false, imageError: error instanceof Error ? error.message : '原图加载失败' })
  } finally {
    if (imageRequest === request) imageRequest = null
  }
}

export async function openLocalFile(file: File) {
  imageRequest?.abort()
  imageRequest = null
  cancelOcrRecognition()
  cancelGifDecode()
  const token = ++imageToken
  ocrToken += 1
  try {
    assertEditableFile(file)
    revokePreview()
    update({ image: null, imageLoading: true, loadingPreview: null, imageError: null, notice: null, ocrStatus: 'idle', cellFocus: null, gifFrameIndex: 0, gifPlaying: false, comparing: false, history: createHistory(emptyEditable()) })
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (token !== imageToken) return
    const sniffed = sniffImage(bytes, file.type)
    const blob = new Blob([bytes], { type: sniffed.mime || file.type })
    const url = new URL(location.href)
    url.searchParams.delete('src')
    history.replaceState(null, '', url)
    const decoded = await decodeBlob(blob, () => token === imageToken)
    if (token !== imageToken) return
    previewUrl = decoded.frames ? '' : URL.createObjectURL(blob)
    update({
      imageLoading: false,
      imageError: null,
      notice: animationNotice(decoded),
      ocrStatus: 'idle',
      ocrMessage: '正在打开图片，接着会自动识别文字。',
      view: { scale: 1, panX: 0, panY: 0 },
      history: createHistory(emptyEditable(decoded.frames?.length)),
      image: {
        source: { kind: 'local', id: file.name, name: file.name, animated: sniffed.animated || Boolean(decoded.frames) },
        naturalWidth: decoded.width,
        naturalHeight: decoded.height,
        blob: decoded.frames ? null : blob,
        imageData: decoded.imageData,
        frames: decoded.frames,
        previewUrl,
      },
    })
    void runOcr()
  } catch (error) {
    if (token !== imageToken) return
    update({ imageLoading: false, imageError: error instanceof Error ? error.message : '这张图片打不开' })
  }
}

export async function runOcr() {
  const image = state.image
  if (!image?.imageData) {
    update({ ocrStatus: 'error', ocrMessage: '当前没有可识别的图片。' })
    return
  }
  const token = ++ocrToken
  const sourceId = image.source.id
  const segmentId = segmentAtFrame(state.history.present.segments, state.gifFrameIndex)?.id
  update({ gifPlaying: false, ocrStatus: 'loading', ocrMessage: '正在识别文本，图片不会离开这台设备。', ocrProgress: { stage: 'prepare' } })
  try {
    const prepared = await prepareOcrInput(image.imageData)
    const blocks = scaleOcrBlocks(await recognize(prepared.blob, () => token === ocrToken, progress => {
      if (token === ocrToken && state.image?.source.id === sourceId) update({ ocrProgress: progress })
    }), prepared.scaleX, prepared.scaleY)
    if (token !== ocrToken || state.image?.source.id !== sourceId) return
    const current = state.history.present
    const scoped = blocks.map(block => ({ ...block, segmentId, id: `${segmentId ?? 'still'}:${token}:${block.id}` }))
    const present: Editable = { ...current,
      blocks: [...(segmentId ? current.blocks.filter(block => block.segmentId !== segmentId) : []), ...scoped],
      freeTexts: segmentId ? current.freeTexts : [], selectedId: scoped[0]?.id ?? null,
    }
    update({
      ocrStatus: blocks.length ? 'ready' : 'error',
      ocrMessage: blocks.length
        ? `识别到 ${blocks.length} 段文字。`
        : '没有识别到文字。可以在下面加字。',
      history: historyCommit(state.history, present),
    })
  } catch (error) {
    if (token !== ocrToken) return
    update({
      ocrStatus: 'error',
      ocrMessage: error instanceof Error ? `识别失败：${error.message}。仍可以手工加字并导出。` : '识别失败。仍可以手工加字并导出。',
    })
  }
}

export function select(id: string | null) {
  const present = state.history.present
  const cellFocus = state.cellFocus?.id === id ? state.cellFocus : null
  update({ gifPlaying: false, cellFocus, history: { ...state.history, present: { ...present, selectedId: id } } })
}

export function focusCell(id: string, index: number, cells: string[]) {
  const current = state.cellFocus
  const sameCells = current?.cells.length === cells.length && current.cells.every((cell, cellIndex) => cell === cells[cellIndex])
  if (current?.id === id && current.index === index && sameCells && state.history.present.selectedId === id) return
  const present = state.history.present
  const history = present.selectedId === id ? state.history : { ...state.history, present: { ...present, selectedId: id } }
  update({ gifPlaying: false, cellFocus: { id, index, cells }, history })
}

export function setOriginalText(id: string, text: string) {
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.map((block) => {
      if (block.id !== id) return block
      const targetText = block.targetText === block.originalText ? text : block.targetText
      return retarget({ ...block, originalText: text, targetText })
    }),
  }))
}

export function setTargetText(id: string, text: string) {
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.map((block) => (block.id === id ? retarget({ ...block, targetText: text }) : block)),
  }))
}

export function setBlockStyle(id: string, patch: Partial<TextStyle>) {
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.map((block) => (
      block.id === id ? { ...block, styleCustomized: true, textStyle: { ...block.textStyle, ...patch } } : block
    )),
  }))
}

export function setApplyLocal(id: string, applyLocal: boolean) {
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.map((block) => (block.id === id ? { ...block, applyLocal } : block)),
  }))
}

export function setLineRedraw(id: string, lineRedraw: boolean) {
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.map((block) => (block.id === id ? retarget({ ...block, lineRedraw, applyLocal: lineRedraw }) : block)),
  }))
}

export function beginGesture() {
  if (state.ocrStatus === 'loading') skipOcr()
  update({ gifPlaying: false })
  gestureBase = state.history.present
}

export function updateManualPolygon(id: string, polygon: Point[]) {
  const base = gestureBase ?? state.history.present
  const quad = polygon.length >= 4
    ? [polygon[0], polygon[1], polygon[2], polygon[3]] as [Point, Point, Point, Point]
    : polygon
  const present: Editable = {
    ...base,
    blocks: base.blocks.map((block) => (block.id === id ? { ...block, manualPolygon: quad } : block)),
  }
  update({ history: { ...state.history, present } })
}

export function moveFreeText(id: string, x: number, y: number) {
  const base = gestureBase ?? state.history.present
  const present: Editable = {
    ...base,
    freeTexts: base.freeTexts.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)),
  }
  update({ history: { ...state.history, present } })
}

export function resizeFreeText(id: string, fontSize: number) {
  const base = gestureBase ?? state.history.present
  const present: Editable = {
    ...base,
    freeTexts: base.freeTexts.map((layer) => (
      layer.id === id ? { ...layer, textStyle: { ...layer.textStyle, fontSize } } : layer
    )),
  }
  update({ history: { ...state.history, present } })
}

export function endGesture() {
  if (!gestureBase) return
  const next = state.history.present
  const changed = JSON.stringify(gestureBase) !== JSON.stringify(next)
  update({
    history: changed
      ? { past: [...state.history.past, gestureBase].slice(-40), present: next, future: [] }
      : state.history,
  })
  gestureBase = null
}

export function addManualBlock() {
  const image = state.image
  if (!image?.imageData) return
  const width = image.naturalWidth
  const height = image.naturalHeight
  const polygon: OcrBlock['polygon'] = [
    { x: width * 0.18, y: height * 0.38 },
    { x: width * 0.82, y: height * 0.38 },
    { x: width * 0.82, y: height * 0.62 },
    { x: width * 0.18, y: height * 0.62 },
  ]
  const block: OcrBlock = {
    segmentId: segmentAtFrame(state.history.present.segments, state.gifFrameIndex)?.id,
    id: `manual-${Date.now()}`,
    originalText: '原文',
    targetText: '原文',
    score: 1,
    polygon,
    layout: 'horizontal',
    enabled: true,
    applyLocal: false,
    lineRedraw: false,
    textStyle: defaultTextStyle(polygon),
  }
  commitEdit((current) => ({ ...current, blocks: [...current.blocks, block], selectedId: block.id }))
}

export function addFreeText() {
  const image = state.image
  if (!image?.imageData) return
  const layer: FreeText = {
    segmentId: segmentAtFrame(state.history.present.segments, state.gifFrameIndex)?.id,
    id: `text-${Date.now()}`,
    text: '新文字',
    x: image.naturalWidth / 2,
    y: image.naturalHeight / 2,
    textStyle: addedTextStyle(image.imageData, visibleEdits().blocks, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: image.naturalHeight * 0.12 },
      { x: 0, y: image.naturalHeight * 0.12 },
    ]),
  }
  commitEdit((current) => ({ ...current, freeTexts: [...current.freeTexts, layer], selectedId: layer.id }))
}

export function setFreeText(id: string, text: string) {
  commitEdit((current) => ({
    ...current,
    freeTexts: current.freeTexts.map((layer) => (layer.id === id ? { ...layer, text } : layer)),
  }))
}

export function setFreeStyle(id: string, patch: Partial<TextStyle>) {
  commitEdit((current) => ({
    ...current,
    freeTexts: current.freeTexts.map((layer) => (
      layer.id === id ? { ...layer, textStyle: { ...layer.textStyle, ...patch } } : layer
    )),
  }))
}

export function removeSelected() {
  const id = state.history.present.selectedId
  if (!id) return
  state = { ...state, cellFocus: null }
  commitEdit((current) => ({
    ...current,
    blocks: current.blocks.filter((block) => block.id !== id),
    freeTexts: current.freeTexts.filter((layer) => layer.id !== id),
    selectedId: null,
  }))
}

/** Remove the character cell being edited. A block with no characters left is removed. */
export function deleteFocusedCell() {
  const focus = state.cellFocus
  const id = state.history.present.selectedId
  if (!focus || focus.id !== id) {
    removeSelected()
    return
  }
  const next = focus.cells.filter((_, cellIndex) => cellIndex !== focus.index)
  const joined = next.join('')
  const block = state.history.present.blocks.find((item) => item.id === id)
  const layer = state.history.present.freeTexts.find((item) => item.id === id)
  if (!joined) {
    removeSelected()
    return
  }
  const nextIndex = Math.min(focus.index, next.length - 1)
  update({ cellFocus: { id, index: nextIndex, cells: next } })
  if (block && joined !== block.targetText) setTargetText(id, joined)
  else if (layer && joined !== layer.text) setFreeText(id, joined)
}

export function undo() {
  invalidateOcr()
  update({ history: historyUndo(state.history), gifPlaying: false, cellFocus: null })
}

export function redo() {
  invalidateOcr()
  update({ history: historyRedo(state.history), gifPlaying: false, cellFocus: null })
}

export function resetDocument() {
  const dirty = state.history.past.length > 0 || state.history.present.blocks.length > 0 || state.history.present.freeTexts.length > 0
  if (!state.image?.imageData) return
  if (dirty && !window.confirm('还原原图会丢掉当前文字修改。')) return
  update({
    history: createHistory(emptyEditable(state.image.frames?.length)),
    gifFrameIndex: 0, gifPlaying: false,
    image: { ...state.image, imageData: state.image.frames?.[0].imageData ?? state.image.imageData },
    cellFocus: null,
    ocrStatus: 'idle',
    ocrMessage: '已回到原图，正在重新识别。',
    notice: null,
  })
  void runOcr()
}

export function setView(patch: Partial<EditorSnapshot['view']>) {
  update({ view: { ...state.view, ...patch } })
}

export function dismissNotice() {
  update({ notice: null })
}

function commitEdit(recipe: (current: Editable) => Editable) {
  if (state.ocrStatus === 'loading') skipOcr()
  const present = recipe(state.history.present)
  update({ gifPlaying: false, history: historyCommit(state.history, present) })
}

export function visibleEdits(snapshot = state): Editable {
  return editsAtFrame(snapshot.history.present, snapshot.gifFrameIndex)
}

function invalidateOcr() {
  ocrToken += 1
  cancelOcrRecognition()
  if (state.ocrStatus === 'loading') update({ ocrStatus: 'idle', ocrMessage: '' })
}

export function skipOcr() {
  if (state.ocrStatus !== 'loading') return
  invalidateOcr()
  update({ ocrMessage: '已跳过识别，可以继续加字和导出。' })
}

export function setGifFrame(index: number, playing = false) {
  const image = state.image
  if (!image?.frames?.length) return
  const next = Math.max(0, Math.min(image.frames.length - 1, Math.floor(index)))
  if (state.ocrStatus === 'loading') invalidateOcr()
  const edits = editsAtFrame(state.history.present, next)
  const selectedId = [...edits.blocks, ...edits.freeTexts].some(item => item.id === edits.selectedId)
    ? edits.selectedId : edits.blocks[0]?.id ?? edits.freeTexts[0]?.id ?? null
  update({ gifFrameIndex: next, gifPlaying: playing, cellFocus: null,
    image: { ...image, imageData: image.frames[next].imageData },
    history: { ...state.history, present: { ...state.history.present, selectedId } },
    ocrStatus: edits.blocks.length ? 'ready' : 'idle', ocrMessage: '',
  })
}

export function setGifPlaying(playing: boolean) {
  if (!state.image?.frames || state.image.frames.length < 2) return
  if (playing && state.ocrStatus === 'loading') invalidateOcr()
  update({ gifPlaying: playing, cellFocus: null })
}

export function splitGifAtPlayhead() {
  invalidateOcr()
  const present = splitSegment(state.history.present, state.gifFrameIndex, `segment-${Date.now()}`)
  if (present === state.history.present) return
  update({ gifPlaying: false, cellFocus: null, history: historyCommit(state.history, present) })
}

export function toggleComparison() { update({ comparing: !state.comparing }) }

function retarget(block: OcrBlock): OcrBlock {
  return { ...block, ...liveRedraw(block, state.image?.imageData ?? null) }
}

function revokePreview() {
  if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  previewUrl = ''
}

type DecodedImage = {
  imageData: ImageData
  width: number
  height: number
  frames?: GifFrame[]
  singleFrameAnimation: boolean
  limitedGif: boolean
}

function animationNotice(decoded: DecodedImage): string | null {
  if (decoded.frames && decoded.frames.length > 1) return decoded.limitedGif
    ? `GIF 已调整为 ${decoded.width}×${decoded.height}、${decoded.frames.length} 帧，时长保留。`
    : null
  if (decoded.singleFrameAnimation) return '这是动图。识别、改字和导出生效的都是当前这一帧，动画不会保留。'
  return null
}

async function decodeBlob(blob: Blob, isCurrent = () => true): Promise<DecodedImage> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (!isCurrent()) throw new DOMException('图片加载已取消', 'AbortError')
  const sniffed = sniffImage(bytes, blob.type || '')
  if (sniffed.mime === 'image/gif') {
    const gif = await decodeGifInWorker(bytes)
    const frames = gif.frames.length > 1 ? gif.frames : undefined
    return {
      imageData: gif.frames[0].imageData,
      width: gif.width,
      height: gif.height,
      frames,
      singleFrameAnimation: false,
      limitedGif: gif.limited,
    }
  }
  const bitmap = await createImageBitmap(new Blob([bytes], { type: sniffed.mime || blob.type }))
  const canvas = document.createElement('canvas')
  try {
    if (!isCurrent()) throw new DOMException('图片加载已取消', 'AbortError')
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error('图片边长超过 8192，请先缩小。')
    const fitted = fitEditSize(bitmap.width, bitmap.height)
    canvas.width = fitted.width
    canvas.height = fitted.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器不能读取这张图片的像素。')
    context.drawImage(bitmap, 0, 0, fitted.width, fitted.height)
    const imageData = context.getImageData(0, 0, fitted.width, fitted.height)
    return {
      imageData,
      width: fitted.width,
      height: fitted.height,
      singleFrameAnimation: sniffed.animated,
      limitedGif: false,
    }
  } finally {
    canvas.width = canvas.height = 0
    bitmap.close()
  }
}

const EDIT_MAX_EDGE = 1600

function fitEditSize(width: number, height: number): { width: number; height: number } {
  const edge = Math.max(width, height)
  if (edge <= EDIT_MAX_EDGE) return { width, height }
  const scale = EDIT_MAX_EDGE / edge
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
