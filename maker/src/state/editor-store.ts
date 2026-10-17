import { decideCatalogSrc, readCatalog, siteAsset, siteBaseFrom, makerBaseUrl } from '../lib/catalog'
import { createHistory, historyCommit, historyRedo, historyUndo, type HistoryState } from '../lib/history'
import { decodeGifFrames, gifWithinBudget, type GifFrame } from '../lib/gif'
import { assertEditableFile, sniffImage } from '../lib/image'
import { recognize } from '../lib/ocr'
import { canvasToPng } from '../lib/paint'
import { addedTextStyle, defaultTextStyle, liveRedraw } from '../lib/plan'
import type { CatalogImage, FreeText, OcrBlock, Point, TextStyle } from '../types'

export type Editable = {
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

export type EditorSnapshot = {
  catalog: CatalogImage[]
  catalogLoading: boolean
  catalogError: string | null
  image: LoadedImage | null
  imageLoading: boolean
  imageError: string | null
  ocrStatus: 'idle' | 'loading' | 'ready' | 'error'
  ocrMessage: string
  notice: string | null
  view: { scale: number; panX: number; panY: number }
  history: HistoryState<Editable>
  /** Which character cell is being edited. Not part of undo history. */
  cellFocus: CellFocus | null
}

const emptyEditable = (): Editable => ({ blocks: [], freeTexts: [], selectedId: null })

let state: EditorSnapshot = {
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  image: null,
  imageLoading: false,
  imageError: null,
  ocrStatus: 'idle',
  ocrMessage: '选一张图后会自动识别文字。',
  notice: null,
  view: { scale: 1, panX: 0, panY: 0 },
  history: createHistory(emptyEditable()),
  cellFocus: null,
}

const listeners = new Set<() => void>()
let imageToken = 0
let ocrToken = 0
let gestureBase: Editable | null = null
let previewUrl = ''

function emit() {
  listeners.forEach((listener) => listener())
}

function update(patch: Partial<EditorSnapshot>) {
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
  const token = ++imageToken
  ocrToken += 1
  revokePreview()
  update({
    imageLoading: true,
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
    const response = await fetch(assetUrl(image.src))
    if (!response.ok) throw new Error(`原图加载失败（${response.status}）`)
    const blob = await response.blob()
    const decoded = await decodeBlob(blob)
    if (token !== imageToken) return
    previewUrl = URL.createObjectURL(blob)
    update({
      imageLoading: false,
      notice: animationNotice(decoded),
      image: {
        source: { kind: 'catalog', id: image.src, name: image.name, animated: image.animated || decoded.singleFrameAnimation || Boolean(decoded.frames) },
        naturalWidth: decoded.width,
        naturalHeight: decoded.height,
        blob,
        imageData: decoded.imageData,
        frames: decoded.frames,
        previewUrl,
      },
    })
    void runOcr()
  } catch (error) {
    if (token !== imageToken) return
    update({ imageLoading: false, imageError: error instanceof Error ? error.message : '原图加载失败' })
  }
}

export async function openLocalFile(file: File) {
  const token = ++imageToken
  ocrToken += 1
  try {
    assertEditableFile(file)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const sniffed = sniffImage(bytes, file.type)
    const blob = new Blob([bytes], { type: sniffed.mime || file.type })
    revokePreview()
    const url = new URL(location.href)
    url.searchParams.delete('src')
    history.replaceState(null, '', url)
    const decoded = await decodeBlob(blob)
    if (token !== imageToken) return
    previewUrl = URL.createObjectURL(blob)
    update({
      imageLoading: false,
      imageError: null,
      notice: animationNotice(decoded),
      ocrStatus: 'idle',
      ocrMessage: '正在打开图片，接着会自动识别文字。',
      view: { scale: 1, panX: 0, panY: 0 },
      history: createHistory(emptyEditable()),
      image: {
        source: { kind: 'local', id: file.name, name: file.name, animated: sniffed.animated || Boolean(decoded.frames) },
        naturalWidth: decoded.width,
        naturalHeight: decoded.height,
        blob,
        imageData: decoded.imageData,
        frames: decoded.frames,
        previewUrl,
      },
    })
    void runOcr()
  } catch (error) {
    update({ imageError: error instanceof Error ? error.message : '这张图片打不开' })
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
  update({ ocrStatus: 'loading', ocrMessage: '正在加载识别模型，图片不会离开这台设备。' })
  try {
    const blocks = await recognize(await frameBlob(image))
    if (token !== ocrToken || state.image?.source.id !== sourceId) return
    const present = { ...emptyEditable(), blocks, selectedId: blocks[0]?.id ?? null }
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
  update({ cellFocus, history: { ...state.history, present: { ...present, selectedId: id } } })
}

export function focusCell(id: string, index: number, cells: string[]) {
  const current = state.cellFocus
  const sameCells = current?.cells.length === cells.length && current.cells.every((cell, cellIndex) => cell === cells[cellIndex])
  if (current?.id === id && current.index === index && sameCells && state.history.present.selectedId === id) return
  const present = state.history.present
  const history = present.selectedId === id ? state.history : { ...state.history, present: { ...present, selectedId: id } }
  update({ cellFocus: { id, index, cells }, history })
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
    id: `text-${Date.now()}`,
    text: '新文字',
    x: image.naturalWidth / 2,
    y: image.naturalHeight / 2,
    textStyle: addedTextStyle(image.imageData, state.history.present.blocks, [
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
  update({ history: historyUndo(state.history) })
}

export function redo() {
  update({ history: historyRedo(state.history) })
}

export function resetDocument() {
  const dirty = state.history.past.length > 0 || state.history.present.blocks.length > 0 || state.history.present.freeTexts.length > 0
  if (!state.image?.imageData) return
  if (dirty && !window.confirm('还原原图会丢掉当前文字修改。')) return
  update({
    history: createHistory(emptyEditable()),
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
  const present = recipe(state.history.present)
  update({ history: historyCommit(state.history, present) })
}

function retarget(block: OcrBlock): OcrBlock {
  return { ...block, ...liveRedraw(block, state.image?.imageData ?? null) }
}

function revokePreview() {
  if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  previewUrl = ''
}

async function frameBlob(image: LoadedImage): Promise<Blob> {
  if (!image.source.animated && image.blob) return image.blob
  if (!image.imageData) throw new Error('当前没有可识别的图片。')
  const canvas = document.createElement('canvas')
  canvas.width = image.imageData.width
  canvas.height = image.imageData.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器不能读取这张图片的像素。')
  context.putImageData(image.imageData, 0, 0)
  try {
    return await canvasToPng(canvas)
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
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
  if (decoded.frames && decoded.frames.length > 1) return '这是 GIF。改字会套到每一帧，导出也是整张动图。'
  if (decoded.limitedGif) return '这个 GIF 太大，只能改当前这一帧。'
  if (decoded.singleFrameAnimation) return '这是动图。识别、改字和导出生效的都是当前这一帧，动画不会保留。'
  return null
}

async function decodeBlob(blob: Blob): Promise<DecodedImage> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const sniffed = sniffImage(bytes, blob.type || '')
  if (sniffed.mime === 'image/gif') {
    try {
      const gif = decodeGifFrames(bytes)
      if (gif.width > 8192 || gif.height > 8192) throw new Error('图片边长超过 8192，请先缩小。')
      const limitedGif = gif.frames.length > 1 && !gifWithinBudget(gif.width, gif.height, gif.frames.length)
      const frames = gif.frames.length > 1 && !limitedGif ? gif.frames : undefined
      return {
        imageData: gif.frames[0].imageData,
        width: gif.width,
        height: gif.height,
        frames,
        singleFrameAnimation: !frames && !limitedGif,
        limitedGif,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('8192')) throw error
    }
  }
  const bitmap = await createImageBitmap(new Blob([bytes], { type: sniffed.mime || blob.type }))
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error('图片边长超过 8192，请先缩小。')
    const fitted = fitEditSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = fitted.width
    canvas.height = fitted.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器不能读取这张图片的像素。')
    context.drawImage(bitmap, 0, 0, fitted.width, fitted.height)
    const imageData = context.getImageData(0, 0, fitted.width, fitted.height)
    canvas.width = 0
    canvas.height = 0
    return {
      imageData,
      width: fitted.width,
      height: fitted.height,
      singleFrameAnimation: sniffed.animated,
      limitedGif: false,
    }
  } finally {
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
