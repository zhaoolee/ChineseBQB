import { afterEach, describe, expect, it, vi } from 'vitest'
import * as gif from '../src/lib/gif'
import { encodeWechatGif, stickerBounds, stickerFramePlan, WECHAT_GIF_MAX_BYTES, type StickerFrame } from '../src/lib/wechat-gif'
import type { TimedEdits } from '../src/lib/timeline'
import type { OcrBlock } from '../src/types'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
const empty: TimedEdits = { blocks: [], freeTexts: [], selectedId: null }
const frame = (delayMs = 100): gif.GifFrame => ({ imageData: new Pixels(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1) as ImageData, delayMs })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('WeChat GIF export profile', () => {
  it('fits landscape and portrait inside an exact square without cropping or stretching', () => {
    expect(stickerBounds(420, 220)).toEqual({ x: 0, y: 57, width: 240, height: 126 })
    expect(stickerBounds(100, 200)).toEqual({ x: 60, y: 0, width: 120, height: 240 })
    expect(stickerBounds(240, 240)).toEqual({ x: 0, y: 0, width: 240, height: 240 })
  })

  it('preserves a single-frame subtitle, blank transition, segment boundary and total duration', () => {
    const frames = [40, 80, 30, 200, 50, 60, 90, 100].map(frame)
    const edits: TimedEdits = { ...empty,
      blocks: [{ startFrame: 1, endFrame: 2 } as OcrBlock],
      segments: [{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 5, end: 8 }],
    }
    const plan = stickerFramePlan(frames, edits, Infinity)
    expect(plan.map(f => f.index)).toEqual([0, 1, 2, 5, 7])
    expect(plan.map(f => f.delayMs)).toEqual([40, 80, 280, 150, 100])
    expect(plan.reduce((n, f) => n + f.delayMs, 0)).toBe(650)
  })

  it('splits long holds within GIF delay limits instead of overflowing a 16-bit field', () => {
    const frames = [400_000, 400_000, 400_000, 100].map(frame)
    const plan = stickerFramePlan(frames, empty, Infinity)
    expect(plan.every(f => f.delayMs <= 655_350 && f.delayMs > 0)).toBe(true)
    expect(plan.reduce((n, f) => n + f.delayMs, 0)).toBe(1_200_100)
  })

  it('encodes infinite looping and transparent full frames at reduced palette sizes', async () => {
    vi.stubGlobal('ImageData', Pixels)
    async function* frames() {
      for (const [pixel, delayMs] of [[0, 80], [1, 250]]) {
        const rgba = new Uint8ClampedArray(8)
        rgba[pixel * 4] = 255
        rgba[pixel * 4 + 3] = 255
        yield { imageData: new ImageData(rgba, 2, 1), delayMs }
      }
    }
    const bytes = await gif.encodeGifAsync(frames(), { maxColors: 8 })
    const extension = new TextDecoder('latin1').decode(bytes).indexOf('NETSCAPE2.0')
    expect(extension).toBeGreaterThan(0)
    expect(Array.from(bytes.slice(extension + 11, extension + 16))).toEqual([3, 1, 0, 0, 0])
    const decoded = gif.decodeGifFrames(bytes)
    expect(decoded.frames.map(f => f.delayMs)).toEqual([80, 250])
    expect(decoded.frames[1].imageData.data[3]).toBe(0)
    expect(decoded.frames[1].imageData.data[7]).toBe(255)
  })

  it('stops an oversized stream early and closes its producer', async () => {
    let closed = false
    let produced = 0
    async function* frames() {
      try { for (let i = 0; i < 200; i++) { produced++; yield frame() } }
      finally { closed = true }
    }
    await expect(gif.encodeGifAsync(frames(), { maxBytes: 100 })).rejects.toBeInstanceOf(gif.GifSizeLimitError)
    expect(produced).toBeLessThan(200)
    expect(closed).toBe(true)
  })

  it('automatically fits noisy animation under the byte limit without losing cue changes or time', async () => {
    vi.stubGlobal('ImageData', Pixels)
    const frames = Array.from({ length: 24 }, (_, i) => frame(50 + i * 10))
    const edits: TimedEdits = { ...empty, blocks: [{ startFrame: 3, endFrame: 4 } as OcrBlock] }
    let attempts = 0
    let lastPlan: StickerFrame[] = []
    async function* render(plan: StickerFrame[]) {
      attempts++
      lastPlan = plan
      for (const f of plan) {
        let seed = f.index + 1
        const data = new Uint8ClampedArray(240 * 240 * 4)
        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data[i + c] = seed >>> 24 }
          data[i + 3] = 255
        }
        yield { imageData: new ImageData(data, 240, 240), delayMs: f.delayMs }
      }
    }
    const blob = await encodeWechatGif(frames, edits, render)
    expect(attempts).toBeGreaterThan(1)
    expect(blob.size).toBeLessThan(WECHAT_GIF_MAX_BYTES)
    expect(blob.type).toBe('image/gif')
    expect(lastPlan.map(f => f.index)).toEqual(expect.arrayContaining([0, 3, 4, 23]))
    const decoded = gif.decodeGifFrames(new Uint8Array(await blob.arrayBuffer()))
    expect([decoded.width, decoded.height]).toEqual([240, 240])
    expect(decoded.frames.length).toBeGreaterThan(1)
    expect(decoded.frames.reduce((n, f) => n + f.delayMs, 0)).toBe(frames.reduce((n, f) => n + f.delayMs, 0))
  }, 15_000)

  it('fails explicitly when all compression attempts exceed the budget and preserves real errors', async () => {
    const encode = vi.spyOn(gif, 'encodeGifAsync').mockRejectedValue(new gif.GifSizeLimitError())
    async function* render() { yield frame() }
    await expect(encodeWechatGif([frame(), frame()], empty, render)).rejects.toThrow('仍超过 500KB')
    encode.mockRejectedValue(new Error('canvas readback failed'))
    await expect(encodeWechatGif([frame(), frame()], empty, render)).rejects.toThrow('canvas readback failed')
  })
})
