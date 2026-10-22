import { createEditableGifFrames } from './gif'
import type { decodeGifFrames } from './gif'

let cancelActive: (() => void) | null = null
export function cancelGifDecode() { cancelActive?.() }

/**
 * Validate the GIF off the UI thread, then build lazy frame getters from the
 * compressed bytes on the main thread. The worker only returns the source, so no
 * RGBA frames are structured-cloned and the retained array holds just the file.
 */
export function decodeGifInWorker(bytes: Uint8Array): Promise<ReturnType<typeof decodeGifFrames>> {
  cancelGifDecode()
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => finish(new DOMException('图片加载已取消', 'AbortError'))
    const finish = (error: Error | null, result?: ReturnType<typeof decodeGifFrames>) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('pagehide', cancel)
      worker?.terminate()
      if (cancelActive === cancel) cancelActive = null
      if (error) reject(error)
      else resolve(result!)
    }
    try {
      worker = new Worker(new URL('../workers/gif.worker.ts', import.meta.url), { type: 'module' })
      cancelActive = cancel
      window.addEventListener('pagehide', cancel, { once: true })
      timer = setTimeout(() => finish(new Error('GIF 解码超时，请缩短动画或降低分辨率。')), 60_000)
      worker.onmessage = (event: MessageEvent) => {
        if (settled) return
        const data = event.data
        try {
          if (data?.ok) {
            // Older worker builds returned decoded frames directly; keep accepting them.
            if (data.result?.frames?.length) { finish(null, data.result); return }
            if (!(data.sourceBytes instanceof Uint8Array)) { finish(new Error('GIF 解码失败')); return }
            finish(null, createEditableGifFrames(data.sourceBytes))
          } else finish(new Error(data?.error || 'GIF 解码失败'))
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)))
        }
      }
      worker.onerror = (event) => { event.preventDefault(); finish(new Error(event.message || 'GIF 解码进程启动失败')) }
      worker.onmessageerror = () => finish(new Error('GIF 像素读取失败'))
      worker.postMessage(bytes, [bytes.buffer as ArrayBuffer])
    } catch (error) { finish(error instanceof Error ? error : new Error(String(error))) }
  })
}
