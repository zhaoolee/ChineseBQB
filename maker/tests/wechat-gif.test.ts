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
const block = (originalText: string, targetText: string, startFrame: number, endFrame: number, enabled = true): OcrBlock =>
  ({ id: `${startFrame}-${endFrame}`, originalText, targetText, enabled, startFrame, endFrame } as OcrBlock)
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('WeChat GIF export profile', () => {
  it('fits landscape and portrait inside an exact square without cropping or stretching', () => {
    expect(stickerBounds(420, 220)).toEqual({ x: 0, y: 57, width: 240, height: 126 })
    expect(stickerBounds(100, 200)).toEqual({ x: 60, y: 0, width: 120, height: 240 })
    expect(stickerBounds(240, 240)).toEqual({ x: 0, y: 0, width: 240, height: 240 })
    expect(stickerBounds(300, 231, 96)).toEqual({ x: 0, y: 11, width: 96, height: 74 })
  })

  it('preserves a single-frame subtitle, blank transition, segment boundary and total duration', () => {
    const frames = [40, 80, 30, 200, 50, 60, 90, 100].map(frame)
    const edits: TimedEdits = { ...empty,
      blocks: [block('旧字幕', '新字幕', 1, 2)],
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

  it('reduces motion in small steps without losing the final frame or time', () => {
    const frames = Array.from({ length: 10 }, (_, index) => frame(index % 2 ? 40 : 30))
    const mild = stickerFramePlan(frames, empty, 1.25)
    const stronger = stickerFramePlan(frames, empty, 1.5)
    expect(mild.map(item => item.index)).toEqual([0, 1, 2, 3, 5, 6, 7, 8, 9])
    expect(stronger.length).toBeLessThan(mild.length)
    expect(mild.length).toBeLessThan(frames.length)
    expect(mild.reduce((sum, item) => sum + item.delayMs, 0)).toBe(350)
    expect(stronger.at(-1)?.index).toBe(9)
    expect(stronger.reduce((sum, item) => sum + item.delayMs, 0)).toBe(350)
  })

  it('does not pin frames for untouched, deleted, or disabled OCR blocks', () => {
    const frames = Array.from({ length: 115 }, () => frame(30))
    const edits: TimedEdits = { ...empty, blocks: frames.map((_, index) => {
      if (index % 3 === 0) return block('原字幕', '原字幕', index, index + 1)
      if (index % 3 === 1) return block('原字幕', '', index, index + 1)
      return block('原字幕', '改字幕', index, index + 1, false)
    }) }
    const plan = stickerFramePlan(frames, edits, Infinity)
    expect(plan.map(f => f.index)).toEqual([0, 114])
    expect(plan.length).toBeLessThan(65)
    expect(plan.reduce((sum, f) => sum + f.delayMs, 0)).toBe(3450)
  })

  it('keeps start and end boundaries for a visible one-frame caption edit', () => {
    const frames = Array.from({ length: 12 }, () => frame(30))
    const edits: TimedEdits = { ...empty, blocks: [
      block('旧字幕', '', 1, 2),
      block('旧字幕', '新字幕', 3, 4),
      block('旧字幕', '旧字幕', 5, 6),
      block('旧字幕', '新字幕', 7, 8, false),
    ] }
    const plan = stickerFramePlan(frames, edits, Infinity)
    expect(plan.map(f => f.index)).toEqual([0, 3, 4, 11])
    expect(plan.reduce((sum, f) => sum + f.delayMs, 0)).toBe(360)
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
    const frames = Array.from({ length: 8 }, (_, i) => frame(50 + i * 10))
    const edits: TimedEdits = { ...empty, blocks: [block('旧字幕', '新字幕', 3, 4)] }
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
    expect(lastPlan.map(f => f.index)).toEqual(expect.arrayContaining([0, 3, 4, 7]))
    const decoded = gif.decodeGifFrames(new Uint8Array(await blob.arrayBuffer()))
    expect([decoded.width, decoded.height]).toEqual([240, 240])
    expect(decoded.frames.length).toBeGreaterThan(1)
    expect(decoded.frames.reduce((n, f) => n + f.delayMs, 0)).toBe(frames.reduce((n, f) => n + f.delayMs, 0))
  }, 60_000)

  it('fails explicitly when all compression attempts exceed the budget and preserves real errors', async () => {
    const encode = vi.spyOn(gif, 'encodeGifAsync').mockRejectedValue(new gif.GifSizeLimitError())
    async function* render() { yield frame() }
    await expect(encodeWechatGif([frame(), frame()], empty, render)).rejects.toThrow('仍超过 500KB')
    encode.mockRejectedValue(new Error('canvas readback failed'))
    await expect(encodeWechatGif([frame(), frame()], empty, render)).rejects.toThrow('canvas readback failed')
  })

  it('shrinks dense protected subtitles instead of exhausting palette and frame thinning', async () => {
    vi.stubGlobal('ImageData', Pixels)
    const frames = Array.from({ length: 115 }, () => frame(30))
    // A visible caption edit on every frame protects every boundary.
    const edits: TimedEdits = { ...empty, blocks: frames.map((_, index) => block('原字幕', '新字幕', index, index + 1)) }
    const tried: { edge: number; maxColors: number; plan: string }[] = []
    const originalEncode = gif.encodeGifAsync
    let pending: { edge: number; plan: string } | null = null
    vi.spyOn(gif, 'encodeGifAsync').mockImplementation(async (stream, options) => {
      const producer = stream[Symbol.asyncIterator]()
      const first = await producer.next()
      if (!pending) throw new Error('render did not start')
      tried.push({ edge: pending.edge, maxColors: options?.maxColors ?? 0, plan: pending.plan })
      if (pending.edge > 96) {
        await producer.return?.(undefined)
        throw new gif.GifSizeLimitError()
      }
      async function* complete() {
        if (!first.done) yield first.value
        for (;;) {
          const next = await producer.next()
          if (next.done) return
          yield next.value
        }
      }
      return originalEncode(complete(), options)
    })
    let finalPlan: StickerFrame[] = []
    async function* render(plan: StickerFrame[], edge: number) {
      pending = { edge, plan: plan.map(item => `${item.index},${item.delayMs}`).join(';') }
      finalPlan = plan
      for (const item of plan) {
        const data = new Uint8ClampedArray(edge * edge * 4).fill(255)
        // Different pixels on each frame let the round trip distinguish every cue.
        data[0] = item.index % 2 ? 0 : 255
        yield { imageData: new ImageData(data, edge, edge), delayMs: item.delayMs }
      }
    }
    const blob = await encodeWechatGif(frames, edits, render)
    expect(blob.size).toBeLessThan(WECHAT_GIF_MAX_BYTES)
    expect(tried.length).toBe(new Set(tried.map(item => `${item.edge}:${item.maxColors}:${item.plan}`)).size)
    const decoded = gif.decodeGifFrames(new Uint8Array(await blob.arrayBuffer()))
    expect([decoded.width, decoded.height]).toEqual([96, 96])
    expect(finalPlan.map(item => item.index)).toEqual(frames.map((_, index) => index))
    expect(decoded.frames).toHaveLength(115)
    expect(decoded.frames.reduce((sum, item) => sum + item.delayMs, 0)).toBe(3450)
  })

  it('tries low-fps 240px profiles before any smaller edge', async () => {
    const frames = Array.from({ length: 30 }, () => frame(40))
    const attempts: { edge: number; maxColors: number; indices: number[] }[] = []
    let pending: { edge: number; indices: number[] } | null = null
    vi.spyOn(gif, 'encodeGifAsync').mockImplementation(async (stream, options) => {
      const producer = stream[Symbol.asyncIterator]()
      await producer.next()
      if (!pending) throw new Error('render did not start')
      attempts.push({ ...pending, maxColors: options?.maxColors ?? 0 })
      if (pending.edge === 240) {
        await producer.return?.(undefined)
        throw new gif.GifSizeLimitError()
      }
      return new Uint8Array([71, 73, 70])
    })
    async function* render(plan: StickerFrame[], edge: number) {
      pending = { edge, indices: plan.map(item => item.index) }
      yield frame(plan[0]?.delayMs)
    }
    const blob = await encodeWechatGif(frames, empty, render)
    expect(blob.size).toBeLessThan(WECHAT_GIF_MAX_BYTES)
    const firstSmall = attempts.findIndex(item => item.edge < 240)
    expect(firstSmall).toBeGreaterThan(0)
    expect(attempts[firstSmall].edge).toBe(224)
    const beforeShrink = attempts.slice(0, firstSmall)
    expect(beforeShrink.every(item => item.edge === 240)).toBe(true)
    expect(beforeShrink.some(item => item.maxColors === 256)).toBe(true)
    expect(beforeShrink.some(item => item.maxColors <= 64)).toBe(true)
    expect(beforeShrink.some(item => item.indices.length < frames.length)).toBe(true)
    expect(attempts.filter(item => item.edge < 224)).toHaveLength(0)
  })

  it('downloads the first fitting high-quality result without trying lower profiles', async () => {
    const encode = vi.spyOn(gif, 'encodeGifAsync').mockResolvedValue(new Uint8Array([71, 73, 70]))
    async function* render() { yield frame() }
    await encodeWechatGif([frame(), frame()], empty, render)
    expect(encode).toHaveBeenCalledOnce()
    expect(encode).toHaveBeenCalledWith(expect.anything(), { maxColors: 256, maxBytes: WECHAT_GIF_MAX_BYTES })
  })

  it('keeps the native 240px plan when the first profile already fits', async () => {
    vi.stubGlobal('ImageData', Pixels)
    const frames = Array.from({ length: 4 }, () => frame(80))
    const renders: { edge: number; indices: number[] }[] = []
    async function* render(plan: StickerFrame[], edge: number) {
      renders.push({ edge, indices: plan.map(item => item.index) })
      for (const item of plan) {
        const data = new Uint8ClampedArray(edge * edge * 4)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = item.index * 40
          data[i + 3] = 255
        }
        yield { imageData: new ImageData(data, edge, edge), delayMs: item.delayMs }
      }
    }
    const blob = await encodeWechatGif(frames, empty, render)
    expect(renders).toEqual([{ edge: 240, indices: [0, 1, 2, 3] }])
    expect(blob.size).toBeLessThan(WECHAT_GIF_MAX_BYTES)
    const decoded = gif.decodeGifFrames(new Uint8Array(await blob.arrayBuffer()))
    expect([decoded.width, decoded.height]).toEqual([240, 240])
    expect(decoded.frames).toHaveLength(4)
    expect(decoded.frames.reduce((sum, item) => sum + item.delayMs, 0)).toBe(320)
  })
})
