import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scanGifSubtitles } from '../src/lib/gif-subtitles'
import { blockAtFrame, closestFrameBoundary, editsAtFrame, frameTimes, splitSegment } from '../src/lib/timeline'
import { collectPatches } from '../src/lib/plan'
import { applyFills } from '../src/lib/compose'
import type { OcrBlock } from '../src/types'

class Pixels { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} }
beforeEach(() => vi.stubGlobal('ImageData', Pixels))
afterEach(() => vi.unstubAllGlobals())
const image = (n: number) => new ImageData(new Uint8ClampedArray(80 * 40 * 4).fill(n), 80, 40)
const frame = (n: number, delayMs = 100) => ({ imageData: image(n), delayMs })
const block = (text: string, y = 5, x = 2): OcrBlock => ({
  id: 'ocr', originalText: text, targetText: text, score: 0.95, enabled: true, applyLocal: false, lineRedraw: false,
  polygon: [{ x, y }, { x: x + 50, y }, { x: x + 50, y: y + 10 }, { x, y: y + 10 }], layout: 'horizontal',
  textStyle: { fontFamily: 'sans-serif', fontSize: 10, fill: '#111' },
})

describe('automatic GIF subtitle scan', () => {
  it('checks a single-frame caption, reuses only exact duplicates, and keeps blank gaps', async () => {
    const frames = [frame(1, 80), frame(1, 120), frame(2, 20), frame(3, 200), frame(1, 100)]
    const recognize = vi.fn(async (_frame, index: number) => index === 3 ? [] : [block(index === 2 ? '闪过' : '第一句')])
    const onProgress = vi.fn()
    const result = await scanGifSubtitles(frames, recognize, { onProgress })
    expect(recognize.mock.calls.map(call => call[1])).toEqual([0, 2, 3, 4])
    expect(result.blocks.map(cue => [cue.originalText, cue.startFrame, cue.endFrame])).toEqual([
      ['第一句', 0, 2], ['闪过', 2, 3], ['第一句', 4, 5],
    ])
    expect(result.blocks[0].framePolygons).toHaveLength(2)
    expect(onProgress).toHaveBeenLastCalledWith({ completed: 5, total: 5, recognized: 4 })
    expect(frameTimes(frames).total).toBe(520)
  })

  it('matches concurrent identical lines by location even when OCR order swaps', async () => {
    const result = await scanGifSubtitles([frame(1), frame(2)], async (_frame, index) => index
      ? [block('相同文字', 24, 4), block('相同文字', 6, 3)]
      : [block('相同文字', 5), block('相同文字', 25)])
    expect(result.blocks).toHaveLength(2)
    expect(result.blocks.map(cue => cue.endFrame)).toEqual([2, 2])
    expect(blockAtFrame(result.blocks[0], 1).polygon[0]).toEqual({ x: 3, y: 6 })
    expect(blockAtFrame(result.blocks[1], 1).polygon[0]).toEqual({ x: 4, y: 24 })
  })

  it('does not merge far-away text merely because its characters match', async () => {
    const result = await scanGifSubtitles([frame(1), frame(2)], async (_frame, index) => [block('字幕', index ? 28 : 2)])
    expect(result.blocks).toHaveLength(2)
    expect(result.blocks.map(cue => [cue.startFrame, cue.endFrame])).toEqual([[0, 1], [1, 2]])
  })

  it('rejects stale OCR before publishing either cues or late progress', async () => {
    let current = true
    let finish!: (blocks: OcrBlock[]) => void
    const progress = vi.fn()
    const pending = scanGifSubtitles([frame(1)], () => new Promise(resolve => { finish = resolve }), {
      isCurrent: () => current, onProgress: progress,
    })
    current = false
    finish([block('不能应用')])
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(progress).toHaveBeenCalledOnce()
  })

  it('does not mutate the OCR observations or retain any image pixels in cue metadata', async () => {
    const observation = block('原文')
    const before = JSON.stringify(observation)
    const result = await scanGifSubtitles([frame(1), frame(1)], async () => [observation])
    expect(JSON.stringify(observation)).toBe(before)
    expect(JSON.stringify(result.blocks)).not.toContain('imageData')
    expect(JSON.stringify(result.blocks)).not.toContain('delayMs')
  })
})

describe('subtitle preview/export time boundaries', () => {
  it('removes a complete caption on a flat background instead of leaving blurred lettering', () => {
    const pixels = image(255)
    for (let y = 8; y < 13; y += 1) for (let x = 8; x < 45; x += 1) {
      const offset = (y * pixels.width + x) * 4
      pixels.data.set([0, 0, 0, 255], offset)
    }
    const outside = (30 * pixels.width + 70) * 4
    pixels.data.set([0, 0, 0, 255], outside)
    const cue = { ...block('删除这句'), startFrame: 0, endFrame: 1, targetText: '', applyLocal: true }
    const patches = collectPatches([cue], pixels)
    expect(patches).toHaveLength(1)
    expect(patches[0].blur).toBe(false)
    const result = applyFills(pixels, patches)
    expect(result.data[(10 * pixels.width + 15) * 4]).toBe(255)
    expect(result.data[outside]).toBe(0)
  })

  it('filters the same half-open range for both preview and GIF export, while following frame positions', async () => {
    const frames = [frame(1, 80), frame(2, 120), frame(3, 200)]
    const result = await scanGifSubtitles(frames, async (_frame, index) => index ? [block('字幕', 5 + index)] : [])
    const cue = { ...result.blocks[0], targetText: '', applyLocal: true }
    const edits = { blocks: [cue], freeTexts: [], selectedId: cue.id }
    expect(editsAtFrame(edits, 0).blocks).toHaveLength(0)
    expect(editsAtFrame(edits, 1).blocks).toHaveLength(1)
    expect(editsAtFrame(edits, 2).blocks[0].polygon[0].y).toBe(7)
    expect(editsAtFrame(edits, 3).blocks).toHaveLength(0)
    expect(collectPatches(editsAtFrame(edits, 0).blocks, frames[0].imageData)).toHaveLength(0)
    expect(collectPatches(editsAtFrame(edits, 2).blocks, frames[2].imageData).length).toBeGreaterThan(0)
    expect(closestFrameBoundary(frames, 190)).toBe(2)
    expect(closestFrameBoundary(frames, 400)).toBe(3)
  })

  it('splits a recognized cue into independently editable ranges at the playhead', async () => {
    const { blocks } = await scanGifSubtitles([frame(1), frame(1), frame(1)], async () => [block('第一句')])
    const original = { blocks, freeTexts: [], selectedId: blocks[0].id, segments: [{ id: 'whole', start: 0, end: 3 }] }
    const split = splitSegment(original, 1, 'right')
    const next = { ...split, blocks: split.blocks.map(cue => cue.startFrame === 1 ? { ...cue, targetText: '第二句' } : cue) }
    expect(editsAtFrame(next, 0).blocks[0].targetText).toBe('第一句')
    expect(editsAtFrame(next, 1).blocks[0].targetText).toBe('第二句')
    expect(original.blocks[0].endFrame).toBe(3)
    expect(split.blocks.map(cue => cue.framePolygons?.length)).toEqual([1, 2])
  })
})
