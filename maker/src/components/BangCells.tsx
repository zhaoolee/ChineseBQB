import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { segmentGraphemes, spreadCellValue } from '../lib/grapheme'
import type { CellFocus } from '../state/editor-store'

const APPLY_DELAY_MS = 220

function splitCells(text: string): string[] {
  const cells = segmentGraphemes(text)
  return cells.length ? cells : ['']
}

export function BangCells({
  text,
  onCommit,
  onActivate,
  onFocusCell,
  cellFocus,
}: {
  text: string
  onCommit: (text: string) => void
  onActivate?: () => void
  onFocusCell?: (index: number, cells: string[]) => void
  cellFocus?: CellFocus | null
}) {
  const [cells, setCells] = useState(() => splitCells(text))
  const timer = useRef(0)
  const composing = useRef(false)
  const textRef = useRef(text)
  const cellsRef = useRef(cells)
  const pendingFocus = useRef<number | null>(null)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  cellsRef.current = cells

  useEffect(() => {
    textRef.current = text
    if (cellsRef.current.join('') === text) return
    window.clearTimeout(timer.current)
    timer.current = 0
    setCells(splitCells(text))
  }, [text])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (pendingFocus.current == null) return
    const index = pendingFocus.current
    pendingFocus.current = null
    inputs.current[index]?.focus()
  }, [cells])

  useEffect(() => {
    const active = inputs.current.findIndex((node) => node === document.activeElement)
    if (active < 0) return
    onFocusCell?.(active, cells)
  }, [cells, onFocusCell])

  useEffect(() => {
    if (!cellFocus) return
    const local = cellsRef.current
    if (cellFocus.cells.join('') !== local.join('')) return
    if (cellFocus.cells.length === local.length && cellFocus.cells.every((cell, index) => cell === local[index])) return
    setCells(cellFocus.cells.length ? cellFocus.cells : [''])
  }, [cellFocus])

  function schedule(next: string[]) {
    setCells(next)
    const joined = next.join('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = 0
      if (joined !== textRef.current) onCommit(joined)
    }, APPLY_DELAY_MS)
  }

  function placeText(index: number, value: string, commit: boolean) {
    if (!commit) {
      setCells(cells.map((cell, cellIndex) => (cellIndex === index ? value : cell)))
      return
    }
    const placed = spreadCellValue(cells, index, value)
    if (placed.focus !== index) pendingFocus.current = placed.focus
    schedule(placed.cells)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (composing.current) return
    if (event.key === 'ArrowRight') {
      inputs.current[index + 1]?.focus()
      event.preventDefault()
    } else if (event.key === 'ArrowLeft') {
      inputs.current[index - 1]?.focus()
      event.preventDefault()
    } else if (event.key === 'Backspace' && cells[index] === '' && cells.length > 1) {
      event.preventDefault()
      pendingFocus.current = Math.max(0, index - 1)
      schedule(cells.filter((_, cellIndex) => cellIndex !== index))
    }
  }

  return (
    <div className="bang" onPointerDown={onActivate}>
      {cells.map((cell, index) => (
        <input
          key={index}
          ref={(node) => { inputs.current[index] = node }}
          className="bang-cell"
          aria-label={cell ? `第 ${index + 1} 格「${cell}」` : `第 ${index + 1} 格，空的`}
          value={cell}
          inputMode="text"
          onFocus={() => {
            onActivate?.()
            onFocusCell?.(index, cellsRef.current)
          }}
          onCompositionStart={() => { composing.current = true }}
          onCompositionEnd={(event) => {
            composing.current = false
            placeText(index, event.currentTarget.value, true)
          }}
          onChange={(event) => {
            placeText(index, event.target.value, !composing.current)
          }}
          onKeyDown={(event) => onKeyDown(event, index)}
        />
      ))}
      <button
        type="button"
        className="bang-add"
        aria-label="添加小格子"
        onClick={() => {
          onActivate?.()
          pendingFocus.current = cells.length
          setCells([...cells, ''])
        }}
      >
        +
      </button>
    </div>
  )
}
