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

function readGifSource(bytes: Uint8Array) {
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
  return { parsed, raw, width, height }
}

/** Validate the compressed source in a short-lived worker without allocating frames. */
export function validateGif(bytes: Uint8Array): void { readGifSource(bytes) }

/** Keep source pixels for editing, decoding only requested frames. Compositing runs
 * forward from a bounded checkpoint cache; the two recent ImageData frames also let
 * OCR compare neighbours without repeatedly decoding them. Nothing is resized here.
 */
export function createEditableGifFrames(bytes: Uint8Array): ReturnType<typeof decodeGifFrames> {
  const { parsed, raw, width, height } = readGifSource(bytes)
  const sampleEvery = Math.ceil(raw.length / MAX_GIF_FRAMES)
  const screen = new Uint8ClampedArray(width * height * 4)
  const recent = new Map<number, ImageData>()
  const checkpoints = new Map<number, Uint8ClampedArray>()
  const maxCheckpoints = Math.max(0, Math.min(4, Math.floor(PIXEL_BUDGET / (width * height)) - 5))
  let nextRaw = 0

  function read(index: number): ImageData {
    const cached = recent.get(index)
    if (cached) return cached
    const target = index * sampleEvery
    if (target < nextRaw) {
      // Checkpoints contain the screen *after disposal*, ready for the next raw frame.
      const nearest = [...checkpoints.keys()].filter(next => next <= target).sort((a, b) => b - a)[0]
      if (nearest !== undefined) {
        const pixels = checkpoints.get(nearest)!
        screen.set(pixels)
        checkpoints.delete(nearest)
        checkpoints.set(nearest, pixels)
        nextRaw = nearest
      } else {
        screen.fill(0)
        nextRaw = 0
      }
    }
    let result: ImageData | undefined
    while (nextRaw <= target) {
      const patch = decompressFrame(raw[nextRaw], parsed.gct, true)
      const saved = patch.disposalType === 3 ? screen.slice() : null
      blit(screen, width, height, patch, 1, 1)
      if (nextRaw === target) result = new ImageData(screen.slice(), width, height)
      if (patch.disposalType === 2) clearPatch(screen, width, height, patch, 1, 1)
      else if (saved) screen.set(saved)
      nextRaw += 1
      if (maxCheckpoints && nextRaw % 16 === 0) {
        checkpoints.delete(nextRaw)
        checkpoints.set(nextRaw, screen.slice())
        if (checkpoints.size > maxCheckpoints) checkpoints.delete(checkpoints.keys().next().value!)
      }
    }
    recent.set(index, result!)
    if (recent.size > 2) recent.delete(recent.keys().next().value!)
    return result!
  }

  const frames: GifFrame[] = []
  for (let index = 0; index < raw.length; index += sampleEvery) {
    const outputIndex = frames.length
    const delayMs = raw.slice(index, index + sampleEvery)
      .reduce((total, frame) => total + Math.max(20, (frame.gce?.delay ?? 0) * 10 || 100), 0)
    frames.push({ get imageData() { return read(outputIndex) }, delayMs })
  }
  return { width, height, frames, limited: sampleEvery > 1, sourceFrameCount: raw.length }
}

