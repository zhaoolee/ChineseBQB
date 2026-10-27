/** Start the write in the click handler, before rendering/encoding awaits.
 * Promise-backed ClipboardItems keep Safari's user-gesture authorization. */
export type ClipboardImageMime = 'image/png' | 'image/gif'

export function writeClipboardImage(createImage: () => Promise<Blob>, signal: AbortSignal, mime: ClipboardImageMime = 'image/png'): Promise<void> {
  if (!globalThis.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持复制图片，请使用下载。'))
  }
  if (signal.aborted) return Promise.reject(new DOMException('已取消复制', 'AbortError'))
  if (mime === 'image/gif') {
    try {
      if (typeof ClipboardItem.supports !== 'function' || !ClipboardItem.supports(mime)) {
        return Promise.reject(new Error('当前浏览器不支持复制 GIF。请点击「下载」获取 GIF 表情；取消「适配微信表情」后可复制 PNG 静态图。'))
      }
    } catch {
      return Promise.reject(new Error('无法确认浏览器是否支持复制 GIF，请使用「下载」获取 GIF 表情。'))
    }
  }

  let rejectCancellation!: (error: DOMException) => void
  const cancellation = new Promise<never>((_resolve, reject) => { rejectCancellation = reject })
  void cancellation.catch(() => {})
  let stop: () => void = () => {}
  const image = new Promise<Blob>((resolve, reject) => {
    const abort = () => {
      const error = new DOMException('已取消复制', 'AbortError')
      reject(error)
      rejectCancellation(error)
    }
    signal.addEventListener('abort', abort, { once: true })
    stop = () => signal.removeEventListener('abort', abort)
    try {
      void createImage().then(blob => {
        if (signal.aborted) { abort(); return }
        if (blob.type !== mime) { reject(new Error('复制图片格式错误，请重试。')); return }
        resolve(blob)
      }, reject)
    } catch (error) { reject(error) }
  })
  // A denied write can reject before the browser consumes the image promise.
  void image.catch(() => {})
  try {
    // A native clipboard promise need not settle promptly when its data promise
    // rejects. Release the UI immediately on cancellation as well as denying
    // the pending image payload; a late platform callback cannot claim success.
    return Promise.race([navigator.clipboard.write([new ClipboardItem({ [mime]: image })]), cancellation]).finally(stop)
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
