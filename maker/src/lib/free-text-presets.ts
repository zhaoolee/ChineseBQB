import type { FreeTextPresetId, FreeTextStylePreset, TextStyle } from '../types'

/** A preset only fixes colors and a crisp outline. Size, font, weight and position stay with the layer. */
export type FreeTextPreset = {
  id: FreeTextPresetId
  label: string
  fill: string
  stroke: string
  strokeWidth: number
}

/** What the style select shows. `current` is an unmatched sampled style and is never stored. */
export type FreeTextStyleChoice = FreeTextStylePreset | 'current'

const SOLID_STROKE_WIDTH = 2

export const FREE_TEXT_PRESETS: readonly FreeTextPreset[] = [
  { id: 'white-outline-black', label: '白边黑字', fill: '#111111', stroke: '#ffffff', strokeWidth: SOLID_STROKE_WIDTH },
  { id: 'black-outline-white', label: '黑边白字', fill: '#ffffff', stroke: '#000000', strokeWidth: SOLID_STROKE_WIDTH },
  { id: 'black-outline-yellow', label: '黑边黄字', fill: '#ffd400', stroke: '#000000', strokeWidth: SOLID_STROKE_WIDTH },
  { id: 'white-outline-red', label: '白边红字', fill: '#e8352a', stroke: '#ffffff', strokeWidth: SOLID_STROKE_WIDTH },
]

/**
 * The select value for a layer. A stored choice always wins so custom values that
 * happen to equal a preset keep their expanded controls.
 */
export function freeTextStyleChoice(style: TextStyle): FreeTextStyleChoice {
  if (style.preset === 'custom') return 'custom'
  if (style.preset) return style.preset
  return matchFreeTextPreset(style) ?? 'current'
}

export function matchFreeTextPreset(style: TextStyle): FreeTextPresetId | null {
  const fill = normalizeColor(style.fill)
  const stroke = normalizeColor(style.stroke)
  if (!fill || !stroke || style.softOutline) return null
  const width = style.strokeWidth ?? 0
  return FREE_TEXT_PRESETS.find((preset) => (
    preset.fill === fill && preset.stroke === stroke && preset.strokeWidth === width
  ))?.id ?? null
}

/** Patch for `setFreeStyle`. Picking custom only records the choice, so the pixels do not move. */
export function freeTextStylePatch(choice: FreeTextStyleChoice): Partial<TextStyle> {
  if (choice === 'current') return {}
  if (choice === 'custom') return { preset: 'custom' }
  const preset = FREE_TEXT_PRESETS.find((item) => item.id === choice)
  if (!preset) return {}
  return {
    fill: preset.fill,
    stroke: preset.stroke,
    strokeWidth: preset.strokeWidth,
    softOutline: false,
    preset: preset.id,
  }
}

function normalizeColor(value: string | undefined): string | null {
  const color = value?.trim().toLowerCase()
  return color && /^#[0-9a-f]{6}$/.test(color) ? color : null
}
