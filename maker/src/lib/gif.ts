import { decompressFrames, parseGIF } from 'gifuct-js'
import { applyPalette, GIFEncoder, quantize } from 'gifenc'

export type GifFrame = {
  imageData: ImageData
  delayMs: number
}

type GifPatch = {
  dims: { width: number; height: number; top: number; left: number }
  delay: number
  disposalType: number
  patch: Uint8ClampedArray
}

const PIXEL_BUDGET = 24_000_000

export function decodeGifFrames(bytes: Uint8Array): { width: number; height: number; frames: GifFrame[] } {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const parsed = parseGIF(buffer)
  const raw = decompressFrames(parsed, true)
  if (!raw.length) throw new Error('这个 GIF 没有画面。')
  const frames = composeGifFrames(parsed.lsd.width, parsed.lsd.height, raw)
  return { width: parsed.lsd.width, height: parsed.lsd.height, frames }
}

export function composeGifFrames(width: number, height: number, frames: GifPatch[]): GifFrame[] {
  let screen = new Uint8ClampedArray(width * height * 4)
  const output: GifFrame[] = []
  for (const frame of frames) {
    const saved = frame.disposalType === 3 ? screen.slice() : null
    blit(screen, width, height, frame)
    output.push({
      imageData: new ImageData(new Uint8ClampedArray(screen), width, height),
      delayMs: Math.max(20, (frame.delay || 10) * 10),
    })
    if (frame.disposalType === 2) clearPatch(screen, width, height, frame)
    else if (frame.disposalType === 3 && saved) screen = saved
  }
  return output
}

export function gifWithinBudget(width: number, height: number, frameCount: number): boolean {
  return width * height * frameCount <= PIXEL_BUDGET
}

export function encodeGif(frames: GifFrame[]): Uint8Array {
  if (!frames.length) throw new Error('没有可以导出的 GIF 帧。')
  const gif = GIFEncoder()
  for (const frame of frames) {
    const rgba = frame.imageData.data
    const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true })
    const index = applyPalette(rgba, palette, 'rgba4444')
    const transparentIndex = palette.findIndex((color) => (color[3] ?? 255) === 0)
    gif.writeFrame(index, frame.imageData.width, frame.imageData.height, {
      palette,
      delay: frame.delayMs,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    })
  }
  gif.finish()
  return gif.bytes()
}

function blit(screen: Uint8ClampedArray, width: number, height: number, frame: GifPatch) {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims
  for (let y = 0; y < frameHeight; y += 1) {
    const targetY = y + top
    if (targetY < 0 || targetY >= height) continue
    for (let x = 0; x < frameWidth; x += 1) {
      const targetX = x + left
      if (targetX < 0 || targetX >= width) continue
      const source = (y * frameWidth + x) * 4
      if (frame.patch[source + 3] === 0) continue
      const target = (targetY * width + targetX) * 4
      screen[target] = frame.patch[source]
      screen[target + 1] = frame.patch[source + 1]
      screen[target + 2] = frame.patch[source + 2]
      screen[target + 3] = 255
    }
  }
}

function clearPatch(screen: Uint8ClampedArray, width: number, height: number, frame: GifPatch) {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims
  for (let y = 0; y < frameHeight; y += 1) {
    const targetY = y + top
    if (targetY < 0 || targetY >= height) continue
    for (let x = 0; x < frameWidth; x += 1) {
      const targetX = x + left
      if (targetX < 0 || targetX >= width) continue
      const target = (targetY * width + targetX) * 4
      screen[target] = 0
      screen[target + 1] = 0
      screen[target + 2] = 0
      screen[target + 3] = 0
    }
  }
}
