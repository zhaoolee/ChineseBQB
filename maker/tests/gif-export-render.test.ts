import { afterEach, expect, it, vi } from 'vitest'
import * as gif from '../src/lib/gif'
import * as paint from '../src/lib/paint'
import { exportWechatSegmentedGif } from '../src/lib/gif-export'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

/** Minimal 2D context: only the calls the GIF exporter makes. */
function fakeCanvas() {
  const state = {
    pixels: undefined as ImageData | undefined,
    scales: [] as [number, number][],
    saves: 0,
    restores: 0,
    puts: 0,
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      getImageData: () => state.pixels,
      putImageData: (data: ImageData) => { state.pixels = data; state.puts++ },
      save: () => { state.saves++ },
      scale: (x: number, y: number) => { state.scales.push([x, y]) },
      restore: () => { state.restores++ },
    }),
  }
  return { canvas: canvas as unknown as HTMLCanvasElement, state }
}

it('composites each source frame once and stamps its text once on the output grid, then releases both canvases', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const reads = vi.fn()
  const frames: gif.GifFrame[] = Array.from({length:3}, (_, index) => ({
    get imageData() { reads(); return new ImageData(new Uint8ClampedArray(4 * 3 * 4).fill(index ? 255 : 0),4,3) },
    delayMs:100,
  }))
  const source = fakeCanvas()
  const output = fakeCanvas()
  const compose = vi.spyOn(paint,'paintComposite').mockImplementation((pixels, patches, _freeTexts, canvas) => {
    // The original-resolution pass erases the background only; glyphs are drawn later.
    expect(patches.every((patch) => patch.text === '')).toBe(true)
    source.state.pixels = pixels
    canvas.width = pixels.width
    canvas.height = pixels.height
  })
  const textLayers = vi.spyOn(paint,'paintTextLayers')
  const canvases = [source.canvas, output.canvas]
  const original = gif.encodeGifAsync
  let attempts = 0
  vi.spyOn(gif,'encodeGifAsync').mockImplementation(async (stream,options) => {
    attempts++
    if (attempts === 1) { for await (const _ of stream) { /* consume failed attempt */ } throw new gif.GifSizeLimitError() }
    return original(stream,options)
  })
  const progress = vi.fn()
  const result = await exportWechatSegmentedGif(frames,{blocks:[],freeTexts:[],selectedId:null},{onProgress:progress},() => canvases.shift()!)
  expect(attempts).toBeGreaterThan(1)
  expect(reads).toHaveBeenCalledTimes(3)
  // The original-resolution composite runs once per frame, no matter how many
  // palette or frame-rate attempts follow.
  expect(compose).toHaveBeenCalledTimes(3)
  // Glyphs are stamped once per frame; retries at the same edge reuse the cached
  // output pixels instead of rescaling and redrawing.
  expect(textLayers).toHaveBeenCalledTimes(3)
  // 4x3 sources need no downscale or letterboxing, so glyphs keep a 1:1 grid.
  expect(output.state.scales).toEqual([[1,1],[1,1],[1,1]])
  expect(output.state.saves).toBe(3)
  expect(output.state.restores).toBe(3)
  expect(output.state.puts).toBe(3)
  expect(source.canvas).toMatchObject({width:0,height:0})
  expect(output.canvas).toMatchObject({width:0,height:0})
  expect(progress).toHaveBeenCalledWith({stage:'prepare',completed:3,total:3})
  const decoded = gif.decodeGifFrames(new Uint8Array(await result.arrayBuffer()))
  expect([decoded.width, decoded.height]).toEqual([4,3])
  expect(decoded.frames.reduce((sum,frame) => sum + frame.delayMs,0)).toBe(300)
})

it('trains the palette on final-sized pixels including caption colours, without retaining native frame sequences', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const source = fakeCanvas(), output = fakeCanvas()
  const data = new Uint8ClampedArray(480 * 240 * 4).fill(255)
  const frames = [{imageData:new ImageData(data,480,240),delayMs:100}, {imageData:new ImageData(data,480,240),delayMs:100}]
  vi.spyOn(paint,'paintComposite').mockImplementation((pixels,_patches,_texts,canvas) => {
    source.state.pixels = pixels
    canvas.width = pixels.width; canvas.height = pixels.height
  })
  vi.spyOn(paint,'paintTextLayers').mockImplementation(() => {
    // A rare red caption must enter the palette, even on an all-white photo.
    const image = output.state.pixels!
    for (let i = 0; i < 100 * 4; i += 4) image.data.set([232,53,42,255],i)
  })
  vi.spyOn(gif,'encodeGifAsync').mockImplementation(async (stream,options) => {
    expect(options?.globalPalette?.some(color => color[0] > 220 && color[1] < 70 && color[2] < 60)).toBe(true)
    for await (const frame of stream) {
      expect([frame.imageData.width,frame.imageData.height]).toEqual([240,120])
      expect(frame.imageData.data.byteLength).toBe(240 * 120 * 4)
    }
    return new Uint8Array([71,73,70])
  })
  const canvases = [source.canvas,output.canvas]
  await exportWechatSegmentedGif(frames,{blocks:[],freeTexts:[],selectedId:null},{},() => canvases.shift()!)
  expect(output.state.scales).toEqual([[.5,.5],[.5,.5]])
  expect(source.canvas.width).toBe(0)
  expect(output.canvas.width).toBe(0)
})
