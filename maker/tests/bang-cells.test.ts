import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APPLY_DELAY_MS, createCellSession } from '../src/lib/cell-input'

/**
 * These tests drive the same event order the browser produces for the cell inputs.
 * `isComposing` is `InputEvent.isComposing` from the native event; BangCells forwards it
 * unchanged, so a broken composition decision shows up here.
 */
function harness(text: string) {
  const commits: string[] = []
  let cells: string[] = []
  const session = createCellSession({
    text,
    onChange: (next) => { cells = next },
    onCommit: (value) => commits.push(value),
  })
  return {
    session,
    commits,
    cells: () => cells.join(''),
    cellList: () => cells,
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('cell editing session', () => {
  it('commits when iOS ends a composition without firing compositionend', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, 'hao', true)
    expect(editor.cells()).toBe('说hao话')
    expect(editor.commits).toEqual([])

    // The iPhone keyboard closes the composition with no compositionend event; the next
    // input event reports isComposing: false. The cell must not stay preview-only.
    editor.session.change(1, '好', false)
    expect(editor.cells()).toBe('说好话')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])
  })

  it('keeps following edits working after a composition that never ended', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, 'hao', true)
    editor.session.change(1, '好', false)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])

    editor.session.change(0, '讲', false)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话', '讲好话'])
    editor.session.change(2, '语', false)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话', '讲好话', '讲好语'])
  })

  it('waits for compositionend and never writes pinyin into the document', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, 'r', true)
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    editor.session.change(1, 're', true)
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    editor.session.change(1, 'ren', true)
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual([])

    editor.session.compositionEnd(1, '人')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual([])
    expect(editor.cells()).toBe('说人话')
  })

  it('takes the committed value when Safari fires the input event before compositionend', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, '说好', true)
    // Order used by WebKit: input (already final) then compositionend.
    editor.session.change(1, '好', false)
    editor.session.compositionEnd(1, '好')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])
    expect(editor.cellList()).toEqual(['说', '好', '话'])
  })

  it('lets the final value win when compositionend carries the stale buffer', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, 'hao', true)
    editor.session.compositionEnd(1, 'hao')
    // The pinyin buffer must not be split into cells: the final input still has to replace it.
    expect(editor.cellList()).toEqual(['说', 'hao', '话'])
    editor.session.change(1, '好', false)
    expect(editor.cellList()).toEqual(['说', '好', '话'])
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])
    expect(editor.cellList()).toEqual(['说', '好', '话'])
  })

  it('splits a composition whose last value already arrived before compositionend', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.change(1, '你好', true)
    expect(editor.cellList()).toEqual(['说', '你好', '话'])
    editor.session.compositionEnd(1, '你好')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说你好话'])
    expect(editor.cellList()).toEqual(['说', '你', '好', '话'])
    expect(editor.session.consumeFocus()).toBe(2)
  })

  it('splits a composition that arrives only with compositionend', () => {
    const editor = harness('说人话')
    editor.session.compositionStart()
    editor.session.compositionEnd(1, '你好')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说你好话'])
    expect(editor.cellList()).toEqual(['说', '你', '好', '话'])
  })

  it('holds a scheduled commit so an open composition keeps its draft', () => {
    const editor = harness('说人话')
    editor.session.change(0, '讲', false)
    // A commit for 讲人话 is armed; typing pinyin must cancel it instead of writing the store
    // under the composition (which would reset the cells and wipe the draft).
    editor.session.compositionStart()
    editor.session.change(1, 'hao', true)
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual([])
    expect(editor.cellList()).toEqual(['讲', 'hao', '话'])

    editor.session.compositionEnd(1, '好')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['讲好话'])
    expect(editor.cellList()).toEqual(['讲', '好', '话'])
  })

  it('merges a held edit with a multi-character composition in one commit', () => {
    const editor = harness('说人话')
    editor.session.change(0, '讲', false)
    editor.session.compositionStart()
    editor.session.change(1, '你好', true)
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual([])
    editor.session.compositionEnd(1, '你好')
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['讲你好话'])
    expect(editor.cellList()).toEqual(['讲', '你', '好', '话'])
  })

  it('flushes a delayed commit when focus leaves the cells', () => {
    const editor = harness('说人话')
    editor.session.change(1, '好', false)
    expect(editor.commits).toEqual([])
    editor.session.blur()
    expect(editor.commits).toEqual(['说好话'])
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual(['说好话'])
  })

  it('flushes a delayed commit when the cells unmount', () => {
    const editor = harness('说人话')
    editor.session.change(1, '好', false)
    editor.session.close()
    expect(editor.commits).toEqual(['说好话'])
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual(['说好话'])
  })

  it('does not re-commit the text the document already has', () => {
    const editor = harness('说人话')
    editor.session.change(1, '好', false)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])
    editor.session.syncText('说好话')
    editor.session.flush()
    editor.session.blur()
    editor.session.close()
    expect(editor.commits).toEqual(['说好话'])
  })

  it('lets an outside document change cancel a pending commit', () => {
    const editor = harness('说人话')
    editor.session.change(1, '好', false)
    editor.session.syncText('说人话')
    vi.advanceTimersByTime(APPLY_DELAY_MS * 4)
    expect(editor.commits).toEqual([])
    expect(editor.cells()).toBe('说人话')
  })

  it('splits several characters typed into one cell and focuses the last one', () => {
    const editor = harness('')
    editor.session.change(0, '说好话', false)
    expect(editor.cellList()).toEqual(['说', '好', '话'])
    expect(editor.session.consumeFocus()).toBe(2)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说好话'])
  })

  it('removes and adds cells without touching the document until the delay passes', () => {
    const editor = harness('说人话')
    editor.session.change(1, '', false)
    editor.session.removeCell(1)
    expect(editor.cells()).toBe('说话')
    expect(editor.session.consumeFocus()).toBe(0)
    expect(editor.commits).toEqual([])
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说话'])

    editor.session.addCell()
    expect(editor.cellList()).toEqual(['说', '话', ''])
    expect(editor.session.consumeFocus()).toBe(2)
    vi.advanceTimersByTime(APPLY_DELAY_MS)
    expect(editor.commits).toEqual(['说话'])
  })

  it('regroups cells without committing when the store echoes the same text', () => {
    const editor = harness('说人话')
    editor.session.adopt(['说', '人话'])
    expect(editor.cellList()).toEqual(['说', '人话'])
    expect(editor.commits).toEqual([])
    editor.session.adopt(['说', '人话'])
    expect(editor.cellList()).toEqual(['说', '人话'])
  })
})
