import { sampleBackground } from './background'
import { diffText } from './diff'
import { segmentGraphemes } from './grapheme'
import { clampPolygon, lerp, pointInPolygon, polygonBounds } from './geometry'
import type { OcrBlock, Point } from '../types'

const HORIZONTAL_LIMIT = 12 * Math.PI / 180

export function graphemeWeight(grapheme: string): number {
  if (/^\s$/.test(grapheme)) return 0.35
  if (/^[A-Za-z0-9]$/.test(grapheme)) return 0.55
  if (/^[\p{P}\p{S}]$/u.test(grapheme)) return 0.5
  return 1
}

export function lineAngle(polygon: Point[]): number {
  const [start, end] = polygon
  return Math.atan2(end.y - start.y, end.x - start.x)
}

export function blockLayout(polygon: Point[]): OcrBlock['layout'] {
  const bounds = polygonBounds(polygon)
  const angle = Math.abs(lineAngle(polygon))
  const horizontal = angle < HORIZONTAL_LIMIT || Math.abs(angle - Math.PI) < HORIZONTAL_LIMIT
  if (horizontal && bounds.width >= bounds.height * 0.8) return 'horizontal'
  const vertical = Math.abs(angle - Math.PI / 2) < HORIZONTAL_LIMIT
  if (vertical || bounds.height > bounds.width * 1.35) return 'vertical'
  return 'unknown'
}

/** Fractions along the line for a half-open grapheme range. Weights are not removed or normalized away. */
export function rangeFractions(text: string, start: number, end: number): { start: number; end: number } {
  const parts = segmentGraphemes(text)
  if (start < 0 || end > parts.length || start >= end) {
    throw new Error('字符区间超出文本')
  }
  const weights = parts.map(graphemeWeight)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const before = weights.slice(0, start).reduce((sum, weight) => sum + weight, 0)
  const span = weights.slice(start, end).reduce((sum, weight) => sum + weight, 0)
  return { start: before / total, end: (before + span) / total }
}

export function charRangeToPolygon(block: Pick<OcrBlock, 'polygon' | 'originalText'>, start: number, end: number): [Point, Point, Point, Point] {
  const [topLeft, topRight, bottomRight, bottomLeft] = block.polygon
  const fraction = rangeFractions(block.originalText, start, end)
  return [
    lerp(topLeft, topRight, fraction.start),
    lerp(topLeft, topRight, fraction.end),
    lerp(bottomLeft, bottomRight, fraction.end),
    lerp(bottomLeft, bottomRight, fraction.start),
  ]
}

/**
 * Pad a nearly horizontal character box without crossing the midpoint of a neighbor.
 * The result stays inside the image.
 */
export function paddedCharPolygon(
  block: Pick<OcrBlock, 'polygon' | 'originalText'>,
  start: number,
  end: number,
  pad: number,
  imageWidth: number,
  imageHeight: number,
  image?: ImageData | null,
): Point[] {
  const parts = segmentGraphemes(block.originalText)
  const glyphs = image ? originalGlyphFractions(image, block.polygon, parts.length) : null
  const boxFor = (rangeStart: number, rangeEnd: number) => {
    if (!glyphs) return polygonBounds(charRangeToPolygon(block, rangeStart, rangeEnd))
    return polygonBounds(fractionPolygon(block.polygon, glyphs[rangeStart].start, glyphs[rangeEnd - 1].end))
  }
  const own = boxFor(start, end)
  let minX = own.minX - pad
  let maxX = own.maxX + pad
  if (start > 0) {
    const previous = boxFor(start - 1, start)
    minX = Math.max(minX, (previous.maxX + own.minX) / 2)
  }
  if (end < parts.length) {
    const next = boxFor(end, end + 1)
    maxX = Math.min(maxX, (own.maxX + next.minX) / 2)
  }
  const polygon = [
    { x: minX, y: own.minY - pad },
    { x: maxX, y: own.minY - pad },
    { x: maxX, y: own.maxY + pad },
    { x: minX, y: own.maxY + pad },
  ]
  return clampPolygon(polygon, imageWidth, imageHeight)
}

function fractionPolygon(polygon: [Point, Point, Point, Point], start: number, end: number): [Point, Point, Point, Point] {
  const [topLeft, topRight, bottomRight, bottomLeft] = polygon
  return [
    lerp(topLeft, topRight, start),
    lerp(topLeft, topRight, end),
    lerp(bottomLeft, bottomRight, end),
    lerp(bottomLeft, bottomRight, start),
  ]
}

/**
 * Horizontal spans of the original glyphs. A wide letter such as W keeps its own
 * ink, instead of an equal slice that is only as wide as a narrower replacement.
 * Returns null when the ink cannot be split into one span per grapheme.
 */
