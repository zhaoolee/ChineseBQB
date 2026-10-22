import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createCellSession, type CellSession } from '../lib/cell-input'

/** A whole-line input over the selected box; the document remains the shared source of truth. */
export function CanvasTextInput({ text, style, onCommit, onDone }: {
  text: string
  style: CSSProperties
  onCommit: (text: string) => void
  onDone: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(text)
  const callbacks = useRef({ onCommit, onDone })
  callbacks.current = { onCommit, onDone }
  const sessionRef = useRef<CellSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = createCellSession({
      text,
      onChange: (cells) => setDraft(cells.join('')),
      onCommit: (value) => callbacks.current.onCommit(value),
    })
  }
  const session = sessionRef.current
  useEffect(() => { session.syncText(text) }, [session, text])
  useEffect(() => {
    input.current?.focus({ preventScroll: true })
    input.current?.select()
    return () => session.close()
  }, [session])

  return <input
    ref={input}
    type="text"
    className="canvas-text-input"
    aria-label="画布文字编辑"
    style={style}
    value={draft}
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
    onCompositionStart={() => session.compositionStart()}
    onCompositionEnd={(event) => session.replaceText(event.currentTarget.value, false)}
    onChange={(event) => session.replaceText(event.currentTarget.value,
      (event.nativeEvent as InputEvent).isComposing)}
    onBlur={() => {
      session.blur()
      callbacks.current.onDone()
    }}
    onKeyDown={(event) => {
      if (event.nativeEvent.isComposing || session.isComposing()) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        // Commit before the app handles shared undo, so a pending timer cannot overwrite it.
        session.flush()
      } else if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        event.currentTarget.blur()
      }
    }}
  />
}
