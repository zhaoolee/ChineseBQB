import { diffText } from './diff'
import { segmentGraphemes, spreadCellValue } from './grapheme'

/** Wait this long after the last cell change before writing it into the document. */
export const APPLY_DELAY_MS = 220

export function splitCells(text: string): string[] {
  const cells = segmentGraphemes(text)
  return cells.length ? cells : ['']
}

/**
 * Which cells hold new or replaced text compared with the stable OCR baseline.
 * `undefined` means the row has no baseline (free text), so every cell is new.
 * Deletions are ignored: removing a character must not mark its untouched neighbours.
 * A cell with several graphemes (an in-flight IME buffer) is marked when any part changed,
 * and an empty cell is new or was cleared, so it keeps the rounded shape too.
 */
export function cellChangeFlags(originalText: string | undefined, cells: string[]): boolean[] {
  if (originalText === undefined) return cells.map(() => true)
  const changed = new Set<number>()
  for (const change of diffText(originalText, cells.join(''))) {
    if (change.kind === 'delete') continue
    for (let index = change.newStart; index < change.newEnd; index += 1) changed.add(index)
  }
  let graphemeIndex = 0
  return cells.map((cell) => {
    const count = segmentGraphemes(cell).length
    const start = graphemeIndex
    graphemeIndex += count
    if (count === 0) return true
    for (let index = start; index < graphemeIndex; index += 1) {
      if (changed.has(index)) return true
    }
    return false
  })
}

export type CellTimers = {
  set: (callback: () => void, delayMs: number) => number
  clear: (handle: number) => void
}

const defaultTimers: CellTimers = {
  set: (callback, delayMs) => globalThis.setTimeout(callback, delayMs) as unknown as number,
  clear: (handle) => globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>),
}

export type CellSessionOptions = {
  text: string
  /** New cell split, for rendering. */
  onChange: (cells: string[]) => void
  /** Delayed, de-duplicated document update. */
  onCommit: (text: string) => void
  delayMs?: number
  timers?: CellTimers
}

export type CellSession = {
  cells: () => string[]
  /** The document text changed outside these cells (undo, another block, our own commit landing). */
  syncText: (text: string) => void
  /** Same text, different cell grouping (the store echoes the focused cells back). */
  adopt: (cells: string[]) => void
  /**
   * A value change on one cell. `isComposing` is the browser's per-event IME flag
   * (`InputEvent.isComposing`). It must win over any tracked composition state: iOS Safari
   * can end a composition without firing `compositionend`, and a stuck flag turns every
   * later edit into a preview-only change that never reaches the document.
   */
  change: (index: number, value: string, isComposing?: boolean) => void
  compositionStart: () => void
  compositionEnd: (index: number, value: string) => void
  /** Focus left the cells: apply a scheduled change now instead of dropping it with the timer. */
  blur: () => void
  flush: () => void
  close: () => void
  removeCell: (index: number) => void
  addCell: () => void
  consumeFocus: () => number | null
  /** Tracked composition state, only used when the browser hides `isComposing`. */
  isComposing: () => boolean
}

export function createCellSession(options: CellSessionOptions): CellSession {
  const { delayMs = APPLY_DELAY_MS, timers = defaultTimers, onChange, onCommit } = options
  let cells = splitCells(options.text)
  let committed = options.text
  let trackedComposition = false
  /** Cell whose composition value still has to be split into one grapheme per cell. */
  let normalize: number | null = null
  let pending: string | null = null
  let timer = 0
  let focusTarget: number | null = null

  function cancelTimer() {
    if (!timer) return
    timers.clear(timer)
    timer = 0
  }

  function emit(next: string[]) {
    cells = next
    onChange(cells)
  }

  /**
   * Split a composition result into one cell per grapheme at commit time. Doing it when
   * `compositionend` arrives would split the pinyin buffer on engines that report the
   * composition as ended before the value updates, and the following input would then only
   * replace one of those cells.
   */
  function normalizeCells() {
    const index = normalize
    if (index === null) return
    normalize = null
    const value = cells[index]
    if (value === undefined) return
    const parts = segmentGraphemes(value)
    if (parts.length < 2) return
    focusTarget = index + parts.length - 1
    emit([...cells.slice(0, index), ...parts, ...cells.slice(index + 1)])
  }

  function flushPending() {
    if (pending === null) return
    pending = null
    cancelTimer()
    normalizeCells()
    const value = cells.join('')
    if (value === committed) return
    committed = value
    onCommit(value)
  }

  /**
   * Keep the uncommitted text but stop the timer. An open composition must not be clobbered by
   * a commit armed before it started; the merged text is committed once the composition ends.
   */
  function holdPending() {
    pending = cells.join('')
    cancelTimer()
  }

  function scheduleCommit() {
    pending = cells.join('')
    cancelTimer()
    timer = timers.set(() => {
      timer = 0
      flushPending()
    }, delayMs)
  }

  function schedule(next: string[]) {
    emit(next)
    scheduleCommit()
  }

  function place(index: number, value: string, commit: boolean) {
    if (!commit) {
      emit(cells.map((cell, cellIndex) => (cellIndex === index ? value : cell)))
      return
    }
    const placed = spreadCellValue(cells, index, value)
    if (placed.focus !== index) focusTarget = placed.focus
    schedule(placed.cells)
  }

  return {
    cells: () => cells.slice(),
    syncText(text) {
      committed = text
      if (cells.join('') === text) return
      pending = null
      normalize = null
      cancelTimer()
      emit(splitCells(text))
    },
    adopt(next) {
      const value = next.length ? next.slice() : ['']
      const same = value.length === cells.length && value.every((cell, index) => cell === cells[index])
      if (same) return
      emit(value)
    },
    change(index, value, isComposing) {
      // A reported `false` ends any tracked composition, even when no `compositionend` came.
      if (isComposing === false) trackedComposition = false
      const composing = isComposing ?? trackedComposition
      if (composing) {
        place(index, value, false)
        holdPending()
        return
      }
      // A final value on another cell: settle the composition result before moving on.
      if (normalize !== null && normalize !== index) normalizeCells()
      // This value replaces the composed cell, so it is already the normalized text.
      normalize = null
      place(index, value, true)
    },
    compositionStart() {
      trackedComposition = true
      holdPending()
    },
    compositionEnd(index, value) {
      trackedComposition = false
      // Mirror the final value without splitting it yet: iOS Safari can fire compositionend
      // before the DOM value updates, so this may still be the pinyin buffer. The following
      // input event overwrites the cell first, and the split happens when the edit commits.
      normalize = index
      place(index, value, false)
      scheduleCommit()
    },
    blur() {
      trackedComposition = false
      flushPending()
    },
    flush() {
      flushPending()
    },
    close() {
      flushPending()
    },
    removeCell(index) {
      focusTarget = Math.max(0, index - 1)
      normalize = null
      schedule(cells.filter((_, cellIndex) => cellIndex !== index))
    },
    addCell() {
      focusTarget = cells.length
      emit([...cells, ''])
    },
    consumeFocus() {
      const index = focusTarget
      focusTarget = null
      return index
    },
    isComposing() {
      return trackedComposition
    },
  }
}
