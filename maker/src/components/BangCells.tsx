import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createCellSession, splitCells, type CellSession } from '../lib/cell-input'
import type { CellFocus } from '../state/editor-store'

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
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const cellsRef = useRef(cells)
  const handlers = useRef({ onCommit, onActivate, onFocusCell })
  const sessionRef = useRef<CellSession | null>(null)
  cellsRef.current = cells
  handlers.current = { onCommit, onActivate, onFocusCell }
  if (!sessionRef.current) {
    sessionRef.current = createCellSession({
      text,
      onChange: setCells,
      onCommit: (value) => handlers.current.onCommit(value),
    })
  }
  const session = sessionRef.current

  useEffect(() => {
    session.syncText(text)
  }, [session, text])

  useEffect(() => () => session.close(), [session])

  useEffect(() => {
    const index = session.consumeFocus()
    if (index != null) inputs.current[index]?.focus()
  }, [session, cells])

  useEffect(() => {
    const active = inputs.current.findIndex((node) => node === document.activeElement)
    if (active < 0) return
    handlers.current.onFocusCell?.(active, cells)
  }, [cells])

  useEffect(() => {
    if (!cellFocus) return
    const local = cellsRef.current
    if (cellFocus.cells.join('') !== local.join('')) return
    session.adopt(cellFocus.cells)
  }, [session, cellFocus])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (isComposing(event.nativeEvent) ?? session.isComposing()) return
    if (event.key === 'ArrowRight') {
      inputs.current[index + 1]?.focus()
      event.preventDefault()
    } else if (event.key === 'ArrowLeft') {
      inputs.current[index - 1]?.focus()
      event.preventDefault()
    } else if (event.key === 'Backspace' && cells[index] === '' && cells.length > 1) {
      event.preventDefault()
      session.removeCell(index)
    }
  }

  return (
    <div className="bang" onPointerDown={() => handlers.current.onActivate?.()}>
      {cells.map((cell, index) => (
        <input
          key={index}
          ref={(node) => { inputs.current[index] = node }}
          className="bang-cell"
          aria-label={cell ? `第 ${index + 1} 格「${cell}」` : `第 ${index + 1} 格，空的`}
          value={cell}
          inputMode="text"
          onFocus={() => {
            handlers.current.onActivate?.()
            handlers.current.onFocusCell?.(index, cellsRef.current)
          }}
          onBlur={() => session.blur()}
          onCompositionStart={() => session.compositionStart()}
          onCompositionEnd={(event) => session.compositionEnd(index, event.currentTarget.value)}
          onChange={(event) => session.change(index, event.currentTarget.value, isComposing(event.nativeEvent))}
          onKeyDown={(event) => onKeyDown(event, index)}
        />
      ))}
      <button
        type="button"
        className="bang-add"
        aria-label="添加小格子"
        onClick={() => {
          handlers.current.onActivate?.()
          session.addCell()
        }}
      >
        +
      </button>
    </div>
  )
}

/**
 * The browser's per-event IME flag. `undefined` means the engine does not expose it, so the
 * session falls back to compositionstart/compositionend tracking.
 */
function isComposing(event: Event): boolean | undefined {
  const value = (event as Event & { isComposing?: unknown }).isComposing
  return typeof value === 'boolean' ? value : undefined
}
