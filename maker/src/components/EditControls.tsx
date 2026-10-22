import { FREE_TEXT_PRESETS, freeTextStyleChoice, freeTextStylePatch, type FreeTextStyleChoice } from '../lib/free-text-presets'
import { setFreeStyle } from '../state/editor-store'
import type { FreeText, TextStyle } from '../types'

/** Picks a preset for a free text layer. It stays visible next to the text cells. */
export function StylePresetSelect({ layer }: { layer: FreeText }) {
  const choice = freeTextStyleChoice(layer.textStyle)
  return (
    <select
      className="free-preset"
      aria-label="样式"
      value={choice}
      onChange={(event) => setFreeStyle(layer.id, freeTextStylePatch(event.target.value as FreeTextStyleChoice))}
    >
      {choice === 'current' && <option value="current">当前样式</option>}
      {FREE_TEXT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
      <option value="custom">自定义</option>
    </select>
  )
}

/** Manual size, color and outline controls. Only custom styles get this full-width row. */
export function CustomStyleControls({ layer }: { layer: FreeText }) {
  const style = layer.textStyle
  if (freeTextStyleChoice(style) !== 'custom') return null
  const update = (patch: Partial<TextStyle>) => {
    setFreeStyle(layer.id, patch)
  }
  const hasStrokeWidth = (style.strokeWidth ?? 0) > 0
  return (
    <div className="style-row free-custom">
      <label>字号 <input type="number" min={8} max={400} value={style.fontSize} onChange={(event) => update({ fontSize: Number(event.target.value) })} /></label>
      <label>颜色 <input type="color" value={toColor(style.fill, '#161616')} onChange={(event) => update({ fill: event.target.value })} /></label>
      <label>描边 <input type="color" value={toColor(style.stroke, '#000000')} onChange={(event) => update({ stroke: event.target.value, ...(hasStrokeWidth ? {} : { strokeWidth: 2 }), softOutline: false })} /></label>
      <label>描边粗细 <input type="number" min={0} max={20} step={1} value={clampStrokeWidth(style.strokeWidth)} onChange={(event) => update({ strokeWidth: clampStrokeWidth(Number(event.target.value)), softOutline: false })} /></label>
    </div>
  )
}

function clampStrokeWidth(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0
  return Math.min(20, Math.max(0, Math.round(value)))
}

function toColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}
