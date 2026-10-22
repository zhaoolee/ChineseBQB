import { decompressFrame, parseGIF } from 'gifuct-js'
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

const PIXEL_BUDGET = 8_000_000
const MAX_GIF_EDGE = 1600
const MAX_GIF_FRAMES = 200
const MAX_DECODE_FRAMES = 2000
const MAX_PATCH_PIXELS = 200_000_000

export function decodeGifFrames(bytes: Uint8Array): { width: number; height: number; frames: GifFrame[]; limited: boolean; sourceFrameCount: number } {
  if (bytes.byteLength > 15_000_000) throw new Error('图片超过 15 MB，请先缩小。')
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const parsed = parseGIF(buffer)
  const { width, height } = parsed.lsd
  const raw = parsed.frames.filter((frame) => 'image' in frame)
  if (!raw.length) throw new Error('这个 GIF 没有画面。')
  if (raw.length > MAX_DECODE_FRAMES || raw.reduce((sum, frame) => sum + frame.image.descriptor.width * frame.image.descriptor.height, 0) > MAX_PATCH_PIXELS) {
    throw new Error('这个 GIF 解码量过大，请先缩短动画或降低分辨率。')
  }
  // Inspect metadata before LZW decompression or allocating any pixel buffers.
  for (const size of [{ width, height }, ...raw.map((frame) => frame.image.descriptor)]) {
    if (size.width < 1 || size.height < 1 || size.width > MAX_GIF_EDGE || size.height > MAX_GIF_EDGE) {
      throw new Error('GIF 尺寸无效或边长超过 1600，请先缩小。')
    }
  }
  const sampleEvery = Math.ceil(raw.length / MAX_GIF_FRAMES)
  const count = Math.ceil(raw.length / sampleEvery)
  const scale = Math.min(1, Math.sqrt(PIXEL_BUDGET / (width * height * count)))
  const outputWidth = Math.max(1, Math.floor(width * scale))
  const outputHeight = Math.max(1, Math.floor(height * scale))
  const limited = scale < 1 || sampleEvery > 1
  function* patches() {
    for (const frame of raw) {
      yield decompressFrame(frame, parsed.gct, true)
    }
  }
  const frames = composeGifFrames(outputWidth, outputHeight, patches(), { sourceWidth: width, sourceHeight: height, sampleEvery })
  return { width: outputWidth, height: outputHeight, frames, limited, sourceFrameCount: raw.length }
}

export function composeGifFrames(width: number, height: number, frames: Iterable<GifPatch>, options: { sourceWidth?: number; sourceHeight?: number; sampleEvery?: number } = {}): GifFrame[] {
  let screen = new Uint8ClampedArray(width * height * 4)
  const output: GifFrame[] = []
  const scaleX = (options.sourceWidth ?? width) / width
  const scaleY = (options.sourceHeight ?? height) / height
  let index = 0
  for (const frame of frames) {
    const saved = frame.disposalType === 3 ? screen.slice() : null
    blit(screen, width, height, frame, scaleX, scaleY)
    const delayMs = Math.max(20, frame.delay || 100)
    if (index++ % (options.sampleEvery ?? 1) === 0) {
      output.push({ imageData: new ImageData(new Uint8ClampedArray(screen), width, height), delayMs })
    } else output[output.length - 1].delayMs += delayMs
    if (frame.disposalType === 2) clearPatch(screen, width, height, frame, scaleX, scaleY)
    else if (frame.disposalType === 3 && saved) screen = saved
  }
  return output
}

export function gifWithinBudget(width: number, height: number, frameCount: number): boolean {
  return frameCount <= MAX_GIF_FRAMES && width * height * frameCount <= PIXEL_BUDGET
}

export function encodeGif(frames: Iterable<GifFrame>): Uint8Array {
  const gif = GIFEncoder()
  let count = 0
  for (const frame of frames) {
    count += 1
    writeFrame(gif, frame)
  }
  if (!count) throw new Error('没有可以导出的 GIF 帧。')
  gif.finish()
  return gif.bytes()
}

export class GifSizeLimitError extends Error {
  constructor() { super('GIF 超出体积预算。'); this.name = 'GifSizeLimitError' }
}

export type GifEncodeOptions = { maxColors?: number; maxBytes?: number }

/** Async producers can render and release one frame at a time, yielding to the UI. */
export async function encodeGifAsync(frames: AsyncIterable<GifFrame>, options: GifEncodeOptions = {}): Promise<Uint8Array> {
  const gif = GIFEncoder()
  let count = 0
  for await (const frame of frames) {
    writeFrame(gif, frame, options.maxColors)
    count += 1
    if (options.maxBytes !== undefined && gif.bytesView().byteLength >= options.maxBytes) throw new GifSizeLimitError()
  }
  if (!count) throw new Error('没有可以导出的 GIF 帧。')
  gif.finish()
  if (options.maxBytes !== undefined && gif.bytesView().byteLength >= options.maxBytes) throw new GifSizeLimitError()
  return gif.bytes()
}

function writeFrame(gif: ReturnType<typeof GIFEncoder>, frame: GifFrame, maxColors = 256) {
  const rgba = frame.imageData.data
  const palette = quantize(rgba, maxColors, { format: 'rgba4444', oneBitAlpha: true })
  const index = applyPalette(rgba, palette, 'rgba4444')
  const transparentIndex = palette.findIndex((color) => (color[3] ?? 255) === 0)
  gif.writeFrame(index, frame.imageData.width, frame.imageData.height, {
    palette,
    delay: frame.delayMs,
    repeat: 0,
    // Every encoded frame is a complete composite; transparent pixels must not
    // reveal pixels left over from the previous frame.
    dispose: 2,
    transparent: transparentIndex >= 0,
    transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
  })
}

function blit(screen: Uint8ClampedArray, width: number, height: number, frame: GifPatch, scaleX = 1, scaleY = 1) {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims
  for (let targetY = Math.max(0, Math.floor(top / scaleY)); targetY < Math.min(height, Math.ceil((top + frameHeight) / scaleY)); targetY += 1) {
    const y = Math.floor(targetY * scaleY) - top
    if (y < 0 || y >= frameHeight) continue
    for (let targetX = Math.max(0, Math.floor(left / scaleX)); targetX < Math.min(width, Math.ceil((left + frameWidth) / scaleX)); targetX += 1) {
      const x = Math.floor(targetX * scaleX) - left
      if (x < 0 || x >= frameWidth) continue
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

function clearPatch(screen: Uint8ClampedArray, width: number, height: number, frame: GifPatch, scaleX = 1, scaleY = 1) {
  const { left, top, width: frameWidth, height: frameHeight } = frame.dims
  for (let targetY = Math.max(0, Math.ceil(top / scaleY)); targetY < Math.min(height, Math.ceil((top + frameHeight) / scaleY)); targetY += 1) {
    for (let targetX = Math.max(0, Math.ceil(left / scaleX)); targetX < Math.min(width, Math.ceil((left + frameWidth) / scaleX)); targetX += 1) {
      const target = (targetY * width + targetX) * 4
      screen[target] = 0
      screen[target + 1] = 0
      screen[target + 2] = 0
      screen[target + 3] = 0
    }
  }
}
