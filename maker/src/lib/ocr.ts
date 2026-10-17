import { blockLayout } from './char-layout'
import { orderQuad } from './geometry'
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
        ortOptions: { backend: 'wasm' },
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
  return blocks
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
