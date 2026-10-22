import type { GifExportOptions } from './gif-export'
import type { TimedEdits } from './timeline'

/** All native erasure, area resampling and palette work lives in a disposable
 * worker. Cancelling or changing the source stops CPU work immediately. */
export function exportGifInWorker(source: Blob, edits: TimedEdits, options: GifExportOptions & { signal?: AbortSignal } = {}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const cancel = () => finish(new DOMException('已取消导出', 'AbortError'))
    const finish = (error: Error | null, blob?: Blob) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', cancel)
      window.removeEventListener('pagehide', cancel)
      worker?.terminate()
      if (error) reject(error)
      else resolve(blob!)
    }
    if (options.signal?.aborted) { cancel(); return }
    try {
      worker = new Worker(new URL('../workers/gif-export.worker.ts', import.meta.url), { type: 'module' })
      options.signal?.addEventListener('abort', cancel, { once: true })
      window.addEventListener('pagehide', cancel, { once: true })
      timer = setTimeout(() => finish(new Error('导出耗时过长，已停止处理，请重试。')), 120_000)
      worker.onmessage = event => {
        if (settled) return
        if (event.data?.progress) options.onProgress?.(event.data.progress)
        else if (event.data?.blob instanceof Blob) finish(null, event.data.blob)
        else finish(new Error(event.data?.error || 'GIF 导出失败'))
      }
      worker.onerror = event => { event.preventDefault(); finish(new Error(event.message || 'GIF 导出进程启动失败')) }
      worker.onmessageerror = () => finish(new Error('GIF 导出结果读取失败'))
      // Blob structured cloning shares immutable compressed bytes, never the
      // editor's native RGBA frames or their lazy getters.
      worker.postMessage({ source, edits })
    } catch (error) { finish(error instanceof Error ? error : new Error(String(error))) }
  })
}
