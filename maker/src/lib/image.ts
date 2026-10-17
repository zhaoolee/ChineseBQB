export type SniffedImage = {
  animated: boolean
  mime: string
}

const STATIC_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/avif'])

export function sniffImage(bytes: Uint8Array, mime: string): SniffedImage {
  const type = mime.toLowerCase()
  if (type === 'image/gif' || isGif(bytes)) return { animated: true, mime: 'image/gif' }
  if (isAnimatedWebp(bytes)) return { animated: true, mime: 'image/webp' }
  if (STATIC_TYPES.has(type) || isPng(bytes) || isJpeg(bytes) || isWebp(bytes)) {
    return { animated: false, mime: type || 'application/octet-stream' }
  }
  return { animated: false, mime: type }
}

export function assertEditableFile(file: File): void {
  if (file.size > 15_000_000) throw new Error('图片超过 15 MB，请换一张小一些的图。')
  if (file.type && !STATIC_TYPES.has(file.type) && file.type !== 'image/gif') {
    throw new Error('只支持 PNG、JPEG、WebP 静态图。')
  }
}

function isGif(bytes: Uint8Array): boolean {
  return ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a'
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 137 && ascii(bytes, 1, 4) === 'PNG'
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8
}

function isWebp(bytes: Uint8Array): boolean {
  return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP'
}

function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (!isWebp(bytes)) return false
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const tag = ascii(bytes, offset, 4)
    const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)
    if (tag === 'VP8X' && offset + 8 < bytes.length) return (bytes[offset + 8] & 0x02) !== 0
    offset += 8 + size + (size % 2)
  }
  return false
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let text = ''
  for (let index = 0; index < length; index += 1) text += String.fromCharCode(bytes[start + index] ?? 0)
  return text
}
