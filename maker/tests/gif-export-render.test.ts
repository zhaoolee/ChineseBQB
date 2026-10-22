import { afterEach, expect, it, vi } from 'vitest'
import * as gif from '../src/lib/gif'
import * as paint from '../src/lib/paint'
import { exportWechatSegmentedGif } from '../src/lib/gif-export'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('renders native erasures once per source frame across multiple compression attempts and releases its canvas', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const reads = vi.fn()
  const frames: gif.GifFrame[] = Array.from({length:3}, (_, index) => ({
    get imageData() { reads(); return new ImageData(new Uint8ClampedArray(4 * 3 * 4).fill(index ? 255 : 0),4,3) },
    delayMs:100,
  }))
  let current: ImageData
  const canvas = { width:0, height:0, getContext: () => ({getImageData: () => current}) } as unknown as HTMLCanvasElement
  const compose = vi.spyOn(paint,'paintComposite').mockImplementation((pixels) => {
    current = pixels; canvas.width = pixels.width; canvas.height = pixels.height
  })
  const original = gif.encodeGifAsync
  let attempts = 0
  vi.spyOn(gif,'encodeGifAsync').mockImplementation(async (stream,options) => {
    attempts++
    if (attempts === 1) { for await (const _ of stream) { /* consume failed attempt */ } throw new gif.GifSizeLimitError() }
    return original(stream,options)
  })
  const progress = vi.fn()
  const result = await exportWechatSegmentedGif(frames,{blocks:[],freeTexts:[],selectedId:null},{onProgress:progress},() => canvas)
  expect(attempts).toBe(2)
  expect(reads).toHaveBeenCalledTimes(3)
  expect(compose).toHaveBeenCalledTimes(3)
  expect(canvas).toMatchObject({width:0,height:0})
  expect(progress).toHaveBeenCalledWith({stage:'prepare',completed:3,total:3})
  const decoded = gif.decodeGifFrames(new Uint8Array(await result.arrayBuffer()))
  expect([decoded.width, decoded.height]).toEqual([4,3])
  expect(decoded.frames.reduce((sum,frame) => sum + frame.delayMs,0)).toBe(300)
})
