import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BangCells } from '../src/components/BangCells'
import { TextBlockItem } from '../src/components/TextBlockItem'
import { cellChangeFlags } from '../src/lib/cell-input'
import type { OcrBlock } from '../src/types'

vi.mock('../src/components/use-editor', () => ({
  useEditor: () => ({ history: { present: { selectedId: 'b1' } }, cellFocus: null }),
}))

vi.mock('../src/state/editor-store', () => ({
  focusCell: vi.fn(),
  select: vi.fn(),
  setTargetText: vi.fn(),
}))

describe('cell change shape', () => {
  it('keeps every cell of an untouched OCR line square', () => {
    expect(cellChangeFlags('说人话', ['说', '人', '话'])).toEqual([false, false, false])
    expect(cellChangeFlags('说人话', ['说人话'])).toEqual([false])
  })

  it('rounds only the replaced cell', () => {
    expect(cellChangeFlags('说人话', ['说', '好', '话'])).toEqual([false, true, false])
  })

  it('does not round later cells when text is inserted in the middle', () => {
    expect(cellChangeFlags('说人话', ['说', '你', '人', '话'])).toEqual([false, true, false, false])
  })

  it('does not round remaining cells when text is deleted', () => {
    expect(cellChangeFlags('说人话', ['说', '话'])).toEqual([false, false])
    expect(cellChangeFlags('说人话', ['说', '人'])).toEqual([false, false])
  })

  it('rounds new and cleared empty cells', () => {
    expect(cellChangeFlags('说人话', ['说', '', '话'])).toEqual([false, true, false])
    expect(cellChangeFlags('说人话', ['说', '人', '话', ''])).toEqual([false, false, false, true])
  })

  it('treats every free-text cell as new because there is no OCR baseline', () => {
    expect(cellChangeFlags(undefined, ['新', '文', '字'])).toEqual([true, true, true])
    expect(cellChangeFlags(undefined, [''])).toEqual([true])
  })

  it('returns to square shapes when the original text is restored or undo runs', () => {
    expect(cellChangeFlags('说人话', ['说', '好', '话'])).toEqual([false, true, false])
    expect(cellChangeFlags('说人话', ['说', '人', '话'])).toEqual([false, false, false])
  })

  it('handles repeated characters without rounding the matching cells', () => {
    expect(cellChangeFlags('哈哈哈', ['哈', '啊', '哈'])).toEqual([false, true, false])
    expect(cellChangeFlags('哈哈哈', ['哈哈哈'])).toEqual([false])
  })

  it('keeps a combined emoji in one cell', () => {
    expect(cellChangeFlags('爱👨‍👩‍👧‍👦呀', ['爱', '❤️', '呀'])).toEqual([false, true, false])
    expect(cellChangeFlags('爱👨‍👩‍👧‍👦呀', ['爱', '👨‍👩‍👧‍👦', '呀'])).toEqual([false, false, false])
  })

  it('rounds an IME cell holding several graphemes', () => {
    expect(cellChangeFlags('说人话', ['说', 'nihao', '话'])).toEqual([false, true, false])
  })
})

function renderedChangedCells(markup: string): boolean[] {
  return [...markup.matchAll(/class="([^"]*)"/g)]
    .map((match) => match[1].split(' '))
    .filter((classes) => classes.includes('bang-cell'))
    .map((classes) => classes.includes('bang-cell-changed'))
}

function ocrBlock(originalText: string, targetText: string): OcrBlock {
  return {
    id: 'b1',
    originalText,
    targetText,
    score: 1,
    polygon: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }],
    layout: 'horizontal',
    enabled: true,
    applyLocal: true,
    lineRedraw: false,
    textStyle: { fontFamily: 'sans-serif', fontSize: 20, fill: '#111111' },
  }
}

describe('cell shape rendering', () => {
  it('renders an untouched OCR line without the changed class', () => {
    const markup = renderToStaticMarkup(createElement(BangCells, {
      text: '说人话',
      originalText: '说人话',
      onCommit: () => {},
    }))
    expect(renderedChangedCells(markup)).toEqual([false, false, false])
  })

  it('renders only the replaced OCR cell with the changed class', () => {
    const markup = renderToStaticMarkup(createElement(BangCells, {
      text: '说好话',
      originalText: '说人话',
      onCommit: () => {},
    }))
    expect(renderedChangedCells(markup)).toEqual([false, true, false])
  })

  it('renders every free-text cell with the changed class', () => {
    const markup = renderToStaticMarkup(createElement(BangCells, {
      text: '新文字',
      onCommit: () => {},
    }))
    expect(renderedChangedCells(markup)).toEqual([true, true, true])
  })

  it('passes the OCR baseline through TextBlockItem', () => {
    const markup = renderToStaticMarkup(createElement(TextBlockItem, {
      block: ocrBlock('说人话', '说好话'),
    }))
    expect(renderedChangedCells(markup)).toEqual([false, true, false])
  })
})
