import { afterEach, expect, it, vi } from 'vitest'
import { decodeGifFrames, encodeGif, type GifFrame } from '../src/lib/gif'
import {
  exportNativeSource, exportNativeStillImage, scaleEditsForSource, STILL_GIF_DELAY_MS,
} from '../src/lib/gif-export'
import { extensionForMime } from '../src/lib/paint'
import type { TimedEdits } from '../src/lib/timeline'
import type { FreeText, OcrBlock } from '../src/types'

class Pixels {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}

if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = Pixels as unknown as typeof ImageData
}

const empty: TimedEdits = { blocks: [], freeTexts: [], selectedId: null }

type Draw = { kind: 'fill' | 'stroke'; text: string; x: number; y: number; font: string; width: number }

/** A canvas with just enough drawing state for paintComposite and canvas.toBlob. */
function nativeCanvas(forceType?: string) {
  const state = {
    pixels: undefined as ImageData | undefined,
    draws: [] as Draw[],
    requested: '',
    encodedType: '',
    outputWidth: 0,
    outputHeight: 0,
  }
  const context = {
    font: '',
    lineWidth: 0,
    putImageData(data: ImageData) {
      state.pixels = data
      state.outputWidth = data.width
      state.outputHeight = data.height
      canvas.width = data.width
      canvas.height = data.height
    },
    getImageData() {
      if (!state.pixels) throw new Error('canvas has no pixels')
      return state.pixels
    },
    save() {},
    restore() {},
    scale() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    clip() {},
    fill() {},
    strokeText(text: string, x: number, y: number) {
      state.draws.push({ kind: 'stroke', text, x, y, font: context.font, width: context.lineWidth })
    },
    fillText(text: string, x: number, y: number) {
      state.draws.push({ kind: 'fill', text, x, y, font: context.font, width: context.lineWidth })
    },
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback: (blob: Blob | null) => void, mime: string) => {
      state.requested = mime
      state.encodedType = forceType ?? mime
      callback(new Blob([state.pixels?.data ?? new Uint8Array()], { type: state.encodedType }))
    },
  }
  return { canvas: canvas as unknown as HTMLCanvasElement, state }
}

function pixels(width: number, height: number, paint: (data: Uint8ClampedArray) => void): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  paint(data)
  return new ImageData(data, width, height)
}

function solid(width: number, height: number, color: [number, number, number, number]): ImageData {
  return pixels(width, height, data => {
    for (let index = 0; index < data.length; index += 4) data.set(color, index)
  })
}

function block(): OcrBlock {
  const polygon: OcrBlock['polygon'] = [
    { x: 200, y: 100 }, { x: 600, y: 100 }, { x: 600, y: 300 }, { x: 200, y: 300 },
  ]
  return {
    id: 'erase-1', originalText: '旧字', targetText: '', score: 1, polygon,
    layout: 'horizontal', enabled: true, applyLocal: true, lineRedraw: true,
    manualPolygon: [...polygon], framePolygons: [{ frame: 0, polygon }],
    textStyle: { fontFamily: 'sans-serif', fontSize: 40, fill: '#111111', strokeWidth: 2, weight: 700 },
  }
}

function freeText(): FreeText {
  return {
    id: 'free-1', text: '测', x: 800, y: 400,
    textStyle: { fontFamily: 'sans-serif', fontSize: 40, fill: '#ffffff', stroke: '#000000', strokeWidth: 2, weight: 700 },
  }
}

