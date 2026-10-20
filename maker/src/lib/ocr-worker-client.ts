import { isOcrProgress, type OcrProgress, type OcrProgressListener } from './ocr-progress'

export const OCR_WORKER_TIMEOUT_MS = 180_000
export const OCR_WARM_IDLE_MS = 300_000

type Recognition = {
  resolve: (items: unknown[]) => void
  reject: (error: Error) => void
  onProgress?: OcrProgressListener
}
type Session = {
  worker: Worker
  progress: OcrProgress
  request: Recognition | null
  timer: ReturnType<typeof setTimeout> | undefined
  finish: (error: Error | null, items?: unknown[]) => void
}
let session: Session | null = null

function interrupted() { return new DOMException('识别已中断，可重新识别', 'AbortError') }
function timedOut() { return new DOMException('识别超时，请重新识别', 'TimeoutError') }

/** There is at most one OCR realm: a warm idle engine is claimed by the first recognition. */
function createSession(): Session {
  const worker = new Worker(new URL('../workers/ocr.worker.ts', import.meta.url), { type: 'module' })
  let settled = false
  const pagehide = () => current.finish(interrupted())
  const hidden = () => {
    if (document.visibilityState === 'hidden' && !current.request) current.finish(interrupted())
  }
  const current: Session = {
    worker, progress: { stage: 'resources' }, request: null, timer: undefined,
    finish(error, items = []) {
      if (settled) return
      settled = true
      clearTimeout(current.timer)
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', hidden)
      worker.terminate()
      if (session === current) session = null
      const request = current.request
      current.request = null
      if (request) {
        if (error) request.reject(error)
        else request.resolve(items)
      }
    },
  }
  session = current
  if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehide, { once: true })
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', hidden)
  current.timer = setTimeout(() => current.finish(timedOut()), OCR_WORKER_TIMEOUT_MS)
  worker.onmessage = (event: MessageEvent) => {
    if (settled) return
    const data = event.data
    if (data?.kind === 'progress' && isOcrProgress(data.progress)) {
      current.progress = data.progress
      current.request?.onProgress?.(data.progress)
      return
    }
    if (data?.kind === 'ready') {
      if (!current.request) {
        clearTimeout(current.timer)
        current.timer = setTimeout(() => current.finish(null), OCR_WARM_IDLE_MS)
      }
      return
    }
    if (data?.ok === true && Array.isArray(data.items)) current.finish(null, data.items)
    else {
      const error = new Error(typeof data?.error?.message === 'string' ? data.error.message : '识别进程返回了无效结果')
      error.name = typeof data?.error?.name === 'string' ? data.error.name : 'Error'
      current.finish(error)
    }
  }
  worker.onerror = event => { event.preventDefault(); current.finish(new Error(event.message || '识别进程启动失败，请重新识别')) }
  worker.onmessageerror = () => current.finish(new Error('识别结果读取失败，请重新识别'))
  return current
}

/** Warm-up errors are silent and disposable; choosing a picture can always start a fresh attempt. */
export function warmOcrWorker() {
  if (session) return
  let current: Session | undefined
  try {
    current = createSession()
    current.worker.postMessage({ kind: 'warmup' })
  } catch (error) {
    current?.finish(error instanceof Error ? error : new Error(String(error)))
  }
}

export function cancelOcrRecognition() {
  // Opening the first image must not destroy the engine that is already preparing for it.
  if (session?.request) session.finish(interrupted())
}

export function cancelOcrWarmup() {
  if (session && !session.request) session.finish(null)
}

/** Start after the UI can paint; defer background tabs until the page becomes visible. */
export function scheduleOcrWarmup(): () => void {
  let stopped = false
  let started = false
  let scheduled = false
  let handle: number | undefined
  const canIdle = typeof window.requestIdleCallback === 'function'
  const start = () => {
    scheduled = false
    if (stopped || document.visibilityState === 'hidden') return
    started = true
    warmOcrWorker()
  }
  const queue = () => {
    if (stopped || started || scheduled || document.visibilityState === 'hidden') return
    scheduled = true
    handle = canIdle ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 0)
  }
  document.addEventListener('visibilitychange', queue)
  queue()
  return () => {
    stopped = true
    if (handle !== undefined) {
      if (canIdle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
    document.removeEventListener('visibilitychange', queue)
    cancelOcrWarmup()
  }
}

/** Claim the warm engine, or create one on demand; every recognition still releases its WASM heaps. */
export function runOcrWorker(blob: Blob, onProgress?: OcrProgressListener): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    if (session?.request) { reject(new Error('上一轮识别尚未结束')); return }
    let current: Session | undefined
    try {
      const wasWarm = session !== null
      current = session ?? createSession()
      clearTimeout(current.timer)
      current.request = { resolve, reject, onProgress }
      const active = current
      current.timer = setTimeout(() => active.finish(timedOut()), OCR_WORKER_TIMEOUT_MS)
      if (wasWarm) onProgress?.(current.progress)
      current.worker.postMessage({ kind: 'recognize', blob })
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error))
      if (current) current.finish(failure)
      else reject(failure)
    }
  })
}
