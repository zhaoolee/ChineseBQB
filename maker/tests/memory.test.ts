import { afterEach, describe, expect, it, vi } from 'vitest'
import { GIFEncoder } from 'gifenc'
import { decodeGifFrames, encodeGif, encodeGifAsync } from '../src/lib/gif'
import { prepareOcrInput } from '../src/lib/ocr-input'
import { scaleOcrBlocks, normalizeOcrItems } from '../src/lib/ocr'
import { exportGif } from '../src/lib/gif-export'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}
function gifFile(width: number, height: number, count: number) {
  const gif = GIFEncoder()
  for (let i = 0; i < count; i++) gif.writeFrame(new Uint8Array([0]), 1, 1, { palette: [[0,0,0],[255,255,255]], delay: 100 })
  gif.finish()
  const bytes = gif.bytes().slice()
  bytes[6] = width & 255; bytes[7] = width >> 8
  bytes[8] = height & 255; bytes[9] = height >> 8
  return bytes
}
afterEach(() => vi.unstubAllGlobals())

describe('bounded GIF processing', () => {
  it('downscales an over-budget animation while preserving frames and duration', () => {
    const sizes: number[] = []
    vi.stubGlobal('ImageData', class extends Pixels {
      constructor(data: Uint8ClampedArray, width: number, height: number) {
        super(data,width,height); sizes.push(data.byteLength)
      }
    })
    const decoded = decodeGifFrames(gifFile(1024,1024,25))
    expect(decoded.limited).toBe(true)
    expect(decoded.frames).toHaveLength(25)
    expect(decoded.frames.reduce((sum, f) => sum + f.delayMs, 0)).toBe(2500)
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(8_000_000 * 4)
    expect(decoded.width).toBeLessThan(1024)
  })
  it('rejects huge logical dimensions before allocating ImageData', () => {
    const allocation = vi.fn()
    vi.stubGlobal('ImageData', allocation)
    expect(() => decodeGifFrames(gifFile(9000,1,2))).toThrow('1600')
    expect(allocation).not.toHaveBeenCalled()
  })
  it('limits tiny animations with excessive frame counts', () => {
    vi.stubGlobal('ImageData', Pixels)
    expect(decodeGifFrames(gifFile(1,1,201))).toMatchObject({ limited:true, frames:expect.any(Array) })
    const result = decodeGifFrames(gifFile(1,1,201))
    expect(result.frames.length).toBeLessThanOrEqual(200)
    expect(result.frames.reduce((sum, frame) => sum + frame.delayMs, 0)).toBe(20_100)
  })
  it('preserves exact frame delays in synchronous and streaming exports', async () => {
    vi.stubGlobal('ImageData', Pixels)
    const frames = [80,100,250].map((delayMs) => ({ imageData: new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1),delayMs }))
    const sync = decodeGifFrames(encodeGif(frames))
    async function* stream() { yield* frames }
    const asyncResult = decodeGifFrames(await encodeGifAsync(stream()))
    expect(sync.frames.map((frame)=>frame.delayMs)).toEqual([80,100,250])
    expect(asyncResult.frames.map((frame)=>frame.delayMs)).toEqual([80,100,250])
  })
  it('clears old pixels when a later full frame has transparency', () => {
    vi.stubGlobal('ImageData', Pixels)
    const result = decodeGifFrames(encodeGif([
      {imageData:new ImageData(new Uint8ClampedArray([255,0,0,255,0,0,0,0]),2,1),delayMs:100},
      {imageData:new ImageData(new Uint8ClampedArray([0,0,0,0,0,0,255,255]),2,1),delayMs:100},
    ]))
    expect(result.frames[1].imageData.data[3]).toBe(0)
    expect(result.frames[1].imageData.data[7]).toBe(255)
  })
})

function mockCanvas(fail = false) {
  const canvases: Array<{ width:number; height:number }> = []
  const blob = new Blob(['normalized pixels'],{type:'image/png'})
  vi.stubGlobal('document',{ createElement: () => {
    const canvas = { width:0,height:0, getContext: () => ({
      putImageData() {}, drawImage() {}, getImageData: () => {
        if (fail) throw new Error('readback failed')
        return new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1)
      },
    }), toBlob: (callback:(blob:Blob|null)=>void) => callback(fail ? null : blob) }
    canvases.push(canvas)
    return canvas
  } })
  return { canvases, blob }
}

describe('canvas lifetime and OCR dimensions', () => {
  it('caps large OCR inputs and maps both axes back to editor coordinates', async () => {
    const {canvases,blob} = mockCanvas()
    const input = await prepareOcrInput({width:1600,height:1201} as ImageData)
    expect(input.blob).toBe(blob)
    expect(input.scaleX).toBe(640/1600)
    expect(input.scaleY).toBe(480/1201)
    const boxes=normalizeOcrItems([{text:'TEST',score:1,poly:[[0,0],[640,0],[640,480],[0,480]]}])
    const [mapped]=scaleOcrBlocks(boxes,input.scaleX,input.scaleY)
    expect(mapped.polygon[2]).toEqual({x:1600,y:1201})
    expect(canvases.every(c=>c.width===0&&c.height===0)).toBe(true)
  })
  it('cleans both OCR canvases even if PNG encoding fails', async () => {
    const {canvases}=mockCanvas(true)
    await expect(prepareOcrInput({width:1600,height:1200} as ImageData)).rejects.toThrow('导出失败')
    expect(canvases.every(c=>c.width===0&&c.height===0)).toBe(true)
  })
  it('reuses one canvas for GIF export and clears it afterward', async () => {
    vi.stubGlobal('ImageData',Pixels)
    const {canvases}=mockCanvas()
    const frames=[80,100].map(delayMs=>({imageData:new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1),delayMs}))
    const result=await exportGif(frames,[],[])
    expect(result.type).toBe('image/gif')
    expect(canvases).toHaveLength(1)
    expect(canvases[0]).toMatchObject({width:0,height:0})
    expect(decodeGifFrames(new Uint8Array(await result.arrayBuffer())).frames.map(f=>f.delayMs)).toEqual([80,100])
  })
  it('clears the export canvas after a failed readback', async () => {
    vi.stubGlobal('ImageData',Pixels)
    const {canvases}=mockCanvas(true)
    await expect(exportGif([{imageData:new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1),delayMs:100}],[],[])).rejects.toThrow('readback failed')
    expect(canvases[0]).toMatchObject({width:0,height:0})
  })
})