async function decode(blob: Blob) {
  return decodeGifFrames(new Uint8Array(await blob.arrayBuffer()))
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('maps erase boxes, glyph styles and free-text positions from the editor grid onto native pixels', () => {
  const edits: TimedEdits = { blocks: [block()], freeTexts: [freeText()], selectedId: null }
  const scaled = scaleEditsForSource(edits, 1600, 800, 2400, 1200)
  expect(scaled.blocks[0].polygon.map(point => [point.x, point.y])).toEqual([
    [300, 150], [900, 150], [900, 450], [300, 450],
  ])
  expect(scaled.blocks[0].manualPolygon?.map(point => [point.x, point.y])).toEqual([
    [300, 150], [900, 150], [900, 450], [300, 450],
  ])
  expect(scaled.blocks[0].framePolygons?.[0].polygon.map(point => [point.x, point.y])).toEqual([
    [300, 150], [900, 150], [900, 450], [300, 450],
  ])
  expect(scaled.blocks[0].textStyle.fontSize).toBe(60)
  expect(scaled.blocks[0].textStyle.strokeWidth).toBe(3)
  expect(scaled.freeTexts[0]).toMatchObject({ x: 1200, y: 600 })
  expect(scaled.freeTexts[0].textStyle).toMatchObject({ fontSize: 60, strokeWidth: 3 })
  // The original edit state must not be mutated by exporting.
  expect(edits.blocks[0].polygon[0]).toEqual({ x: 200, y: 100 })
  expect(edits.freeTexts[0]).toMatchObject({ x: 800, y: 400 })
})

it('exports a >1600 still at native size with edits on native pixels and uses the actual encoded format', async () => {
  const source = solid(2400, 1200, [200, 30, 30, 255])
  const edits: TimedEdits = { blocks: [], freeTexts: [freeText()], selectedId: null }
  const webp = nativeCanvas()
  const blob = await exportNativeStillImage(source, edits, 1600, 800, {}, () => webp.canvas, 'image/webp')
  expect(blob.type).toBe('image/webp')
  expect(webp.state.requested).toBe('image/webp')
  expect([webp.state.outputWidth, webp.state.outputHeight]).toEqual([2400, 1200])
  // The free text was authored at 800,400 on the 1600-wide preview.
  expect(webp.state.draws[0]).toMatchObject({ kind: 'stroke', x: 1200, y: 600, font: '700 60px sans-serif', width: 3 })
  expect(webp.state.draws[1]).toMatchObject({ kind: 'fill', x: 1200, y: 600 })
  // The source ImageData belongs to the editor and must remain untouched.
  expect(source.data[0]).toBe(200)
  expect(source.data[1]).toBe(30)
  expect(source.data[2]).toBe(30)

  const fallback = nativeCanvas('image/png')
  const fallbackBlob = await exportNativeStillImage(source, edits, 1600, 800, {}, () => fallback.canvas, 'image/webp')
  expect(fallbackBlob.type).toBe('image/png')
  expect(extensionForMime(fallbackBlob.type)).toBe('png')
  expect(extensionForMime('image/jpeg')).toBe('jpg')
})

it('keeps a single-frame GIF as a native-size GIF instead of shrinking it to 240', async () => {
  const frame: GifFrame = { imageData: solid(480, 240, [20, 120, 220, 255]), delayMs: STILL_GIF_DELAY_MS }
  const bytes = encodeGif([frame])
  const source = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'image/gif' })
  const canvas = nativeCanvas()
  const blob = await exportNativeSource({ mode: 'native', source, editWidth: 480, editHeight: 240 }, empty, {}, () => canvas.canvas)
  expect(blob.type).toBe('image/gif')
  const decoded = await decode(blob)
  expect([decoded.width, decoded.height]).toEqual([480, 240])
  expect(decoded.frames).toHaveLength(1)
})

it('streams a native-size animation with per-frame edits and its original delays without a 240px budget', async () => {
  const frames: GifFrame[] = [
    { imageData: solid(480, 240, [255, 0, 0, 255]), delayMs: 80 },
    { imageData: solid(480, 240, [0, 0, 255, 255]), delayMs: 250 },
  ]
  const bytes = encodeGif(frames)
  const source = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: 'image/gif' })
  const canvas = nativeCanvas()
  const progress = vi.fn()
  const edits: TimedEdits = {
    blocks: [], selectedId: null,
    segments: [{ id: 'first', start: 0, end: 1 }, { id: 'second', start: 1, end: 2 }],
    freeTexts: [{
      id: 'second-only', segmentId: 'second', text: '后', x: 120, y: 60,
      textStyle: { fontFamily: 'sans-serif', fontSize: 20, fill: '#ffffff', stroke: '#000000', strokeWidth: 1, weight: 700 },
    }],
  }
  const blob = await exportNativeSource(
    { mode: 'native', source, editWidth: 240, editHeight: 120 }, edits, { onProgress: progress }, () => canvas.canvas,
  )
  const decoded = await decode(blob)
  expect([decoded.width, decoded.height]).toEqual([480, 240])
  expect(decoded.frames.map(frame => frame.delayMs)).toEqual([80, 250])
  expect(decoded.frames.reduce((sum, frame) => sum + frame.delayMs, 0)).toBe(330)
  // The edit belongs to the second segment only and is mapped from the 240px editing grid.
  expect(canvas.state.draws).toHaveLength(2)
  expect(canvas.state.draws[0]).toMatchObject({ kind: 'stroke', x: 240, y: 120, font: '700 40px sans-serif', width: 2 })
  expect(progress).toHaveBeenLastCalledWith({ stage: 'prepare', completed: 2, total: 2 })
})
