import { colorToHex, luminance, sampleBackground, sampleInk } from './background'
import { appendCharPolygon, blockLayout, estimateFontSize, paddedCharPolygon } from './char-layout'
import { diffText } from './diff'
import { segmentGraphemes } from './grapheme'
import { polygonBounds } from './geometry'
import type { EditSafety, OcrBlock, Point, TextChange, TextStyle } from '../types'

export type EditRegion = {
  change: TextChange
  polygon: Point[]
  estimated: boolean
  solid: boolean
  color: [number, number, number, number]
  /** Cleared character: smear the original pixels in this box instead of painting a flat color. */
  blur?: boolean
}

export type EditPlan = {
  changes: TextChange[]
  safety: EditSafety | 'none'
  regions: EditRegion[]
  message: string
  suggestedStyle?: Partial<TextStyle>
}

const DEFAULT_FONT = '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'

export function defaultTextStyle(polygon: Point[], fill = '#111111'): TextStyle {
  return {
    fontFamily: DEFAULT_FONT,
    fontSize: Math.round(estimateFontSize(polygon)),
    fill,
    stroke: fill === '#111111' ? '#ffffff' : '#111111',
    strokeWidth: 0,
    weight: 700,
  }
}

/** New free text copies the largest original line's ink. With no text, it is white and softly outlined. */
export function addedTextStyle(image: ImageData | null, blocks: OcrBlock[], polygon: Point[]): TextStyle {
  const ink = image ? dominantInk(image, blocks) : null
  if (!ink) {
    return { ...defaultTextStyle(polygon, '#ffffff'), strokeWidth: 0, softOutline: true }
  }
  return { ...defaultTextStyle(polygon, colorToHex(ink)), strokeWidth: 0, softOutline: false }
}

function dominantInk(image: ImageData, blocks: OcrBlock[]): [number, number, number, number] | null {
  const ranked = [...blocks].sort((left, right) => polygonArea(right.polygon) - polygonArea(left.polygon))
  for (const block of ranked) {
    const ink = sampleInk(image, block.polygon)
    if (ink) return ink
  }
  return null
}

function polygonArea(polygon: Point[]): number {
  const bounds = polygonBounds(polygon)
  return Math.max(0, bounds.maxX - bounds.minX) * Math.max(0, bounds.maxY - bounds.minY)
}

export function planBlockEdit(block: OcrBlock, image: ImageData | null): EditPlan {
  if (!block.enabled) {
    return { changes: [], safety: 'none', regions: [], message: '这段文字已停用。' }
  }
  const changes = diffText(block.originalText, block.targetText)
  if (!changes.length) {
    return { changes, safety: 'none', regions: [], message: '文字没有变化，不会改动原图像素。' }
  }
  const layout = block.layout === 'unknown' ? blockLayout(block.polygon) : block.layout
  if (layout !== 'horizontal') {
    return {
      changes,
      safety: 'manual',
      regions: [],
      message: '这段文字不是近水平单行，自动单字定位不可靠。请手动框选，或选择整行重绘。',
    }
  }
  if (block.lineRedraw) {
    const polygon = block.manualPolygon ?? block.polygon
    const sample = image
      ? sampleBackground(image, polygon)
      : { color: [255, 255, 255, 255] as [number, number, number, number], solid: false }
    return {
      changes,
      safety: 'review',
      regions: [{ change: changes[0], polygon, estimated: !block.manualPolygon, solid: sample.solid, color: sample.color }],
      message: '整行重绘会盖住这一行里没有改动的字。只有打开「整行重绘」并应用后才会执行。',
    }
  }
  const equalReplace = changes.every((change) => (
    change.kind === 'replace'
    && segmentGraphemes(change.oldText).length === segmentGraphemes(change.newText).length
    && segmentGraphemes(change.oldText).length > 0
  ))
  if (!equalReplace) {
    const regions = unevenRegions(block, image, changes)
    const drawn = regions.some((region) => !region.blur && region.change.newText)
    const ink = drawn && image ? sampleInk(image, block.polygon) : null
    const fallback = regions.find((region) => !region.blur && region.change.newText)
    const fill = ink
      ? colorToHex(ink)
      : fallback
        ? (luminance(fallback.color) < 140 ? '#f7f7f7' : '#161616')
        : undefined
    const stroke = ink
      ? (luminance(ink) > 160 ? '#111111' : '#ffffff')
      : fill === '#161616' ? '#ffffff' : '#111111'
    return {
      changes,
      safety: 'review',
      regions,
      suggestedStyle: fill ? { fill, stroke } : undefined,
      message: '删掉的字只模糊它所在的位置。后加的字画在原句外面，没有改动的字保持原样。',
    }
  }

  const width = image?.width ?? Number.POSITIVE_INFINITY
  const height = image?.height ?? Number.POSITIVE_INFINITY
  const regions = changes.map((change) => {
    const estimated = !block.manualPolygon
    const polygon = block.manualPolygon && changes.length === 1
      ? block.manualPolygon
      : paddedCharPolygon(block, change.oldStart, change.oldEnd, Math.max(2, polygonBounds(block.polygon).height * 0.08), width, height, image)
    const sample = image ? sampleBackground(image, polygon) : { color: [255, 255, 255, 255] as [number, number, number, number], solid: false, variance: 255, samples: 0 }
    return { change, polygon, estimated, solid: sample.solid, color: sample.color }
  })
  const solid = regions.every((region) => region.solid)
  const safety: EditSafety = !image ? 'review' : solid ? 'safe' : 'review'
  const ink = image ? sampleInk(image, block.polygon) : null
  const fallbackFill = regions[0] && luminance(regions[0].color) < 140 ? '#f7f7f7' : '#161616'
  const fill = ink ? colorToHex(ink) : fallbackFill
  const stroke = ink
    ? (luminance(ink) > 160 ? '#111111' : '#ffffff')
    : fill === '#161616' ? '#ffffff' : '#111111'
  return {
    changes,
    safety,
    regions,
    suggestedStyle: { fill, stroke },
    message: safety === 'safe'
      ? '背景接近纯色，只会覆盖有变化的字。框是按整行估算的，不是模型给出的单字框。'
      : '背景不够干净，或还没有原图像素可采样。请先看预览，确认后再应用局部覆盖。',
  }
}

