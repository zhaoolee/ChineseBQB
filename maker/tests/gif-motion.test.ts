import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { decodeGifFrames, encodeGifAsync, type GifFrame } from '../src/lib/gif'
import { improveGifMotion } from '../src/lib/gif-motion'
import type { StickerFrame } from '../src/lib/wechat-gif'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
const palette = [[0,0,0],[255,0,0],[255,255,255]]
beforeEach(() => vi.stubGlobal('ImageData',Pixels))
afterEach(() => vi.unstubAllGlobals())

function fixture(): GifFrame[] {
  return Array.from({length:12}, (_, frame) => {
    let seed = frame + 1
    const data = new Uint8ClampedArray(16 * 8 * 4)
    for (let p = 0; p < 16 * 8; p++) {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0
      data.set([...palette[(seed >>> 24) % 3],255],p * 4)
    }
    return {imageData:new ImageData(data,16,8),delayMs:30}
  })
}
const plan: StickerFrame[] = [0,3,4,5,8,11].map((index,k,indices) => ({index,delayMs:((indices[k+1] ?? 12) - index) * 30}))
async function encoded(frames: GifFrame[], selected: StickerFrame[]) {
  async function* stream() { for (const item of selected) yield {imageData:frames[item.index].imageData,delayMs:item.delayMs} }
  return encodeGifAsync(stream(),{globalPalette:palette})
}

it('fits more genuine source frames without changing their pixels, caption boundaries or maximum hold', async () => {
  const frames = fixture(), baseline = await encoded(frames,plan)
  const full = await encoded(frames,frames.map((_,index) => ({index,delayMs:30})))
  const maxBytes = Math.floor((baseline.length + full.length) / 2)
  const progress = vi.fn()
  const result = improveGifMotion(frames,plan,palette,baseline,{maxBytes,pinned:[0,4,5,11],onProgress:progress})
  const decoded = decodeGifFrames(result)
  expect(result.length).toBeLessThan(maxBytes)
  expect(decoded.frames.length).toBeGreaterThan(plan.length)
  expect(decoded.frames.length).toBeLessThan(frames.length)
  expect([decoded.width,decoded.height]).toEqual([16,8])
  let time = 0
  const starts: number[] = []
  for (const frame of decoded.frames) {
    starts.push(time)
    expect(frame.imageData.data).toEqual(frames[time / 30].imageData.data)
    expect(frame.delayMs).toBeLessThanOrEqual(90)
    time += frame.delayMs
  }
  expect(starts).toEqual(expect.arrayContaining([0,120,150,330]))
  expect(time).toBe(360)
  expect(progress).toHaveBeenLastCalledWith(12,12)
})

it('returns the accepted baseline when the budget cannot hold a denser plan', async () => {
  const frames = fixture(), baseline = await encoded(frames,plan)
  expect(improveGifMotion(frames,plan,palette,baseline,{maxBytes:baseline.length+1,pinned:[0,4,5,11]})).toBe(baseline)
})

it('does not inflate smoothness by adding identical pictures', async () => {
  const frames = fixture().map((frame,_,all) => ({...frame,imageData:all[0].imageData}))
  const baseline = await encoded(frames,plan)
  expect(improveGifMotion(frames,plan,palette,baseline,{maxBytes:500_000,pinned:[0,11]})).toBe(baseline)
})

it('skips long or split plans before reading native pixels', () => {
  const frames = Array.from({length:20}, () => ({delayMs:30,get imageData(): ImageData { throw new Error('must remain lazy') }}))
  const baseline = new Uint8Array([1,2,3])
  expect(improveGifMotion(frames,[{index:0,delayMs:570},{index:19,delayMs:30}],palette,baseline,{maxBytes:500_000,pinned:[]})).toBe(baseline)
  expect(improveGifMotion(frames,[{index:0,delayMs:655350},{index:0,delayMs:100},{index:19,delayMs:30}],palette,baseline,{maxBytes:500_000,pinned:[]})).toBe(baseline)
})
