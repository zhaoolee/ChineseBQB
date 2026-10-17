import { focusCell, select, setTargetText } from '../state/editor-store'
import { BangCells } from './BangCells'
import { useEditor } from './use-editor'
import type { OcrBlock } from '../types'

export function TextBlockItem({ block }: { block: OcrBlock }) {
  const state = useEditor()
  const selected = state.history.present.selectedId === block.id
  return (
    <article className={selected ? 'block bang-block selected' : 'block bang-block'} onClick={() => select(block.id)}>
      <BangCells
        text={block.targetText}
        cellFocus={state.cellFocus?.id === block.id ? state.cellFocus : null}
        onCommit={(text) => setTargetText(block.id, text)}
        onActivate={() => select(block.id)}
        onFocusCell={(index, cells) => focusCell(block.id, index, cells)}
      />
    </article>
  )
}
