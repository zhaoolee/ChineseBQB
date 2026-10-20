import { describe, expect, it } from 'vitest'
import { cellAnchorPolygon, cellWasAdded, charRangeToPolygon, targetGraphemePolygons } from '../src/lib/char-layout'
import { diffText } from '../src/lib/diff'
import { polygonBounds } from '../src/lib/geometry'
import { segmentGraphemes } from '../src/lib/grapheme'
import { activePatches, planBlockEdit } from '../src/lib/plan'
import type { OcrBlock } from '../src/types'

function line(originalText: string, targetText: string, left = 120): OcrBlock {
  const right = left + segmentGraphemes(originalText).length * 40
  return {
    id: 'prefix', originalText, targetText, score: 1, enabled: true, applyLocal: true,
    layout: 'horizontal', lineRedraw: false,
    polygon: [{ x: left, y: 60 }, { x: right, y: 60 }, { x: right, y: 100 }, { x: left, y: 100 }],
    textStyle: { fontFamily: 'sans-serif', fontSize: 32, fill: '#ffffff', weight: 700 },
  }
}

describe('text added at the start of a line', () => {
  it('expands a leading replacement toward the left, leaving the unchanged suffix in place', () => {
    const block = line('我从不失恋', '老娘从不失恋')
    expect(diffText(block.originalText, block.targetText)).toMatchObject([
      { kind: 'insert', newText: '老', oldStart: 0, oldEnd: 0, newStart: 0, newEnd: 1 },
      { kind: 'replace', oldText: '我', newText: '娘', oldStart: 0, oldEnd: 1, newStart: 1, newEnd: 2 },
    ])
    const polygons = targetGraphemePolygons(block, 600, 180)
    expect(polygonBounds(polygons[0]).maxX).toBeLessThan(120)
    expect(polygons[1]).toEqual(charRangeToPolygon(block, 0, 1))
    for (let index = 2; index < polygons.length; index += 1) {
      expect(polygons[index]).toEqual(charRangeToPolygon(block, index - 1, index))
    }
    const patches = activePatches(block, planBlockEdit(block, null))
    expect(patches.map(patch => patch.text)).toEqual(['老', '娘'])
    expect(patches[0]).toMatchObject({ textOnly: true })
    expect(polygonBounds(patches[0].polygon).maxX).toBeLessThan(polygonBounds(patches[1].polygon).minX)
    expect(patches[0].polygon).toEqual(polygons[0])
    expect(patches[1].textOnly).toBe(false)
  })

  it.each(['老', '老娘', '老娘我', '🐱你好'])('keeps the prefix %s together and in reading order', prefix => {
    const block = line('从不失恋', `${prefix}从不失恋`)
    const parts = segmentGraphemes(prefix)
    const polygons = targetGraphemePolygons(block, 600, 180)
    const patches = activePatches(block, planBlockEdit(block, null))
    expect(patches.map(patch => patch.text)).toEqual(parts)
    for (let index = 0; index < parts.length; index += 1) {
      const bounds = polygonBounds(polygons[index])
      expect(bounds.minX).toBeGreaterThanOrEqual(0)
      expect(bounds.maxX).toBeLessThan(120)
      if (index > 0) expect(polygonBounds(polygons[index - 1]).maxX).toBeLessThan(bounds.minX)
      expect(patches[index].polygon).toEqual(polygons[index])
      expect(patches[index].textOnly).toBe(true)
    }
    for (let index = 0; index < 4; index += 1) {
      expect(polygons[parts.length + index]).toEqual(charRangeToPolygon(block, index, index + 1))
    }
  })

  it('uses the same positions for focused cells and actual patches, including a separate suffix insertion', () => {
    const block = line('我从不失恋', '老娘从不失恋啊')
    const cells = segmentGraphemes(block.targetText)
    const patches = activePatches(block, planBlockEdit(block, null))
    for (const [index, text] of [[0, '老'], [6, '啊']] as const) {
      const patch = patches.find(item => item.text === text)!
      expect(cellWasAdded(block, cells, index, 600, 180)).toBe(true)
      expect(cellAnchorPolygon(block, cells, index, 600, 180)).toEqual(patch.polygon)
    }
    expect(cellWasAdded(block, cells, 1, 600, 180)).toBe(false)
    expect(polygonBounds(patches.find(item => item.text === '啊')!.polygon).minX).toBeGreaterThan(320)
  })

  it('fits the whole prefix into a narrow left margin instead of moving any character to the end', () => {
    const block = line('从不失恋', '老娘从不失恋', 20)
    const boxes = targetGraphemePolygons(block, 600, 180).slice(0, 2).map(polygonBounds)
    expect(boxes[0].minX).toBeGreaterThanOrEqual(0)
    expect(boxes[0].width).toBeGreaterThan(0)
    expect(boxes[0].maxX).toBeLessThan(boxes[1].minX)
    expect(boxes[1].maxX).toBeLessThan(20)
  })
})
