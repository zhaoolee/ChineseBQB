import { editedDownloadName, extensionForMime } from './paint'

export type FileShareSupport =
  | { ok: true }
  | { ok: false; reason: 'insecure' | 'unsupported' | 'file'; message: string }

const DOWNLOAD_HINT = '请下载图片后发送。'

/** Wrap the already exported Blob without re-encoding; the File keeps its exact bytes. */
export function shareFileFromBlob(blob: Blob, sourceName: string): File {
  return new File([blob], editedDownloadName(sourceName || 'chinesebqb', extensionForMime(blob.type)), { type: blob.type })
}

/** File sharing capability is per file: some browsers share text but reject files. */
export function fileShareSupport(file: File): FileShareSupport {
  if (!globalThis.isSecureContext) {
    return { ok: false, reason: 'insecure', message: `系统分享需要 HTTPS 安全环境，${DOWNLOAD_HINT}` }
  }
  const share = globalThis.navigator?.share
  const canShare = globalThis.navigator?.canShare
  if (typeof share !== 'function' || typeof canShare !== 'function') {
    return { ok: false, reason: 'unsupported', message: `当前浏览器不支持文件分享，${DOWNLOAD_HINT}` }
  }
  try {
    if (canShare.call(globalThis.navigator, { files: [file] })) return { ok: true }
  } catch {
    // A throwing capability probe only disables sharing; it must not fail the copy result.
  }
  return { ok: false, reason: 'file', message: `当前浏览器无法分享这个图片文件，${DOWNLOAD_HINT}` }
}

/** Call directly in the Share button's click handler, before any await, so activation is preserved. */
export function shareFile(file: File): Promise<void> {
  return globalThis.navigator.share({ files: [file] })
}

export function isShareCancellation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export function shareErrorMessage(error: unknown): string {
  if (isShareCancellation(error)) return '已取消系统分享，可以再次点「分享」重试。'
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return '浏览器未允许系统分享，请允许后重试，或下载图片后发送。'
  }
  if (error instanceof DOMException && error.name === 'DataError') {
    return '系统无法处理这个图片文件，请下载图片后发送。'
  }
  return '系统分享失败，请重试或下载图片后发送。'
}
