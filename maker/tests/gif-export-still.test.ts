import { afterEach, expect, it, vi } from 'vitest'
import { decodeGifFrames, encodeGif, type GifFrame } from '../src/lib/gif'
import { exportEditableSource, STILL_GIF_DELAY_MS } from '../src/lib/gif-export'
import type { TimedEdits } from '../src/lib/timeline'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}

const empty: TimedEdits = { blocks: [], freeTexts: [], selectedId: null }

/** Enough of a 2D canvas for the exporter's put/get/scale path (no text layers here). */
function canvasFactory(): HTMLCanvasElement {
  let pixels: ImageData | undefined
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      putImageData: (data: ImageData) => { pixels = data },
      getImageData: () => {
        if (!pixels) throw new Error('canvas has no pixels')
        return pixels
      },
      save: () => {},
      restore: () => {},
      scale: () => {},
    }),
  }
  return canvas as unknown as HTMLCanvasElement
}

async function expectGif(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const header = new TextDecoder('latin1').decode(bytes.subarray(0, 6))
  expect(blob.type).toBe('image/gif')
  expect(header).toMatch(/^GIF8[79]a$/)
  expect(blob.size).toBeLessThan(500_000)
  return decodeGifFrames(bytes)
}

function pixels(width: number, height: number, paint: (data: Uint8ClampedArray) => void): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  paint(data)
  return new ImageData(data, width, height)
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('exports a still PNG/WebP-style imageData as a real single-frame GIF with its colours and transparency', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const source = pixels(2, 1, data => {
    data.set([232, 53, 42, 255, 0, 0, 0, 0])
  })
  const blob = await exportEditableSource({ imageData: source }, empty, {}, canvasFactory)
  const decoded = await expectGif(blob)
  expect([decoded.width, decoded.height]).toEqual([2, 1])
  expect(decoded.frames).toHaveLength(1)
  expect(decoded.frames[0].delayMs).toBe(STILL_GIF_DELAY_MS)
  expect(decoded.frames[0].imageData.data[0]).toBeGreaterThan(200)
  expect(decoded.frames[0].imageData.data[1]).toBeLessThan(80)
  expect(decoded.frames[0].imageData.data[3]).toBe(255)
  expect(decoded.frames[0].imageData.data[7]).toBe(0)
})

it('keeps small stills at their edited size and fits larger ones to a 240px long edge without letterboxing', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const small = pixels(100, 200, data => data.fill(255))
  const smallDecoded = await expectGif(await exportEditableSource({ imageData: small }, empty, {}, canvasFactory))
  expect([smallDecoded.width, smallDecoded.height]).toEqual([100, 200])

  const large = pixels(480, 240, data => {
    for (let i = 0; i < data.length; i += 4) data.set([20, 100, 200, 255], i)
  })
  const largeDecoded = await expectGif(await exportEditableSource({ imageData: large }, empty, {}, canvasFactory))
  expect([largeDecoded.width, largeDecoded.height]).toEqual([240, 120])
  expect(largeDecoded.frames).toHaveLength(1)
})

it('still uses the worker source path for animations and preserves every frame delay', async () => {
  vi.stubGlobal('ImageData', Pixels)
  const frames: GifFrame[] = [
    { imageData: pixels(4, 2, data => data.set([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0])), delayMs: 80 },
    { imageData: pixels(4, 2, data => data.set([0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0])), delayMs: 250 },
  ]
  const bytes = encodeGif(frames)
  const source = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'image/gif' })
  const decoded = await expectGif(await exportEditableSource({ source }, empty, {}, canvasFactory))
  expect([decoded.width, decoded.height]).toEqual([4, 2])
  expect(decoded.frames.map(frame => frame.delayMs)).toEqual([80, 250])
  expect(decoded.frames.reduce((sum, frame) => sum + frame.delayMs, 0)).toBe(330)
})
