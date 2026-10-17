import { setFreeStyle } from '../state/editor-store'
import type { FreeText } from '../types'

export function EditControls({ layer }: { layer: FreeText }) {
  const style = layer.textStyle
  const update = (patch: { fontSize?: number; fill?: string }) => {
    setFreeStyle(layer.id, patch)
  }
  return (
    <div className="free-editor style-row">
      <label>字号 <input type="number" min={8} max={400} value={style.fontSize} onChange={(event) => update({ fontSize: Number(event.target.value) })} /></label>
      <label>颜色 <input type="color" value={toColor(style.fill)} onChange={(event) => update({ fill: event.target.value })} /></label>
    </div>
  )
}

function toColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#161616'
}
