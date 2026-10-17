import { blockLayout } from './char-layout'
import { orderQuad, polygonBounds } from './geometry'
import { defaultTextStyle } from './plan'
import type { OcrBlock, Point } from '../types'

type PaddleLike = {
  create: (options: Record<string, unknown>) => Promise<{
    predict: (input: Blob) => Promise<Array<{ items?: unknown[] }>>
    dispose?: () => Promise<void> | void
  }>
}

let enginePromise: Promise<Awaited<ReturnType<PaddleLike['create']>>> | null = null

export const OCR_MODEL_FILES = {
  det: 'PP-OCRv5_mobile_det_onnx_infer.tar',
  rec: 'PP-OCRv5_mobile_rec_onnx_infer.tar',
} as const

export function ocrModelUrl(file: string, base = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}models/${file}`
}

export function resetOcrEngine() {
  const current = enginePromise
  enginePromise = null
  void current?.then((engine) => engine.dispose?.()).catch(() => undefined)
}

/**
 * PP-OCRv5 mobile, WASM on the main thread (`@paddleocr/paddleocr-js` 0.4.2).
 * Detection and recognition weights live in `public/models` and are published
 * with the app. ONNX Runtime stays out of Vite's dependency prebundle so its WASM
 * is loaded from the installed package on this origin. Worker mode stays off so
 * the SDK does not fall back to a CDN WASM build.
 */
export async function recognize(blob: Blob): Promise<OcrBlock[]> {
  const engine = await loadEngine()
  const [result] = await engine.predict(blob)
  return normalizeOcrItems(result?.items ?? [])
}

/** Map boxes from an upscaled OCR image back onto the original pixels. */
export function scaleOcrBlocks(blocks: OcrBlock[], scale: number): OcrBlock[] {
  if (scale === 1) return blocks
  return blocks.map((block) => {
    const polygon = block.polygon.map((point) => ({ x: point.x / scale, y: point.y / scale })) as OcrBlock['polygon']
    return { ...block, polygon, layout: blockLayout(polygon), textStyle: defaultTextStyle(polygon) }
  })
}

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = import('@paddleocr/paddleocr-js').then((mod) => {
      const factory = mod as unknown as { PaddleOCR: PaddleLike }
      return factory.PaddleOCR.create({
        lang: 'ch',
        ocrVersion: 'PP-OCRv5',
        textDetectionModelName: 'PP-OCRv5_mobile_det',
        textDetectionModelAsset: { url: ocrModelUrl(OCR_MODEL_FILES.det) },
        textRecognitionModelName: 'PP-OCRv5_mobile_rec',
        textRecognitionModelAsset: { url: ocrModelUrl(OCR_MODEL_FILES.rec) },
        worker: false,
        ortOptions: { backend: 'wasm', numThreads: 1 },
      })
    }).catch((error: unknown) => {
      enginePromise = null
      throw error
    })
  }
  return enginePromise
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
    const line = lines.find((group) => verticalOverlap(bounds, polygonBounds(group[0].polygon)) >= 0.55)
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
