/** Start the write in the click handler, before rendering/encoding awaits.
 * Promise-backed ClipboardItems keep Safari's user-gesture authorization. */
export type ClipboardImageMime = 'image/png' | 'image/gif'

// GIF 走富文本：写入只含一个 <img> 的 HTML，图片是原始 GIF 字节的 data URL。
// 原生 image/gif 剪贴板支持在 Chrome/WebKit 都很少见，而且 supports() 为
// false 或缺失时 Chrome 仍能写 text/html，所以不再用 supports() 拦截。
const BASE64_CHUNK = 32 * 1024

/** Encode the exact GIF bytes as a data URL inside a minimal HTML document. */
async function gifHtmlBlob(gif: Blob, signal: AbortSignal): Promise<Blob> {
  const bytes = new Uint8Array(await gif.arrayBuffer())
  if (signal.aborted) throw new DOMException('已取消复制', 'AbortError')
  // 分块转二进制字符串，避免把整个 GIF 一次性展开成参数列表。
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK)
    let text = ''
    for (let index = 0; index < chunk.length; index++) text += String.fromCharCode(chunk[index])
    binary += text
  }
  if (signal.aborted) throw new DOMException('已取消复制', 'AbortError')
  const source = `data:image/gif;base64,${btoa(binary)}`
  return new Blob([`<img src="${source}">`], { type: 'text/html' })
}

export function writeClipboardImage(createImage: () => Promise<Blob>, signal: AbortSignal, mime: ClipboardImageMime = 'image/png'): Promise<void> {
  if (!globalThis.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return Promise.reject(new Error('当前浏览器不支持复制图片，请使用下载。'))
  }
  if (signal.aborted) return Promise.reject(new DOMException('已取消复制', 'AbortError'))

  let rejectCancellation!: (error: DOMException) => void
  const cancellation = new Promise<never>((_resolve, reject) => { rejectCancellation = reject })
  void cancellation.catch(() => {})
  let stop: () => void = () => {}
  const payload = new Promise<Blob>((resolve, reject) => {
    const abort = () => {
      const error = new DOMException('已取消复制', 'AbortError')
      reject(error)
      rejectCancellation(error)
    }
    signal.addEventListener('abort', abort, { once: true })
    stop = () => signal.removeEventListener('abort', abort)
    try {
      void createImage().then(async blob => {
        if (signal.aborted) { abort(); return }
        if (blob.type !== mime) { reject(new Error('复制图片格式错误，请重试。')); return }
        if (mime !== 'image/gif') { resolve(blob); return }
        try {
          const html = await gifHtmlBlob(blob, signal)
          if (signal.aborted) { abort(); return }
          resolve(html)
        } catch (error) {
          // 转换失败或中途取消都只结算这份待写入载荷；迟到的成功/失败
          // 不能进入剪贴板，也不能变成未处理拒绝。
          if (signal.aborted) abort()
          else reject(error)
        }
      }, reject)
    } catch (error) { reject(error) }
  })
  // A denied write can reject before the browser consumes the payload promise.
  void payload.catch(() => {})
  const type = mime === 'image/gif' ? 'text/html' : mime
  try {
    // A native clipboard promise need not settle promptly when its data promise
    // rejects. Release the UI immediately on cancellation as well as denying
    // the pending payload; a late platform callback cannot claim success.
    return Promise.race([navigator.clipboard.write([new ClipboardItem({ [type]: payload })]), cancellation]).finally(stop)
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
