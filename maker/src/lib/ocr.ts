import { blockLayout } from './char-layout'
import { orderQuad, polygonBounds } from './geometry'
import { defaultTextStyle } from './plan'
import { runOcrWorker } from './ocr-worker-client'
import { isOcrMemoryError } from './ocr-memory-policy'
import type { OcrProgressListener } from './ocr-progress'
import type { OcrBlock, Point } from '../types'

export { OCR_MODEL_FILES, ocrModelUrl } from './ocr-models'
export { cancelOcrRecognition } from './ocr-worker-client'

let recognitionQueue: Promise<unknown> = Promise.resolve()

/** Reuse the warm engine and serialize requests; stale consumers never receive results. */
export function recognize(blob: Blob, isCurrent = () => true, onProgress?: OcrProgressListener): Promise<OcrBlock[]> {
  const task = recognitionQueue.then(async () => {
    if (!isCurrent()) return []
    try {
      const items = await runOcrWorker(blob, progress => { if (isCurrent()) onProgress?.(progress) })
      return isCurrent() ? normalizeOcrItems(items) : []
    } catch (error) {
      if (isOcrMemoryError(error)) {
        throw new Error('识别时内存不足，识别进程已释放；可点「重新识别」，无需刷新页面', { cause: error })
      }
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('识别资源加载或处理超时，请检查网络后重新识别', { cause: error })
      }
      throw error
    }
  })
  recognitionQueue = task.catch(() => undefined)
  return task
}

/** Map boxes from an upscaled OCR image back onto the original pixels. */
export function scaleOcrBlocks(blocks: OcrBlock[], scale: number, scaleY = scale): OcrBlock[] {
  if (scale === 1 && scaleY === 1) return blocks
  return blocks.map((block) => {
    const polygon = block.polygon.map((point) => ({ x: point.x / scale, y: point.y / scaleY })) as OcrBlock['polygon']
    return { ...block, polygon, layout: blockLayout(polygon), textStyle: defaultTextStyle(polygon) }
  })
}

export function normalizeOcrItems(items: unknown[]): OcrBlock[] {
  const blocks: OcrBlock[] = []
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const text = typeof record.text === 'string' ? record.text : ''
    const score = typeof record.score === 'number' ? record.score : 0
    const polygon = readPolygon(record.poly ?? record.polygon ?? record.box)
    if (!text.trim() || !polygon) return
    const layout = blockLayout(polygon)
    blocks.push({
      id: `ocr-${index + 1}`,
      originalText: text,
      targetText: text,
      score,
      polygon,
      layout,
      enabled: true,
      applyLocal: false,
      lineRedraw: false,
      textStyle: defaultTextStyle(polygon),
    })
  })
  return dropShortStrays(mergeSameLine(blocks))
}

/** Pieces of one caption, split by a hand or a gap, become one line again. */
function mergeSameLine(blocks: OcrBlock[]): OcrBlock[] {
  const pending = blocks.filter((block) => block.layout === 'horizontal')
  const rest = blocks.filter((block) => block.layout !== 'horizontal')
  const lines: OcrBlock[][] = []
  for (const block of pending) {
    const bounds = polygonBounds(block.polygon)
    const line = lines.find((group) => {
      const other = polygonBounds(group[0].polygon)
      const sizeRatio = Math.min(bounds.height, other.height) / Math.max(bounds.height, other.height)
      return sizeRatio >= 0.55 && verticalOverlap(bounds, other) >= 0.55
    })
    if (line) line.push(block)
    else lines.push([block])
  }
  const merged = lines.map((group, index) => {
    const ordered = group.slice().sort((left, right) => polygonBounds(left.polygon).minX - polygonBounds(right.polygon).minX)
    const polygon = unionQuad(ordered.map((block) => block.polygon))
    const text = ordered.map((block) => block.originalText).join('')
    const first = ordered[0]
    return {
      ...first,
      id: `ocr-${index + 1}`,
      originalText: text,
      targetText: text,
      score: Math.min(...ordered.map((block) => block.score)),
      polygon,
      layout: blockLayout(polygon),
      textStyle: defaultTextStyle(polygon),
    }
  })
  return [...merged, ...rest]
}

function dropShortStrays(blocks: OcrBlock[]): OcrBlock[] {
  if (blocks.length < 2) return blocks
  const tallest = Math.max(...blocks.map((block) => polygonBounds(block.polygon).height))
  return blocks.filter((block) => polygonBounds(block.polygon).height >= tallest * 0.45 || block.originalText.length > 1)
}

function verticalOverlap(left: { minY: number; maxY: number }, right: { minY: number; maxY: number }): number {
  const overlap = Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY)
  const height = Math.min(left.maxY - left.minY, right.maxY - right.minY)
  if (height <= 0) return 0
  return overlap / height
}

function unionQuad(polygons: Point[][]): [Point, Point, Point, Point] {
  const points = polygons.flat()
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  return orderQuad([
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ])
}

function readPolygon(value: unknown): [Point, Point, Point, Point] | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const points = value.map(readPoint).filter((point): point is Point => point !== null)
  if (points.length < 4) return null
  try {
    return orderQuad(points)
  } catch {
    return null
  }
}

function readPoint(value: unknown): Point | null {
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return { x: value[0], y: value[1] }
  }
  if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
    const point = value as { x: unknown; y: unknown }
    if (typeof point.x === 'number' && typeof point.y === 'number') return { x: point.x, y: point.y }
  }
  return null
}
