import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'

// Bump this when replacing either of the pinned PP-OCRv5 mobile model files.
const CACHE_NAME = 'chinesebqb-ocr-paddle-0.4.2-v1'
const DOWNLOAD_TIMEOUT_MS = 90_000
let runtimeReady: Promise<void> | null = null

/** Cache only the public OCR resources, never pictures selected by the user. */
export async function fetchOcrAsset(path: string): Promise<Response> {
  const url = new URL(path, location.href).href
  let cache: Cache | null = null
  try {
    cache = await globalThis.caches?.open(CACHE_NAME) ?? null
    const cached = await cache?.match(url)
    if (cached?.ok) return cached
  } catch {
    // Private browsing, disabled storage, or a full cache must not prevent recognition.
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`识别资源下载失败（${response.status}），请检查网络后重试`)
  // Cache Storage consumes a separate stream; the SDK can read the response immediately.
  if (cache) void cache.put(url, response.clone()).catch(() => undefined)
  return response
}

function prepareRuntime(): Promise<void> {
  if (!runtimeReady) {
    runtimeReady = Promise.all([
      import('onnxruntime-web/wasm'),
      fetchOcrAsset(wasmUrl),
    ]).then(async ([ort, response]) => {
      // Supply the bytes directly so ORT does not start a second, late WASM download.
      ort.env.wasm.wasmBinary = await response.arrayBuffer()
      ort.env.wasm.numThreads = 1
      ort.env.wasm.initTimeout = 60_000
    }).catch((error: unknown) => {
      runtimeReady = null
      throw error
    })
  }
  return runtimeReady
}

/** Start both models and the small WASM runtime together, before SDK initialization. */
export async function prepareOcrAssets(detUrl: string, recUrl: string): Promise<{ fetch: typeof fetch }> {
  const [det, rec] = await Promise.all([
    fetchOcrAsset(detUrl),
    fetchOcrAsset(recUrl),
    prepareRuntime(),
  ])
  const responses = new Map([
    [new URL(detUrl, location.href).href, det],
    [new URL(recUrl, location.href).href, rec],
  ])
  return {
    fetch: async (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href).href
      const response = responses.get(url)
      if (!response) throw new Error('识别模型资源不可用，请重新识别')
      // Do not retain an unread clone of the entire tar in the engine's options.
      responses.delete(url)
      return response
    },
  }
}
