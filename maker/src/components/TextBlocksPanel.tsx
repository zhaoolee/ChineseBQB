import { useState } from 'react'
import { addFreeText, focusCell, resetDocument, runOcr, select, setFreeText, visibleEdits, type CellFocus } from '../state/editor-store'
import type { FreeText } from '../types'
import { BangCells } from './BangCells'
import { EditControls } from './EditControls'
import { TextBlockItem } from './TextBlockItem'
import { useEditor } from './use-editor'

export function TextBlocksPanel() {
  const state = useEditor()
  const present = visibleEdits(state)
  const editable = Boolean(state.image?.imageData)
  return (
    <aside className="pane text-pane">
      <div className="pane-head">
        <h2>文字</h2>
        <div className="row">
          <button type="button" disabled={!editable} onClick={addFreeText}>添加文字</button>
          <button type="button" disabled={!editable} onClick={resetDocument}>还原原图</button>
          {state.image?.frames && <button type="button" disabled={state.ocrStatus === 'loading'} onClick={() => void runOcr()}>识别当前片段</button>}
        </div>
      </div>
      {state.ocrStatus === 'loading' && (
        <p className="status ocr-pending" role="status" aria-live="polite">
          <span className="ocr-scan" aria-hidden="true">
            <span className="ocr-scan-beam" />
          </span>
          <span>正在识别文本</span>
        </p>
      )}
      {state.ocrStatus === 'error' && (
        <div>
          <p className="status" role="status">{state.ocrMessage}</p>
          <button type="button" disabled={!editable} onClick={() => { void runOcr() }}>重新识别</button>
        </div>
      )}
      <div className="block-list">
        {present.blocks.map((block) => <TextBlockItem key={block.id} block={block} />)}
        {present.freeTexts.map((layer) => (
          <FreeTextRow
            key={layer.id}
            layer={layer}
            selected={present.selectedId === layer.id}
            cellFocus={state.cellFocus?.id === layer.id ? state.cellFocus : null}
          />
        ))}
      </div>
    </aside>
  )
}

function FreeTextRow({ layer, selected, cellFocus }: { layer: FreeText; selected: boolean; cellFocus: CellFocus | null }) {
  const [open, setOpen] = useState(false)
  return (
    <article
      className={selected ? 'block bang-block selected' : 'block bang-block'}
      onClick={() => select(layer.id)}
    >
      <div className="free-line">
        <button
          type="button"
          className={open ? 'free-expand open' : 'free-expand'}
          aria-expanded={open}
          aria-label={open ? '收起编辑' : '展开编辑'}
          onClick={(event) => {
            event.stopPropagation()
            select(layer.id)
            setOpen((value) => !value)
          }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M6 3.5 L11 8 L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <BangCells
          text={layer.text}
          cellFocus={cellFocus}
          onCommit={(text) => setFreeText(layer.id, text)}
          onActivate={() => select(layer.id)}
          onFocusCell={(index, cells) => focusCell(layer.id, index, cells)}
        />
      </div>
      {open && <EditControls layer={layer} />}
    </article>
  )
}
