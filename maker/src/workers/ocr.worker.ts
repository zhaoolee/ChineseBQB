import { prepareOcrAssets } from '../lib/ocr-assets'
import { OCR_MODEL_FILES, ocrModelUrl } from '../lib/ocr-models'
import type { OcrStage } from '../lib/ocr-progress'

function report(stage: OcrStage) {
  self.postMessage({ kind: 'progress', progress: { stage } })
}

type Mat = { delete(): void }
type Cv = { CV_8UC4: number; matFromArray(rows: number, cols: number, type: number, pixels: Uint8ClampedArray): Mat }
type Engine = {
  sourceToMat: (cv: Cv, source: Blob) => Promise<{ width: number; height: number; mat: Mat; dispose(): void }>
  initialize(): Promise<unknown>
  predict(blob: Blob): Promise<Array<{ items?: unknown[] }>>
  dispose(): Promise<void>
}

// PaddleOCR 0.4.2's main adapter uses document/canvas. Its exposed runner adapter
// is replaced with the same matFromArray path used by the SDK's worker adapter.
async function sourceToMat(cv: Cv, source: Blob) {
  const bitmap = await createImageBitmap(source)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器不能创建识别画布')
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    const mat = cv.matFromArray(pixels.height, pixels.width, cv.CV_8UC4, pixels.data)
    return { width: pixels.width, height: pixels.height, mat, dispose: () => mat.delete() }
  } finally {
    bitmap.close()
    canvas.width = canvas.height = 0
  }
}

let engine: Engine | null = null
let initialization: Promise<Engine> | null = null
let disposal: Promise<void> | null = null
let lowMemory = false
let configured = false

function prepareEngine(): Promise<Engine> {
  if (initialization) return initialization
  initialization = (async () => {
    report('resources')
    const [sdk, assets] = await Promise.all([
      import('@paddleocr/paddleocr-js'),
      prepareOcrAssets(ocrModelUrl(OCR_MODEL_FILES.det), ocrModelUrl(OCR_MODEL_FILES.rec)),
    ])
    report('initialize')
    engine = await sdk.PaddleOCR.create({
      initialize: false,
      lang: 'ch', ocrVersion: 'PP-OCRv5',
      textDetectionModelName: 'PP-OCRv5_mobile_det',
      textDetectionModelAsset: { url: ocrModelUrl(OCR_MODEL_FILES.det) },
      textRecognitionModelName: 'PP-OCRv5_mobile_rec',
      textRecognitionModelAsset: { url: ocrModelUrl(OCR_MODEL_FILES.rec) },
      textDetLimitType: 'max', textDetLimitSideLen: lowMemory ? 480 : 640, textDetMaxSideLimit: lowMemory ? 480 : 640,
      textDetectionBatchSize: 1,
      textRecognitionBatchSize: 1,
      worker: false, fetch: assets.fetch,
      ortOptions: { backend: 'wasm', numThreads: 1 },
    }) as unknown as Engine
    if (typeof engine.sourceToMat !== 'function') throw new Error('识别引擎版本不兼容')
    engine.sourceToMat = sourceToMat
    await engine.initialize()
    return engine
  })()
  return initialization
}

function disposeEngine(): Promise<void> {
  if (!disposal) disposal = engine?.dispose().catch(() => undefined) ?? Promise.resolve()
  return disposal
}

function reportError(error: unknown) {
  self.postMessage({ ok: false, error: {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
  } })
}

async function recognize(blob: Blob) {
  const ready = await prepareEngine()
  report('recognize')
  const [result] = await ready.predict(blob)
  report('finish')
  return result?.items ?? []
}

let started = false
let warming = false
self.onmessage = (event: MessageEvent) => {
  if (!configured) {
    configured = true
    lowMemory = event.data?.lowMemory === true
    // The pinned SDK build reads this before creating either ONNX session.
    ;(globalThis as typeof globalThis & { __CHINESEBQB_OCR_LOW_MEMORY__?: boolean }).__CHINESEBQB_OCR_LOW_MEMORY__ = lowMemory
  }
  if (event.data?.kind === 'warmup') {
    if (started || warming) return
    warming = true
    void prepareEngine().then(
      () => self.postMessage({ kind: 'ready' }),
      async error => { await disposeEngine(); reportError(error) },
    )
    return
  }
  if (started || event.data?.kind !== 'recognize' || !(event.data.blob instanceof Blob)) return
  started = true
  void recognize(event.data.blob).then(
    items => { started = false; self.postMessage({ ok: true, items }) },
    async error => { await disposeEngine(); reportError(error) },
  )
}
