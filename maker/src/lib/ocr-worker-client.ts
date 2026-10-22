import { isOcrProgress, type OcrProgress, type OcrProgressListener } from './ocr-progress'
import { isOcrMemoryError, prefersLowMemoryOcr } from './ocr-memory-policy'

export const OCR_WORKER_TIMEOUT_MS = 180_000
export const OCR_WARM_IDLE_MS = 300_000

type Recognition = {
  resolve: (items: unknown[]) => void
  reject: (error: Error) => void
  onProgress?: OcrProgressListener
}
type Session = {
  worker: Worker
  lowMemory: boolean
  progress: OcrProgress
  request: Recognition | null
  busy: boolean
  available: Promise<void>
  release: () => void
  timer: ReturnType<typeof setTimeout> | undefined
  finish: (error: Error | null, items?: unknown[]) => void
}
let session: Session | null = null
let cancellation = 0
let memoryPressure = false

function interrupted() { return new DOMException('识别已中断，可重新识别', 'AbortError') }
function timedOut() { return new DOMException('识别超时，请重新识别', 'TimeoutError') }

/** Keep one initialized engine, with bounded idle lifetime and serialized inference. */
function createSession(): Session {
  const worker = new Worker(new URL('../workers/ocr.worker.ts', import.meta.url), { type: 'module' })
  let settled = false
  const pagehide = () => current.finish(interrupted())
  const hidden = () => {
    if (document.visibilityState === 'hidden' && !current.request) current.finish(interrupted())
  }
  const current: Session = {
    worker, lowMemory: memoryPressure || prefersLowMemoryOcr(), progress: { stage: 'resources' }, request: null, busy: false,
    available: Promise.resolve(), release: () => undefined, timer: undefined,
    finish(error, items = []) {
      if (settled) return
      settled = true
      clearTimeout(current.timer)
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', hidden)
      worker.terminate()
      if (error && isOcrMemoryError(error)) memoryPressure = true
      if (session === current) session = null
      const request = current.request
      current.request = null
      current.release()
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
  const idle = () => {
    clearTimeout(current.timer)
    current.progress = { stage: 'recognize' }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') current.finish(null)
    else current.timer = setTimeout(() => current.finish(null), OCR_WARM_IDLE_MS)
  }
  worker.onmessage = (event: MessageEvent) => {
    if (settled) return
    const data = event.data
    if (data?.kind === 'progress' && isOcrProgress(data.progress)) {
      current.progress = data.progress
      current.request?.onProgress?.(data.progress)
      return
    }
    if (data?.kind === 'ready') {
      if (!current.busy) idle()
      return
    }
    if (data?.ok === true && Array.isArray(data.items) && current.busy) {
      const request = current.request
      current.request = null
      current.busy = false
      idle()
      current.release()
      request?.resolve(data.items)
    }
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
    current.worker.postMessage({ kind: 'warmup', lowMemory: current.lowMemory })
  } catch (error) {
    current?.finish(error instanceof Error ? error : new Error(String(error)))
  }
}

export function cancelOcrRecognition() {
  cancellation += 1
  // Let in-flight inference drain in the worker, retaining its initialized engine.
  // Detach the consumer now so a late result cannot reach the editor.
  const request = session?.request
  if (session) session.request = null
  request?.reject(interrupted())
}

export function cancelOcrWarmup() {
  if (session && !session.busy) session.finish(null)
}

export type OcrWarmupOptions = {
  /** Wait for a click/key press before spending CPU on an empty or failed gallery. */
  afterInteraction?: boolean
}

/** Start in idle time after the UI can paint; defer background tabs until visible. */
function scheduleIdleWarmup(): () => void {
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

/** An empty gallery should not download OCR weights until the user actually does something. */
function scheduleInteractionWarmup(): () => void {
  if (typeof document === 'undefined' || session) return () => undefined
  let stopped = false
  let idleCleanup: (() => void) | null = null
  const start = () => {
    if (stopped || idleCleanup) return
    remove()
    idleCleanup = scheduleIdleWarmup()
  }
  const remove = () => {
    document.removeEventListener('pointerdown', start, true)
    document.removeEventListener('keydown', start, true)
  }
  document.addEventListener('pointerdown', start, true)
  document.addEventListener('keydown', start, true)
  return () => {
    stopped = true
    remove()
    idleCleanup?.()
    idleCleanup = null
  }
}

export function scheduleOcrWarmup(options: OcrWarmupOptions = {}): () => void {
  return options.afterInteraction ? scheduleInteractionWarmup() : scheduleIdleWarmup()
}

/** A skipped job drains before the next picture uses the same engine. */
export async function runOcrWorker(blob: Blob, onProgress?: OcrProgressListener): Promise<unknown[]> {
  const generation = cancellation
  try {
    return await runOcrAttempt(blob, onProgress)
  } catch (error) {
    if (!isOcrMemoryError(error)) throw error
    // The failed worker has already terminated. Give its WASM heaps a chance
    // to be reclaimed, then retry this picture once using bounded inference.
    let hidden = false
    const pagehide = () => { hidden = true }
    if (typeof window !== 'undefined') window.addEventListener('pagehide', pagehide, { once: true })
    try { await new Promise(resolve => setTimeout(resolve, 150)) }
    finally { if (typeof window !== 'undefined') window.removeEventListener('pagehide', pagehide) }
    if (hidden || generation !== cancellation || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) throw interrupted()
    return runOcrAttempt(blob, onProgress)
  }
}

async function runOcrAttempt(blob: Blob, onProgress?: OcrProgressListener): Promise<unknown[]> {
  const generation = cancellation
  while (session?.busy) {
    await session.available
    if (generation !== cancellation) throw interrupted()
  }
  return new Promise((resolve, reject) => {
    let current: Session | undefined
    try {
      const wasWarm = session !== null
      current = session ?? createSession()
      clearTimeout(current.timer)
      current.request = { resolve, reject, onProgress }
      current.busy = true
      current.available = new Promise<void>(resolve => { current!.release = resolve })
      const active = current
      current.timer = setTimeout(() => active.finish(timedOut()), OCR_WORKER_TIMEOUT_MS)
      if (wasWarm) onProgress?.(current.progress)
      current.worker.postMessage({ kind: 'recognize', blob, lowMemory: current.lowMemory })
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error))
      if (current) current.finish(failure)
      else reject(failure)
    }
  })
}
