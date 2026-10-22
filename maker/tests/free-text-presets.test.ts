import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CustomStyleControls, StylePresetSelect } from '../src/components/EditControls'
import { createHistory, historyCommit, historyRedo, historyUndo } from '../src/lib/history'
import { FREE_TEXT_PRESETS, freeTextStyleChoice, freeTextStylePatch, matchFreeTextPreset } from '../src/lib/free-text-presets'
import type { FreeText, TextStyle } from '../src/types'

vi.mock('../src/state/editor-store', () => ({ setFreeStyle: vi.fn() }))

const sampledStyle: TextStyle = {
  fontFamily: '"PingFang SC", sans-serif',
  fontSize: 42,
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 2,
  softOutline: false,
  weight: 700,
}

function layerWith(style: Partial<TextStyle>): FreeText {
  return { id: 'text-1', text: '你好', x: 120, y: 80, textStyle: { ...sampledStyle, ...style } }
}

function withPatch(layer: FreeText, patch: Partial<TextStyle>): FreeText {
  return { ...layer, textStyle: { ...layer.textStyle, ...patch } }
}

const markupFor = (layer: FreeText) => renderToStaticMarkup(
  createElement(Fragment, null, createElement(StylePresetSelect, { layer }), createElement(CustomStyleControls, { layer })),
)
const inputCount = (markup: string) => (markup.match(/<input/g) ?? []).length

describe('free text presets', () => {
  it('maps each preset to a crisp outline and keeps the useful small set', () => {
    expect(FREE_TEXT_PRESETS.map((preset) => preset.label)).toEqual(['白边黑字', '黑边白字', '黑边黄字', '白边红字'])
    for (const preset of FREE_TEXT_PRESETS) {
      expect(freeTextStylePatch(preset.id)).toEqual({
        fill: preset.fill,
        stroke: preset.stroke,
        strokeWidth: 2,
        softOutline: false,
        preset: preset.id,
      })
    }
  })

  it('switches colors without touching text, position, size, family or weight', () => {
    const before = layerWith({ preset: 'black-outline-white' })
    const after = withPatch(before, freeTextStylePatch('white-outline-red'))
    expect(after.text).toBe(before.text)
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
    expect(after.textStyle).toMatchObject({
      fontFamily: sampledStyle.fontFamily,
      fontSize: sampledStyle.fontSize,
      weight: sampledStyle.weight,
      fill: '#e8352a',
      stroke: '#ffffff',
      strokeWidth: 2,
      preset: 'white-outline-red',
    })
  })

  it('matches an existing sampled style and ignores size, family and weight', () => {
    expect(freeTextStyleChoice(sampledStyle)).toBe('black-outline-white')
    expect(matchFreeTextPreset({ ...sampledStyle, fill: '#FFFFFF', fontSize: 80, weight: 400 })).toBe('black-outline-white')
    expect(freeTextStyleChoice({ ...sampledStyle, fill: '#fff' })).toBe('current')
    expect(freeTextStyleChoice({ ...sampledStyle, strokeWidth: 0 })).toBe('current')
    expect(freeTextStyleChoice({ ...sampledStyle, softOutline: true })).toBe('current')
  })

  it('only offers the current-style option for styles that match no preset', () => {
    const current = layerWith({ fill: '#123456', stroke: '#654321' })
    expect(freeTextStyleChoice(current.textStyle)).toBe('current')
    const markup = markupFor(current)
    expect(markup).toContain('当前样式')
    expect(inputCount(markup)).toBe(0)
  })

  it('keeps picking custom free of visual changes and never auto-collapses afterwards', () => {
    expect(freeTextStylePatch('custom')).toEqual({ preset: 'custom' })
    expect(freeTextStylePatch('current')).toEqual({})
    const custom = withPatch(layerWith({}), freeTextStylePatch('custom'))
    expect(custom.textStyle).toMatchObject(sampledStyle)
    expect(freeTextStyleChoice(custom.textStyle)).toBe('custom')
    const resized = withPatch(custom, { fontSize: 66 })
    expect(freeTextStyleChoice(resized.textStyle)).toBe('custom')
    expect(inputCount(markupFor(resized))).toBe(4)
  })

  it('keeps the style select visible without an expand arrow', () => {
    for (const layer of [layerWith({ preset: 'black-outline-yellow' }), layerWith({ fill: '#123456', stroke: '#654321' })]) {
      const markup = markupFor(layer)
      expect(markup).toContain('<select')
      expect(markup).not.toContain('<svg')
      expect(markup).not.toContain('aria-expanded')
    }
  })

  it('renders manual inputs only for custom, in their own row', () => {
    const preset = markupFor(layerWith({ preset: 'black-outline-yellow' }))
    expect(preset).toContain('<select')
    expect(preset).not.toContain('当前样式')
    expect(preset).not.toContain('free-custom')
    expect(inputCount(preset)).toBe(0)
    const custom = markupFor(layerWith({ preset: 'custom' }))
    expect(custom).toContain('字号')
    expect(inputCount(custom)).toBe(4)
    expect(custom.match(/free-custom/g)).toHaveLength(1)
  })

  it('keeps mode and colors consistent through undo and redo', () => {
    const preset = withPatch(layerWith({}), freeTextStylePatch('black-outline-yellow'))
    const custom = withPatch(preset, freeTextStylePatch('custom'))
    const committed = historyCommit(createHistory(preset), custom)
    expect(freeTextStyleChoice(committed.present.textStyle)).toBe('custom')
    const undone = historyUndo(committed)
    expect(freeTextStyleChoice(undone.present.textStyle)).toBe('black-outline-yellow')
    expect(undone.present.textStyle).toMatchObject({ fill: '#ffd400', stroke: '#000000', strokeWidth: 2 })
    const redone = historyRedo(undone)
    expect(freeTextStyleChoice(redone.present.textStyle)).toBe('custom')
    expect(redone.present.textStyle).toMatchObject({ fill: '#ffd400', stroke: '#000000', strokeWidth: 2 })
  })
})
