import { addFreeText, focusCell, resetDocument, runOcr, select, setFreeText, skipOcr, visibleEdits, type CellFocus } from '../state/editor-store'
import type { FreeText } from '../types'
import { BangCells } from './BangCells'
import { CustomStyleControls, StylePresetSelect } from './EditControls'
import { TextBlockItem } from './TextBlockItem'
import { useEditor } from './use-editor'
import { OcrProgressIndicator } from './OcrProgress'

export function TextBlocksPanel() {
  const state = useEditor()
  const present = visibleEdits(state)
  const editable = Boolean(state.image?.imageData)
  return (
    <aside className="pane text-pane">
      <div className="pane-head">
        <h2>文字</h2>
        <div className="row">
          {state.ocrStatus === 'loading' && <button type="button" onClick={skipOcr}>跳过识别</button>}
          <button type="button" disabled={!editable} onClick={addFreeText}>添加文字</button>
          <button type="button" disabled={!editable} onClick={resetDocument}>还原原图</button>
          {state.image?.frames && <button type="button" disabled={state.ocrStatus === 'loading'} onClick={() => void runOcr()}>识别当前片段</button>}
        </div>
      </div>
      {state.ocrStatus === 'loading' && (
        <OcrProgressIndicator
          progress={state.ocrProgress}
          animated={Boolean(state.image?.source.animated)}
          frameIndex={state.gifFrameIndex}
          frameCount={state.image?.frames?.length ?? 1}
        />
      )}
      {state.ocrStatus === 'error' && (
        <div>
          <p className="status" role="status">{state.ocrMessage}</p>
          <button type="button" disabled={!editable} onClick={() => { void runOcr() }}>重新识别</button>
        </div>
      )}
      {state.ocrStatus === 'idle' && editable && (
        <div className="row">
          <p className="status" role="status">{state.ocrMessage}</p>
          <button type="button" onClick={() => void runOcr()}>识别文字</button>
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
  return (
    <article
      className={selected ? 'block bang-block selected' : 'block bang-block'}
      onClick={() => select(layer.id)}
    >
      <div className="free-line">
        <BangCells
          text={layer.text}
          cellFocus={cellFocus}
          onCommit={(text) => setFreeText(layer.id, text)}
          onActivate={() => select(layer.id)}
          onFocusCell={(index, cells) => focusCell(layer.id, index, cells)}
        />
        <StylePresetSelect layer={layer} />
      </div>
      <CustomStyleControls layer={layer} />
    </article>
  )
}
