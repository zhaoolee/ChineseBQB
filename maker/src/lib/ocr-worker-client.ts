export const OCR_WORKER_TIMEOUT_MS = 180_000
let cancelActive: (() => void) | null = null

export function cancelOcrRecognition() {
  cancelActive?.()
}

/** One disposable worker owns both WASM heaps; no OCR runtime is imported by the page. */
export function runOcrWorker(blob: Blob): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const cancel = () => finish(new DOMException('识别已中断，可重新识别', 'AbortError'))
    const finish = (error: Error | null, items: unknown[] = []) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', cancel)
      worker?.terminate()
      worker = null
      if (cancelActive === cancel) cancelActive = null
      if (error) reject(error)
      else resolve(items)
    }
    try {
      if (cancelActive) throw new Error('上一轮识别尚未结束')
      worker = new Worker(new URL('../workers/ocr.worker.ts', import.meta.url), { type: 'module' })
      cancelActive = cancel
      if (typeof window !== 'undefined') window.addEventListener('pagehide', cancel, { once: true })
      timer = setTimeout(() => finish(new DOMException('识别超时，请重新识别', 'TimeoutError')), OCR_WORKER_TIMEOUT_MS)
      worker.onmessage = (event: MessageEvent) => {
        const data = event.data
        if (data?.ok === true && Array.isArray(data.items)) finish(null, data.items)
        else {
          const error = new Error(typeof data?.error?.message === 'string' ? data.error.message : '识别进程返回了无效结果')
          error.name = typeof data?.error?.name === 'string' ? data.error.name : 'Error'
          finish(error)
        }
      }
      worker.onerror = (event) => {
        event.preventDefault()
        finish(new Error(event.message || '识别进程启动失败，请重新识别'))
      }
      worker.onmessageerror = () => finish(new Error('识别结果读取失败，请重新识别'))
      worker.postMessage({ kind: 'recognize', blob })
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
