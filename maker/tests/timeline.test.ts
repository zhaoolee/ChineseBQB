import { describe, expect, it } from 'vitest'
import { createHistory, historyCommit, historyUndo, historyRedo } from '../src/lib/history'
import { editsAtFrame, frameTimes, MAX_SEGMENTS, splitSegment, type TimedEdits } from '../src/lib/timeline'

const edits = (): TimedEdits => ({
  segments: [{ id: 'a', start: 0, end: 4 }], selectedId: 'caption', blocks: [],
  freeTexts: [{ id: 'caption', segmentId: 'a', text: '第一句', x: 20, y: 20, textStyle: { fontFamily: 'sans-serif', fontSize: 20, fill: '#fff' } }],
})

describe('GIF segment boundaries and independent edits', () => {
  it('splits at a frame boundary, clones text, and applies only the matching segment', () => {
    const first = edits()
    const split = splitSegment(first, 2, 'b')
    expect(split.segments).toEqual([{id:'a',start:0,end:2},{id:'b',start:2,end:4}])
    expect(split.selectedId).toBe('b:caption')
    split.freeTexts = split.freeTexts.map(item => item.segmentId === 'b' ? {...item,text:'第二句'} : item)
    expect(editsAtFrame(split, 1).freeTexts.map(item=>item.text)).toEqual(['第一句'])
    expect(editsAtFrame(split, 2).freeTexts.map(item=>item.text)).toEqual(['第二句'])
    expect(editsAtFrame(split, 3).freeTexts).toHaveLength(1)
    expect(first.freeTexts[0].text).toBe('第一句')
  })
  it('keeps variable frame delays and exact total time', () => {
    expect(frameTimes([{delayMs:80},{delayMs:100},{delayMs:250}])).toEqual({starts:[0,80,180],total:430})
  })
  it('undo and redo preserve both segment boundaries and their text', () => {
    const first = edits()
    const split = splitSegment(first, 2, 'b')
    const history = historyCommit(createHistory(first), split)
    expect(historyUndo(history).present).toEqual(first)
    expect(historyRedo(historyUndo(history)).present).toEqual(split)
  })
  it('does not create empty ranges or exceed the segment budget', () => {
    const first = edits()
    expect(splitSegment(first, 0, 'b')).toBe(first)
    expect(splitSegment(first, 4, 'b')).toBe(first)
    const full = {...first, segments:Array.from({length:MAX_SEGMENTS},(_,i)=>({id:String(i),start:i*2,end:i*2+2}))}
    expect(splitSegment(full, 1, 'extra')).toBe(full)
  })
})
