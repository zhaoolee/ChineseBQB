import { expect, it } from 'vitest'
import { GIFEncoder } from 'gifenc'
import { createEditableGifFrames } from '../src/lib/gif'
import { mp4EncodingArgs, mp4Manifest, mp4OpaquePixels, mp4Timing } from '../src/lib/mp4-export'
import { wechatPreparationPlan } from '../src/lib/gif-export'

if (typeof ImageData === 'undefined') {
  globalThis.ImageData = class {
    constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
  } as unknown as typeof ImageData
}

it('defaults to compatible YUV420 and only enables RGB lossless with an explicit choice', () => {
  const compatible = mp4EncodingArgs(10)
  expect(compatible).toContain('libx264')
  expect(compatible).toContain('yuv420p')
  expect(compatible).toContain('bt709')
  expect(compatible).not.toContain('libx264rgb')
  expect(compatible.join(' ')).toContain('pad=ceil(iw/2)*2:ceil(ih/2)*2')
  const lossless = mp4EncodingArgs(10, true)
  expect(lossless).toContain('libx264rgb')
  expect(lossless).toContain('rgb24')
  expect(lossless[lossless.indexOf('-crf') + 1]).toBe('0')
  expect(lossless.join(' ')).not.toContain('pad=')
})

it('keeps unequal frame holds, including 10ms and the final hold, on an exact clock', () => {
  const delays = [10, 70, 130]
  expect(mp4Timing(delays)).toEqual({ tickMs: 10, durationMs: 210, samples: 21, rate: '1000/10' })
  const manifest = mp4Manifest(delays)
  expect(manifest.match(/file frame-0.png/g)).toHaveLength(1)
  expect(manifest.match(/file frame-1.png/g)).toHaveLength(7)
  expect(manifest.match(/file frame-2.png/g)).toHaveLength(13)
  expect(mp4Timing([90, 150]).tickMs).toBe(30)
  expect(mp4Timing([100]).samples).toBe(1)
  for (const invalid of [[], [0], [-10], [NaN], [15]]) expect(() => mp4Timing(invalid)).toThrow('时序无效')
})

it('refuses to lose alpha silently and only mattes with an explicit choice', () => {
  const opaque = new ImageData(new Uint8ClampedArray([13, 101, 209, 255]), 1, 1)
  expect(mp4OpaquePixels(opaque, false)).toBe(opaque)
  const pixels = new ImageData(new Uint8ClampedArray([13, 101, 209, 255, 15, 25, 35, 0, 0, 100, 200, 128]), 3, 1)
  expect(() => mp4OpaquePixels(pixels, false)).toThrow('透明区域')
  expect([...mp4OpaquePixels(pixels, true).data]).toEqual([13, 101, 209, 255, 255, 255, 255, 255, 127, 177, 227, 255])
  expect(pixels.data[7]).toBe(0)
})

it('retains every original frame and delay in the editor and export source', () => {
  const encoder = GIFEncoder()
  for (let i = 0; i < 201; i++) encoder.writeFrame(new Uint8Array([i % 2]), 1, 1, {
    palette: [[13, 101, 209], [246, 28, 87]], delay: i === 0 ? 10 : 100,
  })
  encoder.finish()
  const bytes = encoder.bytes()
  const full = createEditableGifFrames(bytes)
  expect(full.frames).toHaveLength(201)
  expect(full.frames[0].delayMs).toBe(10)
  expect(full.limited).toBe(false)
  for (let i = 0; i < full.frames.length; i++) {
    expect([...full.frames[i].imageData.data]).toEqual(i % 2 ? [246, 28, 87, 255] : [13, 101, 209, 255])
  }
})

it('limits preparation only in the WeChat path and preserves subtitle boundaries and duration', () => {
  const frames = Array.from({ length: 401 }, () => ({ imageData: null as unknown as ImageData, delayMs: 30 }))
  const edits = { blocks: [], freeTexts: [], selectedId: null,
    segments: [{ id: 'first', start: 0, end: 101 }, { id: 'second', start: 101, end: 401 }] }
  const prepared = wechatPreparationPlan(frames, edits)
  expect(prepared.plan.length).toBeLessThan(200)
  expect(prepared.plan.map(frame => frame.index)).toContain(101)
  expect(prepared.plan.at(-1)?.index).toBe(400)
  expect(prepared.plan.reduce((sum, frame) => sum + frame.delayMs, 0)).toBe(12_030)
  expect(prepared.plan[prepared.edits.segments![1].start].index).toBe(101)
  expect(prepared.edits.segments![1].end).toBe(prepared.plan.length)
  expect(frames).toHaveLength(401)
  expect(edits.segments[1].start).toBe(101)
})
