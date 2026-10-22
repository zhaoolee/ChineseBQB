import { afterEach, describe, expect, it, vi } from 'vitest'
import { resizeArea, resizeGif } from '../src/lib/resize-area'
import { blurPolygon } from '../src/lib/compose'
import { pointInPolygon } from '../src/lib/geometry'
import type { Point } from '../src/types'
import { decodeGifFrames, encodeGifAsync } from '../src/lib/gif'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
afterEach(() => vi.unstubAllGlobals())

it('keeps neighbouring gradient colours distinct inside one coarse RGB565 bin', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const imageData = new ImageData(new Uint8ClampedArray([100,100,100,255,103,103,103,255]),2,1)
  async function* frames() { yield {imageData,delayMs:100} }
  const bytes = await encodeGifAsync(frames(), {globalPalette:[[100,100,100],[103,103,103]]})
  expect(decodeGifFrames(bytes).frames[0].imageData.data).toEqual(imageData.data)
})

it('reuses unchanged opaque pixels without ghosting, palette flicker or timing loss', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const palette = [[0,0,0], [255,0,0], [0,255,0], [0,0,255]]
  const frames = Array.from({length:20}, (_, frame) => {
    const data = new Uint8ClampedArray(32 * 32 * 4)
    let seed = 3
    for (let p = 0; p < 1024; p++) {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0
      data.set([...palette[seed >>> 30],255], p * 4)
    }
    data.set([255,0,0,255], frame * 4)
    return {imageData:new ImageData(data,32,32), delayMs:frame % 2 ? 40 : 30}
  })
  async function* stream() { yield* frames }
  const delta = await encodeGifAsync(stream(), {globalPalette:palette})
  const full = await encodeGifAsync(stream())
  expect(delta.length).toBeLessThan(full.length / 2)
  const decoded = decodeGifFrames(delta)
  expect(decoded.frames.map(frame => frame.delayMs)).toEqual(frames.map(frame => frame.delayMs))
  for (let i = 0; i < frames.length; i++) expect(decoded.frames[i].imageData.data).toEqual(frames[i].imageData.data)
})

describe('GIF resampling quality', () => {
  it('averages a fine halftone grid instead of aliasing it into coarse patterns', () => {
    vi.stubGlobal('ImageData', Pixels)
    const data = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const offset = (y * 64 + x) * 4
      data.fill((x + y) % 2 ? 255 : 0, offset, offset + 3)
      data[offset + 3] = 255
    }
    const result = resizeArea(new ImageData(data, 64, 64), 8, 8)
    for (let i = 0; i < result.data.length; i += 4) {
      expect(Array.from(result.data.slice(i, i + 4))).toEqual([128, 128, 128, 255])
    }
    expect(data[0]).toBe(0)
    const filtered = resizeGif(new ImageData(data,64,64), 17, 17)
    for (let i = 0; i < filtered.data.length; i += 4) {
      expect(Math.abs(filtered.data[i] - 128)).toBeLessThanOrEqual(2)
      expect(filtered.data[i + 3]).toBe(255)
    }
  })

  it('weights fractional source pixels and excludes transparent RGB from colour averages', () => {
    vi.stubGlobal('ImageData', Pixels)
    const source = new ImageData(new Uint8ClampedArray([0,0,0,255, 255,255,255,255, 0,0,0,255]), 3, 1)
    expect(Array.from(resizeArea(source, 2, 1).data)).toEqual([85,85,85,255, 85,85,85,255])
    const transparent = new ImageData(new Uint8ClampedArray([255,0,0,0, 0,0,255,255]), 2, 1)
    expect(Array.from(resizeArea(transparent, 1, 1).data)).toEqual([0,0,255,128])
    expect(resizeArea(source, 3, 1)).toBe(source)
  })

  it('preserves flat colours, alpha and dimensions with the high-quality GIF filter', () => {
    vi.stubGlobal('ImageData', Pixels)
    const data = new Uint8ClampedArray(11 * 13 * 4)
    for (let i = 0; i < data.length; i += 4) data.set([35,67,109,128],i)
    const result = resizeGif(new ImageData(data,11,13),4,5)
    expect([result.width,result.height]).toEqual([4,5])
    for (let i = 0; i < result.data.length; i += 4) expect(Array.from(result.data.slice(i,i + 4))).toEqual([35,67,109,128])
    expect(resizeGif(result,4,5)).toBe(result)
  })
})

/** Independent, intentionally slow definition of the separable box blur. Float32
 * intermediate rounding matches the preview's existing blur semantics. */
function referenceBlur(source: ImageData, polygon: Point[], radius: number) {
  const { width, height, data } = source
  const horizontal = new Float32Array(data.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width - 1, x + radius)
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let xx = left; xx <= right; xx++) sum += data[(y * width + xx) * 4 + c]
      horizontal[(y * width + x) * 4 + c] = sum / (right - left + 1)
    }
  }
  const output = data.slice()
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!pointInPolygon({ x: x + .5, y: y + .5 }, polygon)) continue
    const top = Math.max(0, y - radius), bottom = Math.min(height - 1, y + radius)
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let yy = top; yy <= bottom; yy++) sum += horizontal[(yy * width + x) * 4 + c]
      output[(y * width + x) * 4 + c] = Math.round(sum / (bottom - top + 1))
    }
  }
  return output
}

it('fast erasures match the original blur at large radii and clipped polygon edges', () => {
  vi.stubGlobal('ImageData', Pixels)
  let seed = 17
  const pixels = Uint8ClampedArray.from({ length: 31 * 23 * 4 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed >>> 24
  })
  const source = new ImageData(pixels, 31, 23)
  for (const polygon of [
    [{x:4,y:3},{x:29,y:5},{x:24,y:19},{x:6,y:16}],
    [{x:-5,y:-8},{x:40,y:0},{x:32,y:30},{x:-3,y:20}],
  ]) for (const radius of [1, 7, 30]) {
    expect(blurPolygon(source, polygon, radius).data).toEqual(referenceBlur(source, polygon, radius))
  }
  expect(source.data).toEqual(pixels)
})
