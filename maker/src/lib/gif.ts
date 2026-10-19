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

export function decodeGifFrames(bytes: Uint8Array): { width: number; height: number; frames: GifFrame[]; limited: boolean } {
  if (bytes.byteLength > 15_000_000) throw new Error('图片超过 15 MB，请先缩小。')
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const parsed = parseGIF(buffer)
  const { width, height } = parsed.lsd
  const raw = parsed.frames.filter((frame) => 'image' in frame)
  if (!raw.length) throw new Error('这个 GIF 没有画面。')
  // Inspect metadata before LZW decompression or allocating any pixel buffers.
  for (const size of [{ width, height }, ...raw.map((frame) => frame.image.descriptor)]) {
    if (size.width < 1 || size.height < 1 || size.width > MAX_GIF_EDGE || size.height > MAX_GIF_EDGE) {
      throw new Error('GIF 尺寸无效或边长超过 1600，请先缩小。')
    }
  }
  const limited = !gifWithinBudget(width, height, raw.length)
  function* patches() {
    for (const frame of limited ? raw.slice(0, 1) : raw) {
      yield decompressFrame(frame, parsed.gct, true)
    }
  }
  const frames = composeGifFrames(width, height, patches())
  return { width, height, frames, limited }
}

export function composeGifFrames(width: number, height: number, frames: Iterable<GifPatch>): GifFrame[] {
  let screen = new Uint8ClampedArray(width * height * 4)
  const output: GifFrame[] = []
  for (const frame of frames) {
    const saved = frame.disposalType === 3 ? screen.slice() : null
    blit(screen, width, height, frame)
    output.push({
      imageData: new ImageData(new Uint8ClampedArray(screen), width, height),
      // gifuct-js already converts GIF centiseconds to milliseconds.
      delayMs: Math.max(20, frame.delay || 100),
    })
    if (frame.disposalType === 2) clearPatch(screen, width, height, frame)
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

/** Async producers can render and release one frame at a time, yielding to the UI. */
export async function encodeGifAsync(frames: AsyncIterable<GifFrame>): Promise<Uint8Array> {
  const gif = GIFEncoder()
  let count = 0
  for await (const frame of frames) {
    writeFrame(gif, frame)
    count += 1
  }
  if (!count) throw new Error('没有可以导出的 GIF 帧。')
  gif.finish()
  return gif.bytes()
}

function writeFrame(gif: ReturnType<typeof GIFEncoder>, frame: GifFrame) {
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
