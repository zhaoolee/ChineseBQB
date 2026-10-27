/** Start the write in the click handler, before rendering/encoding awaits.
 * Promise-backed ClipboardItems keep Safari's user-gesture authorization. */
export function writeClipboardImage(createImage: () => Promise<Blob>, signal: AbortSignal): Promise<void> {
  if (!globalThis.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持复制图片，请使用下载。'))
  }
  if (signal.aborted) return Promise.reject(new DOMException('已取消复制', 'AbortError'))

  let stop: () => void = () => {}
  const image = new Promise<Blob>((resolve, reject) => {
    const abort = () => reject(new DOMException('已取消复制', 'AbortError'))
    signal.addEventListener('abort', abort, { once: true })
    stop = () => signal.removeEventListener('abort', abort)
    try {
      void createImage().then(blob => {
        if (signal.aborted) { abort(); return }
        if (blob.type !== 'image/png') { reject(new Error('复制图片格式错误，请重试。')); return }
        resolve(blob)
      }, reject)
    } catch (error) { reject(error) }
  })
  // A denied write can reject before the browser consumes the image promise.
  void image.catch(() => {})
  try {
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]).finally(stop)
  } catch (error) {
    stop()
    return Promise.reject(error)
  }
}

export function clipboardErrorMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return '浏览器未允许复制图片，请允许剪贴板访问后重试，或使用下载。'
  }
  return error instanceof Error ? error.message : '复制失败，请重试或使用下载。'
}
