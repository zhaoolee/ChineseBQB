import { addFreeText, focusCell, resetDocument, runOcr, select, setFreeText, skipOcr, visibleEdits, type CellFocus } from '../state/editor-store'
import type { FreeText } from '../types'
import { BangCells } from './BangCells'
import { CustomStyleControls, StylePresetSelect } from './EditControls'
import { TextBlockItem } from './TextBlockItem'
import { useEditor } from './use-editor'
import { OcrProgressIndicator } from './OcrProgress'
import { SubtitleTrack } from './SubtitleTrack'

export function TextBlocksPanel() {
  const state = useEditor()
  const present = visibleEdits(state)
  const editable = Boolean(state.image?.imageData)
  const gif = Boolean(state.image?.frames && state.image.frames.length > 1)
  const loading = state.ocrStatus === 'loading'
  // GIF 定时字幕已由字幕行编辑，这里只保留手工非定时 block，避免同一句出现两套编辑器。
  const blocks = gif
    ? present.blocks.filter(block => typeof block.startFrame !== 'number' || typeof block.endFrame !== 'number' || block.endFrame <= block.startFrame)
    : present.blocks
  return (
    <aside className="pane text-pane">
      {/* GIF 只保留“字幕”一个标题；次要操作收进它的“…”菜单。 */}
      {!gif && (
        <div className="pane-head">
          <h2>文字</h2>
          <div className="row">
            {loading && <button type="button" onClick={skipOcr}>取消</button>}
            <button type="button" disabled={!editable} onClick={addFreeText}>添加文字</button>
            <button type="button" disabled={!editable} onClick={resetDocument}>还原原图</button>
          </div>
        </div>
      )}
      {gif && <SubtitleTrack />}
      {loading && !gif && (
        <OcrProgressIndicator
          progress={state.ocrProgress}
          animated={Boolean(state.image?.source.animated)}
          frameIndex={state.gifFrameIndex}
          frameCount={state.image?.frames?.length ?? 1}
        />
      )}
      {state.ocrStatus === 'error' && !gif && (
        <div className="ocr-retry">
          <p className="error" role="status">{state.ocrMessage}</p>
          <button type="button" disabled={!editable} onClick={() => { void runOcr() }}>重试</button>
        </div>
      )}
      {state.ocrStatus === 'idle' && editable && !gif && (
        <div className="row">
          <button type="button" onClick={() => { void runOcr() }}>识别文字</button>
        </div>
      )}
      <div className="block-list">
        {blocks.map((block) => <TextBlockItem key={block.id} block={block} />)}
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
