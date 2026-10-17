import { useState } from 'react'
import { redo, undo } from '../state/editor-store'
import { useEditor } from './use-editor'

export function ImageToolbar() {
  const state = useEditor()
  const [open, setOpen] = useState(false)
  return (
    <div className="preview-tools" role="toolbar" aria-label="编辑">
      <button
        type="button"
        className="tool-toggle"
        aria-label="工具"
        aria-expanded={open}
        aria-controls="edit-tools"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </button>
      {open && (
        <div id="edit-tools" className="tool-menu">
          <button type="button" onClick={undo} disabled={!state.history.past.length}>撤销</button>
          <button type="button" onClick={redo} disabled={!state.history.future.length}>重做</button>
        </div>
      )}
    </div>
  )
}