export function originalGlyphFractions(image: ImageData, polygon: Point[], count: number): { start: number; end: number }[] | null {
  if (count < 1) return null
  const bounds = polygonBounds(polygon)
  const span = bounds.maxX - bounds.minX
  if (span < 2) return null
  const background = sampleBackground(image, polygon).color
  const x0 = Math.max(0, Math.floor(bounds.minX))
  const x1 = Math.min(image.width - 1, Math.ceil(bounds.maxX))
  const y0 = Math.max(0, Math.floor(bounds.minY))
  const y1 = Math.min(image.height - 1, Math.ceil(bounds.maxY))
  const counts: number[] = []
  for (let x = x0; x <= x1; x += 1) {
    let ink = 0
    for (let y = y0; y <= y1; y += 1) {
      if (!pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue
      const index = (y * image.width + x) * 4
      if (image.data[index + 3] < 20) continue
      const distance = Math.hypot(
        image.data[index] - background[0],
        image.data[index + 1] - background[1],
        image.data[index + 2] - background[2],
      )
      if (distance >= 80) ink += 1
    }
    counts.push(ink)
  }
  const runs: { start: number; end: number }[] = []
  let runStart = -1
  for (let index = 0; index <= counts.length; index += 1) {
    const filled = index < counts.length && counts[index] >= 2
    if (filled && runStart < 0) runStart = index
    if (!filled && runStart >= 0) {
      runs.push({ start: runStart, end: index })
      runStart = -1
    }
  }
  const bodies = runs.filter((run) => run.end - run.start >= 2)
  const fitted = fitGlyphRuns(counts, bodies, count, Math.max(6, Math.round(counts.length / count)))
  if (!fitted) return null
  return fitted.map((run) => ({
    start: (x0 + run.start - bounds.minX) / span,
    end: (x0 + run.end - bounds.minX) / span,
  }))
}

function fitGlyphRuns(
  counts: number[],
  runs: { start: number; end: number }[],
  count: number,
  minSplitWidth: number,
): { start: number; end: number }[] | null {
  const fitted = runs.map((run) => ({ ...run }))
  while (fitted.length > count) {
    let best = 0
    let gap = Number.POSITIVE_INFINITY
    for (let index = 0; index < fitted.length - 1; index += 1) {
      const size = fitted[index + 1].start - fitted[index].end
      if (size < gap) {
        gap = size
        best = index
      }
    }
    const left = fitted[best]
    const right = fitted[best + 1]
    fitted.splice(best, 2, { start: left.start, end: right.end })
  }
  while (fitted.length < count) {
    let bestRun = -1
    let bestX = -1
    let bestScore = Number.POSITIVE_INFINITY
    for (let index = 0; index < fitted.length; index += 1) {
      const run = fitted[index]
      if (run.end - run.start < minSplitWidth) continue
      let peak = 0
      for (let x = run.start; x < run.end; x += 1) peak = Math.max(peak, counts[x])
      for (let x = run.start + 2; x < run.end - 2; x += 1) {
        if (counts[x] > Math.max(1, peak * 0.35) || counts[x] >= bestScore) continue
        bestScore = counts[x]
        bestRun = index
        bestX = x
      }
    }
    if (bestRun < 0) return null
    const run = fitted[bestRun]
    fitted.splice(bestRun, 1, { start: run.start, end: bestX }, { start: bestX + 1, end: run.end })
  }
  return fitted.length === count ? fitted : null
}

function box(x: number, y: number, width: number, height: number): [Point, Point, Point, Point] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

/**
 * A new character sits beside the original line. It never covers the glyphs
 * that were already there; if the margin is tight it becomes a narrower box.
 */
export function appendCharPolygon(
  block: Pick<OcrBlock, 'polygon' | 'originalText'>,
  slot: number,
  imageWidth = Number.POSITIVE_INFINITY,
  imageHeight = Number.POSITIVE_INFINITY,
): Point[] {
  const bounds = polygonBounds(block.polygon)
  const parts = segmentGraphemes(block.originalText)
  const total = parts.reduce((sum, part) => sum + graphemeWeight(part), 0) || 1
  const charW = Math.max(8, bounds.width / total)
  const charH = Math.max(8, bounds.height)
  const gap = Math.max(2, Math.min(charW, charH) * 0.12)
  const spots: Point[] = []
  const addRow = (originX: number, originY: number, width: number, height: number, maxX: number) => {
    if (originY < -0.5 || originY + height > imageHeight + 0.5) return
    for (let x = originX; x + width <= maxX + 0.5 && spots.length <= slot; x += width + gap) {
      spots.push({ x, y: originY })
    }
  }
  for (let y = bounds.minY; spots.length <= slot && y + charH <= imageHeight + 0.5; y += charH + gap) {
    addRow(bounds.maxX + gap, y, charW, charH, imageWidth)
    if (bounds.maxX + gap + charW > imageWidth + 0.5) break
  }
  for (let y = bounds.maxY + gap; spots.length <= slot && y + charH <= imageHeight + 0.5; y += charH + gap) {
    addRow(bounds.minX, y, charW, charH, imageWidth)
  }
  const placed = spots[slot]
  if (placed) return box(placed.x, placed.y, charW, charH)
  const room = Math.max(0, imageWidth - bounds.maxX)
  const width = Math.max(1, Math.min(charW, Math.max(room - 1, 1)))
  return box(room > 1 ? bounds.maxX + 1 : bounds.maxX, bounds.minY, room > 1 ? Math.min(charW, room - 1) : width, charH)
}

function layoutTargetGraphemes(
  block: Pick<OcrBlock, 'polygon' | 'originalText' | 'targetText'>,
  imageWidth: number,
  imageHeight: number,
): { polygons: Point[][]; appendSlots: number; added: boolean[] } {
  const oldParts = segmentGraphemes(block.originalText)
  const newParts = segmentGraphemes(block.targetText)
  const changes = diffText(block.originalText, block.targetText)
  const polygons: Point[][] = []
  const added: boolean[] = []
  let oldIndex = 0
  let newIndex = 0
  let appendSlot = 0
  for (const change of changes) {
    while (oldIndex < change.oldStart && newIndex < change.newStart && oldIndex < oldParts.length) {
      polygons.push(charRangeToPolygon(block, oldIndex, oldIndex + 1))
      added.push(false)
      oldIndex += 1
      newIndex += 1
    }
    const oldCount = change.oldEnd - change.oldStart
    const newCount = change.newEnd - change.newStart
    const sameLength = change.kind === 'replace' && oldCount === newCount && oldCount > 0
    if (sameLength) {
      for (let offset = 0; offset < newCount; offset += 1) {
        polygons.push(charRangeToPolygon(block, change.oldStart + offset, change.oldStart + offset + 1))
        added.push(false)
      }
    } else {
      for (let offset = 0; offset < newCount; offset += 1) {
        polygons.push(appendCharPolygon(block, appendSlot, imageWidth, imageHeight))
        added.push(true)
        appendSlot += 1
      }
    }
    oldIndex = change.oldEnd
    newIndex = change.newEnd
  }
  while (newIndex < newParts.length && oldIndex < oldParts.length) {
    polygons.push(charRangeToPolygon(block, oldIndex, oldIndex + 1))
    added.push(false)
    oldIndex += 1
    newIndex += 1
  }
  return { polygons, appendSlots: appendSlot, added }
}

/** Where each character of the edited line is drawn, in the same order as the target text. */
export function targetGraphemePolygons(
  block: Pick<OcrBlock, 'polygon' | 'originalText' | 'targetText'>,
  imageWidth = Number.POSITIVE_INFINITY,
  imageHeight = Number.POSITIVE_INFINITY,
): Point[][] {
  return layoutTargetGraphemes(block, imageWidth, imageHeight).polygons
}

/** The box for one cell. An empty cell sits where the next added character will be drawn. */
export function cellAnchorPolygon(
  block: Pick<OcrBlock, 'polygon' | 'originalText' | 'targetText'>,
  cells: string[],
  index: number,
  imageWidth = Number.POSITIVE_INFINITY,
  imageHeight = Number.POSITIVE_INFINITY,
): Point[] {
  const liveText = cells.filter((cell) => cell.length > 0).join('')
  const placed = layoutTargetGraphemes({ ...block, targetText: liveText || block.targetText }, imageWidth, imageHeight)
  const prior = cells.slice(0, index).filter((cell) => cell.length > 0).length
  if (cells[index]) return placed.polygons[prior] ?? block.polygon
  return appendCharPolygon(block, placed.appendSlots, imageWidth, imageHeight)
}

/** True when this cell is a character drawn beside the original line, not a glyph already on the picture. */
export function cellWasAdded(
  block: Pick<OcrBlock, 'polygon' | 'originalText' | 'targetText'>,
  cells: string[],
  index: number,
  imageWidth = Number.POSITIVE_INFINITY,
  imageHeight = Number.POSITIVE_INFINITY,
): boolean {
  if (!cells[index]) return false
  const liveText = cells.filter((cell) => cell.length > 0).join('')
  const placed = layoutTargetGraphemes({ ...block, targetText: liveText }, imageWidth, imageHeight)
  const prior = cells.slice(0, index).filter((cell) => cell.length > 0).length
  return placed.added[prior] === true
}

export function estimateFontSize(polygon: Point[]): number {
  return Math.max(12, polygonBounds(polygon).height * 0.78)
}

export function estimateTextWidth(text: string, fontSize: number): number {
  return segmentGraphemes(text).reduce((sum, grapheme) => sum + graphemeWeight(grapheme) * fontSize, 0)
}