/** Eager bounded decoder for independent exports/tests. Editing uses the lazy source above. */
export function decodeGifFrames(bytes: Uint8Array): { width: number; height: number; frames: GifFrame[]; limited: boolean; sourceFrameCount: number } {
  const { parsed, raw, width, height } = readGifSource(bytes)
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

type IndexedFrame = { palette: number[][]; index: Uint8Array; transparentIndex: number }
// Keep at most two palette variants across attempts. Cached index planes use at
// most 2 * 200 * 240 * 240 bytes in sticker exports; source RGBA is not copied.
export type GifFrameCache = Map<number, WeakMap<ImageData, IndexedFrame>>
export type GifEncodeOptions = { maxColors?: number; maxBytes?: number; frameCache?: GifFrameCache; globalPalette?: number[][] }

/** Async producers can render and release one frame at a time, yielding to the UI. */
export async function encodeGifAsync(frames: AsyncIterable<GifFrame>, options: GifEncodeOptions = {}): Promise<Uint8Array> {
  const gif = GIFEncoder()
  let count = 0
  let previous: Uint8Array | undefined
  const palette = options.globalPalette
  const lookup = palette ? new Map<number, number>() : undefined
  for await (const frame of frames) {
    if (palette && lookup) {
      // A stable global palette makes unchanged pixels identical across frames.
      // Disposal 1 retains them; the reserved transparent index means “reuse”.
      const index = mapOpaquePalette(frame.imageData, palette, lookup)
      const transparentIndex = palette.length
      const delta = index.slice()
      if (previous) for (let i = 0; i < delta.length; i++) if (index[i] === previous[i]) delta[i] = transparentIndex
      gif.writeFrame(delta, frame.imageData.width, frame.imageData.height, {
        palette: count === 0 ? [...palette, [0, 0, 0]] : undefined,
        delay: frame.delayMs, repeat: 0, dispose: 1, transparent: true, transparentIndex,
      })
      previous = index
    } else writeFrame(gif, frame, options.maxColors, options.frameCache)
    count += 1
    if (options.maxBytes !== undefined && gif.bytesView().byteLength >= options.maxBytes) throw new GifSizeLimitError()
  }
  if (!count) throw new Error('没有可以导出的 GIF 帧。')
  gif.finish()
  if (options.maxBytes !== undefined && gif.bytesView().byteLength >= options.maxBytes) throw new GifSizeLimitError()
  return gif.bytes()
}

export function mapOpaquePalette(image: ImageData, palette: number[][], lookup: Map<number, number>): Uint8Array {
  if (!palette.length || palette.length > 255) throw new Error('GIF 全局调色板无效。')
  const index = new Uint8Array(image.width * image.height)
  for (let p = 0; p < index.length; p++) {
    const i = p * 4
    const r = image.data[i], g = image.data[i + 1], b = image.data[i + 2]
    if (image.data[i + 3] !== 255) throw new Error('透明画面不能使用不透明差分编码。')
    const key = r << 16 | g << 8 | b
    let match = lookup.get(key)
    if (match === undefined) {
      let distance = Infinity
      for (let j = 0; j < palette.length; j++) {
        const color = palette[j]
        const d = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2
        if (d < distance) { distance = d; match = j }
      }
      // Exact RGB matching avoids introducing extra colour steps into smooth
      // gradients. Bound cache memory even for high-entropy photo sequences.
      if (lookup.size >= 65_536) lookup.clear()
      lookup.set(key, match!)
    }
    index[p] = match!
  }
  return index
}

function writeFrame(gif: ReturnType<typeof GIFEncoder>, frame: GifFrame, maxColors = 256, cache?: GifFrameCache) {
  let variants = cache?.get(maxColors)
  if (cache && !variants) {
    if (cache.size >= 2) cache.delete(cache.keys().next().value!)
    variants = new WeakMap()
    cache.set(maxColors, variants)
  }
  let encoded = variants?.get(frame.imageData)
  if (!encoded) {
    const rgba = frame.imageData.data
    let opaque = true
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) { opaque = false; break }
    // Opaque photos need finer RGB bins: rgba4444 point lookup collapsed smooth
    // gradients into coarse colour bands even when the palette had room left.
    const format = opaque ? 'rgb565' : 'rgba4444'
    const palette = quantize(rgba, maxColors, { format: opaque ? 'rgb444' : 'rgba4444', oneBitAlpha: true })
    encoded = { palette, index: applyPalette(rgba, palette, format),
      transparentIndex: palette.findIndex(color => (color[3] ?? 255) === 0) }
    variants?.set(frame.imageData, encoded)
  }
  const { palette, index, transparentIndex } = encoded
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