function unevenRegions(block: OcrBlock, image: ImageData | null, changes: TextChange[]): EditRegion[] {
  const width = image?.width ?? Number.POSITIVE_INFINITY
  const height = image?.height ?? Number.POSITIVE_INFINITY
  const pad = Math.max(2, polygonBounds(block.polygon).height * 0.06)
  let slot = 0
  const regions: EditRegion[] = []
  for (const change of changes) {
    for (let index = change.oldStart; index < change.oldEnd; index += 1) {
      const polygon = paddedCharPolygon(block, index, index + 1, pad, width, height, image)
      regions.push({
        change,
        polygon,
        estimated: !block.manualPolygon,
        solid: false,
        color: [255, 255, 255, 0],
        blur: true,
      })
    }
    for (const grapheme of segmentGraphemes(change.newText)) {
      const polygon = appendCharPolygon(block, slot, width, height)
      slot += 1
      const sample = image
        ? sampleBackground(image, polygon)
        : { color: [255, 255, 255, 255] as [number, number, number, number], solid: false }
      regions.push({
        change: { ...change, kind: 'insert', oldText: '', newText: grapheme, oldEnd: change.oldStart },
        polygon,
        estimated: true,
        solid: sample.solid,
        color: sample.color,
      })
    }
  }
  return regions
}

/** Typing previews at once. A horizontal edit stays on the changed characters; only a non-horizontal line covers the whole line. */
export function liveRedraw(block: OcrBlock, image: ImageData | null): Pick<OcrBlock, 'lineRedraw' | 'applyLocal' | 'textStyle'> {
  const probed = planBlockEdit({ ...block, lineRedraw: false }, image)
  const changed = probed.changes.length > 0
  const lineRedraw = changed && probed.safety === 'manual'
  const ink = image ? sampleInk(image, block.polygon) : null
  const alreadyOriginal = Boolean(ink && block.textStyle.fill.toLowerCase() === colorToHex(ink))
  const textStyle = !block.styleCustomized && probed.suggestedStyle?.fill && !alreadyOriginal
    ? { ...block.textStyle, fill: probed.suggestedStyle.fill, stroke: probed.suggestedStyle.stroke ?? block.textStyle.stroke }
    : block.textStyle
  return { lineRedraw, applyLocal: changed, textStyle }
}

export function collectPatches(blocks: OcrBlock[], image: ImageData) {
  return blocks.flatMap((block) => activePatches(block, planBlockEdit(block, image), image))
}

export function activePatches(block: OcrBlock, plan: EditPlan, image?: ImageData | null) {
  const style = image ? inkStyle(block, image) : block.textStyle
  if (block.lineRedraw && block.applyLocal) {
    const polygon = block.manualPolygon ?? block.polygon
    return [{
      polygon,
      color: plan.regions[0]?.color ?? [255, 255, 255, 255] as [number, number, number, number],
      text: block.targetText,
      style,
      blur: false,
      textOnly: false,
    }]
  }
  if (!block.applyLocal || plan.safety === 'manual' || plan.safety === 'none') return []
  if (!plan.regions.length) return []
  return plan.regions.map((region) => {
    const cleared = Boolean(region.blur)
    return {
      polygon: region.polygon,
      color: region.color,
      text: cleared ? '' : region.change.newText,
      style,
      blur: cleared,
      textOnly: region.change.kind === 'insert',
    }
  })
}

function inkStyle(block: OcrBlock, image: ImageData) {
  if (block.styleCustomized) return block.textStyle
  const ink = sampleInk(image, block.polygon)
  if (!ink) return block.textStyle
  const fill = colorToHex(ink)
  if (block.textStyle.fill.toLowerCase() === fill) return block.textStyle
  return { ...block.textStyle, fill, stroke: luminance(ink) > 160 ? '#111111' : '#ffffff' }
}
