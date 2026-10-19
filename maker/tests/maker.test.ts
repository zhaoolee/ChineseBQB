import { describeChange, diffText } from '../src/lib/diff'
import { containTransform, deviceToImage, imageToScreen, polygonBounds, screenToImage } from '../src/lib/geometry'
import { appendCharPolygon, cellAnchorPolygon, cellWasAdded, charRangeToPolygon, originalGlyphFractions, paddedCharPolygon } from '../src/lib/char-layout'
import { luminance, sampleBackground, sampleInk } from '../src/lib/background'
import { applyFills, blurPolygon, countDifferences, restoreOutside } from '../src/lib/compose'
import { activePatches, addedTextStyle, liveRedraw, planBlockEdit } from '../src/lib/plan'
import { createHistory, historyCommit, historyRedo, historyUndo } from '../src/lib/history'
import { decideCatalogSrc, matchesQuery, normalizeQueryPath, readCatalog, siteAsset, siteBaseFrom, makerBaseUrl } from '../src/lib/catalog'
import { composeGifFrames, decodeGifFrames, encodeGif } from '../src/lib/gif'
import { sniffImage } from '../src/lib/image'
import { editedDownloadName, inheritedStillExport } from '../src/lib/paint'
import { imageFileFromClipboard } from '../src/lib/clipboard'
import { OCR_MODEL_FILES, normalizeOcrItems, ocrModelUrl, scaleOcrBlocks } from '../src/lib/ocr'
import { spreadCellValue } from '../src/lib/grapheme'
import { freeTextBox, scaledFontSize, textBoxHandles } from '../src/lib/free-text-box'
import type { OcrBlock, Point } from '../src/types'

if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray
    width: number
    height: number
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data
      this.width = width
      this.height = height
    }
  }
  globalThis.ImageData = ImageDataPolyfill as unknown as typeof ImageData
}

const text = '小明，我想打你'
const polygon: OcrBlock['polygon'] = [
  { x: 20, y: 30 },
  { x: 400, y: 30 },
  { x: 400, y: 110 },
  { x: 20, y: 110 },
]

function block(original: string, target = original, extra: Partial<OcrBlock> = {}): OcrBlock {
  return {
    id: 'b1',
    originalText: original,
    targetText: target,
    score: 0.9,
    polygon,
    layout: 'horizontal',
    enabled: true,
    applyLocal: true,
    lineRedraw: false,
    textStyle: {
      fontFamily: 'sans-serif',
      fontSize: 48,
      fill: '#111111',
      stroke: '#ffffff',
      strokeWidth: 0,
      weight: 700,
    },
    ...extra,
  }
}

function solidImage(width: number, height: number, color: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = color[0]
    data[index + 1] = color[1]
    data[index + 2] = color[2]
    data[index + 3] = color[3]
  }
  return new ImageData(data, width, height)
}

function paintInk(image: ImageData, item: OcrBlock) {
  const parts = [...item.originalText]
  parts.forEach((_, index) => {
    const box = charRangeToPolygon(item, index, index + 1)
    const xs = box.map((point) => point.x)
    const ys = box.map((point) => point.y)
    applyFills(image, []).data
    const patch = [{
      polygon: [
        { x: Math.min(...xs) + 5, y: Math.min(...ys) + 8 },
        { x: Math.max(...xs) - 5, y: Math.min(...ys) + 8 },
        { x: Math.max(...xs) - 5, y: Math.max(...ys) - 8 },
        { x: Math.min(...xs) + 5, y: Math.max(...ys) - 8 },
      ],
      color: [0, 0, 0, 255] as [number, number, number, number],
    }]
    const filled = applyFills(image, patch)
    image.data.set(filled.data)
  })
}

describe('diff', () => {
  it('replaces only the changed character', () => {
    const changes = diffText('小明，我想打你', '小红，我想打你')
    expect(changes).toEqual([expect.objectContaining({ kind: 'replace', oldText: '明', newText: '红' })])
    expect(changes).toHaveLength(1)
  })

  it('inserts without marking the tail as replaced', () => {
    expect(diffText('今天上班', '今天不上班').map(describeChange)).toEqual(['插入「不」'])
  })

  it('deletes a suffix and a repeated character', () => {
    expect(diffText('我要上班', '我要').map((change) => change.oldText)).toEqual(['上班'])
    expect(diffText('哈哈哈哈', '哈哈哈')).toEqual([expect.objectContaining({ kind: 'delete', oldText: '哈' })])
  })

  it('returns no edits for identical text, including emoji and separated edits', () => {
    expect(diffText('你好', '你好')).toEqual([])
    expect(diffText('🐱很可爱', '🐶很可爱')).toEqual([expect.objectContaining({ kind: 'replace', oldText: '🐱', newText: '🐶' })])
    expect(diffText('ABC小明', 'ABC小红').map((change) => change.oldText)).toEqual(['明'])
    const separated = diffText('甲乙丙丁', '甲午丙未')
    expect(separated.map((change) => `${change.oldText}→${change.newText}`)).toEqual(['乙→午', '丁→未'])
  })
})

describe('catalog urls', () => {
  const hash = 'a'.repeat(64)
  const images = readCatalog([
    { name: 'a.png', src: `media/${hash}.png`, thumb: `thumbs/${hash}.webp`, label: '熊猫', animated: false, categoryTitle: '人工智能' },
    { name: 'b.gif', src: `media/${'b'.repeat(64)}.gif`, thumb: `thumbs/${'b'.repeat(64)}.webp`, label: '动图', animated: true, categoryTitle: '人工智能' },
    { name: 'bad', src: 'https://evil.example/x.png', thumb: 'thumbs/no.webp' },
  ])

  it('rejects remote, traversal and scheme-relative sources', () => {
    for (const raw of ['https://evil.example/x.png', '../../', '//evil.example/x', 'media/../secret.png', `media/${hash}.png?x=1`]) {
      expect(normalizeQueryPath(raw)).toBeNull()
      expect(decideCatalogSrc(raw, images).ok).toBe(false)
    }
  })

  it('accepts indexed media and opens an animated file on its current frame', () => {
    expect(decideCatalogSrc(`media/${hash}.png`, images)).toMatchObject({ ok: true })
    expect(decideCatalogSrc(`media/${'b'.repeat(64)}.gif`, images)).toMatchObject({ ok: true })
    expect(decideCatalogSrc(`media/${'c'.repeat(64)}.png`, images).ok).toBe(false)
  })

  it('resolves catalog assets from the Hugo parent of the maker base', () => {
    const site = siteBaseFrom(makerBaseUrl('/ChineseBQB/maker/', 'https://zhaoolee.com'))
    expect(siteAsset('catalog/search.json', site)).toBe('https://zhaoolee.com/ChineseBQB/catalog/search.json')
    expect(siteAsset(`media/${hash}.png`, site)).toBe(`https://zhaoolee.com/ChineseBQB/media/${hash}.png`)
  })

  it('searches name and category the same way as the gallery', () => {
    expect(images.filter((image) => matchesQuery(image, '熊猫 人工智能'))).toHaveLength(1)
    expect(matchesQuery({ ...images[0], label: '假笑男孩00001-拽', name: '假笑男孩00001-拽.jpg' }, '拽')).toBe(true)
    expect(matchesQuery(images[0], '拽')).toBe(false)
  })
})

describe('geometry', () => {
  it('round-trips wide, tall and high-dpr pointer coordinates', () => {
    const wide = containTransform(400, 100, 200, 200, 1, 0, 0, 2)
    const tall = containTransform(100, 400, 200, 200, 1, 12, -4, 1)
    const css = imageToScreen({ x: 10, y: 20 }, wide)
    expect(screenToImage(css, wide)).toEqual({ x: 10, y: 20 })
    const device = deviceToImage(css.x * wide.dpr, css.y * wide.dpr, wide)
    expect(device.x).toBeCloseTo(10)
    expect(device.y).toBeCloseTo(20)
    const tallPoint = imageToScreen({ x: 40, y: 80 }, tall)
    expect(screenToImage(tallPoint, tall).x).toBeCloseTo(40)
    expect(screenToImage(tallPoint, tall).y).toBeCloseTo(80)
  })

  it('keeps an edge character box inside the image', () => {
    const edge = paddedCharPolygon(block(text), 6, 7, 30, 410, 120)
    expect(Math.max(...edge.map((point: Point) => point.x))).toBeLessThanOrEqual(410)
    expect(Math.max(...edge.map((point: Point) => point.y))).toBeLessThanOrEqual(120)
    expect(Math.min(...edge.map((point: Point) => point.x))).toBeGreaterThanOrEqual(0)
  })

  it('ignores photo edges split into three uneven runs and keeps the OCR middle third', () => {
    const frame = solidImage(420, 140, [90, 90, 90, 255])
    const line: OcrBlock['polygon'] = [
      { x: 20, y: 30 },
      { x: 320, y: 30 },
      { x: 320, y: 110 },
      { x: 20, y: 110 },
    ]
    const strip = (x0: number, x1: number, color: [number, number, number, number]) => ({
      polygon: [
        { x: x0, y: 30 },
        { x: x1, y: 30 },
        { x: x1, y: 110 },
        { x: x0, y: 110 },
      ] as OcrBlock['polygon'],
      color,
    })
    // Every strip is at least 80 away from the gray frame, so the scan treats
    // them as ink. They are 200, 3 and 94 pixels wide with 1-2 pixel gaps.
    const painted = applyFills(frame, [
      strip(20, 220, [200, 200, 200, 255]),
      strip(221, 224, [160, 160, 160, 255]),
      strip(226, 320, [140, 140, 140, 255]),
    ])
    const photo = block('照片字', '照片字', { polygon: line })
    expect(originalGlyphFractions(painted, line, 3)).toBeNull()
    const middle = polygonBounds(paddedCharPolygon(photo, 1, 2, 4, painted.width, painted.height, painted))
    expect(middle.width).toBeCloseTo((320 - 20) / 3)
  })
})

describe('local replacement', () => {
  it('changes only the estimated box for 明 → 红 on a flat background', () => {
    const source = solidImage(420, 140, [255, 255, 255, 255])
    const original = block(text)
    paintInk(source, original)
    const edited = block(text, '小红，我想打你')
    const plan = planBlockEdit(edited, source)
    expect(plan.safety).toBe('safe')
    expect(plan.changes.map((change) => change.oldText)).toEqual(['明'])
    expect(plan.regions[0]?.estimated).toBe(true)
    const patches = activePatches(edited, plan)
    expect(patches).toHaveLength(1)
    const filled = applyFills(source, patches)
    const ink = { x: 0, y: 0 }
    const box = charRangeToPolygon(original, 1, 2)
    ink.x = (box[0].x + box[1].x) / 2
    ink.y = (box[0].y + box[3].y) / 2
    const marked = applyFills(filled, [{ polygon: [
      { x: ink.x - 4, y: ink.y - 4 },
      { x: ink.x + 4, y: ink.y - 4 },
      { x: ink.x + 4, y: ink.y + 4 },
      { x: ink.x - 4, y: ink.y + 4 },
    ], color: [220, 0, 0, 255] }])
    const output = restoreOutside(source, marked, patches.map((patch) => patch.polygon))
    expect(countDifferences(source, output, patches.map((patch) => patch.polygon))).toBe(0)
    expect(countDifferences(source, output)).toBeGreaterThan(0)
    const neighbor = charRangeToPolygon(original, 0, 1)
    const neighborX = Math.round((neighbor[0].x + neighbor[1].x) / 2)
    const neighborY = Math.round((neighbor[0].y + neighbor[3].y) / 2)
    const index = (neighborY * source.width + neighborX) * 4
    expect(output.data[index]).toBe(source.data[index])
  })

  it('blurs only a cleared character and keeps added characters off the original line', () => {
    const source = solidImage(420, 140, [210, 220, 230, 255])
    expect(planBlockEdit(block(text, text), source).safety).toBe('none')
    expect(activePatches(block(text, text), planBlockEdit(block(text, text), source))).toEqual([])

    const removed = charRangeToPolygon(block('今天上班'), 2, 3)
    const inkX = Math.round((removed[0].x + removed[1].x) / 2)
    const inkY = Math.round((removed[0].y + removed[3].y) / 2)
    source.data[(inkY * source.width + inkX) * 4] = 0

    const deleted = planBlockEdit(block('今天上班', '今天班'), source)
    expect(deleted.regions.filter((region) => region.blur)).toHaveLength(1)
    expect(deleted.regions.filter((region) => !region.blur)).toHaveLength(0)
    expect(deleted.message).toContain('只模糊')
    const redraw = liveRedraw(block('今天上班', '今天班'), source)
    expect(redraw.lineRedraw).toBe(false)
    expect(redraw.applyLocal).toBe(true)
    const patches = activePatches(block('今天上班', '今天班'), deleted)
    expect(patches).toHaveLength(1)
    expect(patches[0]?.blur).toBe(true)
    expect(patches[0]?.text).toBe('')
    expect(polygonBounds(patches[0].polygon).width).toBeLessThan(120)
    const blurred = blurPolygon(source, patches[0].polygon, 4)
    expect(countDifferences(source, blurred, [patches[0].polygon])).toBe(0)
    expect(blurred.data[(inkY * source.width + inkX) * 4]).toBeGreaterThan(0)
    const kept = charRangeToPolygon(block('今天上班'), 0, 1)
    const keptX = Math.round((kept[0].x + kept[1].x) / 2)
    const keptY = Math.round((kept[0].y + kept[3].y) / 2)
    expect(blurred.data[(keptY * source.width + keptX) * 4]).toBe(source.data[(keptY * source.width + keptX) * 4])

    const appended = planBlockEdit(block('今天上班', '今天上班呀'), source)
    expect(appended.regions.map((region) => region.change.newText)).toEqual(['呀'])
    expect(appended.regions[0]?.blur).toBeFalsy()
    expect(polygonBounds(appended.regions[0].polygon).minX).toBeGreaterThan(400)
    expect(liveRedraw(block('今天上班', '今天上班呀'), source).lineRedraw).toBe(false)
    expect(liveRedraw(block('今天上班', '今天不上班'), source).lineRedraw).toBe(false)
    expect(liveRedraw(block(text, '小红，我想打你'), source).lineRedraw).toBe(false)
    expect(liveRedraw(block(text, text), source)).toMatchObject({ lineRedraw: false, applyLocal: false })
    const extra = appendCharPolygon(block('今天上班'), 0, source.width, source.height)
    expect(polygonBounds(extra).minX).toBeGreaterThan(400)
  })

  it('puts an added character beside the original one', () => {
    const source = solidImage(420, 140, [255, 255, 255, 255])
    const line = block('拽', '拽了')
    const first = cellAnchorPolygon(line, ['拽', '了'], 0, source.width, source.height)
    const second = cellAnchorPolygon(line, ['拽', '了'], 1, source.width, source.height)
    expect(polygonBounds(first).maxX).toBeLessThanOrEqual(400)
    expect(polygonBounds(second).minX).toBeGreaterThan(400)
    expect(polygonBounds(first).maxX).toBeLessThan(polygonBounds(second).minX)
    expect(cellWasAdded(line, ['拽', '了'], 0, source.width, source.height)).toBe(false)
    expect(cellWasAdded(line, ['拽', '了'], 1, source.width, source.height)).toBe(true)
    const patches = activePatches(line, planBlockEdit(line, source))
    expect(patches.map((patch) => patch.text)).toEqual(['了'])
    expect(patches[0]?.textOnly).toBe(true)
  })

  it('uses the original ink color for a character added after the line', () => {
    const source = solidImage(420, 140, [80, 110, 160, 255])
    const painted = applyFills(source, [{ polygon, color: [250, 250, 250, 255] }])
    const added = liveRedraw(block('今天上班', '今天上班呀'), painted)
    expect(added.textStyle.fill).toBe('#fafafa')
    const replaced = liveRedraw({ ...block('今天上班', '明天上班'), textStyle: added.textStyle }, painted)
    expect(replaced.textStyle.fill).toBe('#fafafa')
    const light = solidImage(420, 140, [214, 208, 198, 255])
    const whiteInk = applyFills(light, [{ polygon, color: [250, 250, 250, 255] }])
    const turned = liveRedraw(block('今天上班', '明天上班'), whiteInk)
    expect(turned.textStyle.fill).toBe('#fafafa')
    const speckled = applyFills(whiteInk, [{
      polygon: [{ x: 30, y: 40 }, { x: 55, y: 40 }, { x: 55, y: 65 }, { x: 30, y: 65 }],
      color: [12, 12, 12, 255],
    }])
    expect(liveRedraw(block('今天上班', '明天上班'), speckled).textStyle.fill).toBe('#fafafa')
    const edited = { ...block('今天上班', '明天上班'), applyLocal: true }
    const patches = activePatches(edited, planBlockEdit(edited, whiteInk), whiteInk)
    expect(patches[0]?.blur).toBe(false)
    expect(patches[0]?.text).toBe('明')
    expect(patches[0]?.style.fill).toBe('#fafafa')
    const chosen = liveRedraw(block('今天上班', '今天上班呀', {
      styleCustomized: true,
      textStyle: { ...block('今天上班').textStyle, fill: '#ff0000' },
    }), painted)
    expect(chosen.textStyle.fill).toBe('#ff0000')
  })

  it('covers the original wide glyph when a narrower letter replaces it', () => {
    const source = solidImage(160, 40, [30, 70, 150, 255])
    const line: OcrBlock['polygon'] = [
      { x: 10, y: 8 },
      { x: 150, y: 8 },
      { x: 150, y: 32 },
      { x: 10, y: 32 },
    ]
    const glyph = (x0: number, x1: number) => ({
      polygon: [
        { x: x0, y: 12 },
        { x: x1, y: 12 },
        { x: x1, y: 28 },
        { x: x0, y: 28 },
      ] as OcrBlock['polygon'],
      color: [245, 245, 245, 255] as [number, number, number, number],
    })
    let painted = source
    for (const item of [glyph(16, 55), glyph(62, 74), glyph(80, 92), glyph(98, 108), glyph(114, 128)]) {
      painted = applyFills(painted, [item])
    }
    const plan = planBlockEdit(block('What?', 'Qhat?', { polygon: line }), painted)
    const box = polygonBounds(plan.regions[0].polygon)
    expect(box.minX).toBeLessThan(18)
    expect(box.maxX).toBeGreaterThan(52)
    expect(box.maxX).toBeLessThan(62)
  })

  it('leaves the question mark in place when only the letters before it change', () => {
    const source = solidImage(70, 28, [0, 0, 0, 255])
    const line: OcrBlock['polygon'] = [
      { x: 4, y: 2 },
      { x: 64, y: 2 },
      { x: 64, y: 26 },
      { x: 4, y: 26 },
    ]
    const mark = (x0: number, x1: number, y0 = 6, y1 = 20) => ({
      polygon: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ] as OcrBlock['polygon'],
      color: [250, 250, 250, 255] as [number, number, number, number],
    })
    let painted = source
    for (const item of [
      mark(6, 18),
      mark(22, 32),
      mark(36, 44),
      mark(48, 52),
      mark(53, 55, 12, 14),
      mark(56, 62),
      mark(63, 64, 6, 8),
    ]) {
      painted = applyFills(painted, [item])
    }
    const plan = planBlockEdit(block('What?', 'Milk?', { polygon: line }), painted)
    const box = polygonBounds(plan.regions[0].polygon)
    expect(plan.regions[0]?.change.newText).toBe('Milk')
    expect(box.maxX).toBeGreaterThan(48)
    expect(box.maxX).toBeLessThan(56)
  })

  it('covers a replaced character with the paper under it', () => {
    const paper = solidImage(80, 50, [250, 250, 250, 255])
    const photo = applyFills(paper, [{
      polygon: [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 20 }, { x: 0, y: 20 }],
      color: [140, 140, 140, 255],
    }])
    const line: OcrBlock['polygon'] = [
      { x: 8, y: 22 },
      { x: 72, y: 22 },
      { x: 72, y: 42 },
      { x: 8, y: 42 },
    ]
    const painted = applyFills(photo, [{
      polygon: [{ x: 24, y: 26 }, { x: 40, y: 26 }, { x: 40, y: 38 }, { x: 24, y: 38 }],
      color: [12, 12, 12, 255],
    }])
    const plan = planBlockEdit(block('你', '*', { polygon: line }), painted)
    const color = plan.regions[0]?.color ?? [0, 0, 0, 0]
    expect(color[0]).toBeGreaterThan(230)
    expect(color[1]).toBeGreaterThan(230)
    expect(color[2]).toBeGreaterThan(230)
  })

  it('covers a character with the white margin when the stroke fringe is gray', () => {
    const paper = solidImage(48, 40, [248, 248, 248, 255])
    const line: OcrBlock['polygon'] = [
      { x: 4, y: 4 },
      { x: 44, y: 4 },
      { x: 44, y: 36 },
      { x: 4, y: 36 },
    ]
    const fringed = applyFills(paper, [{
      polygon: [{ x: 4, y: 14 }, { x: 44, y: 14 }, { x: 44, y: 28 }, { x: 4, y: 28 }],
      color: [134, 134, 134, 255],
    }])
    const painted = applyFills(fringed, [{
      polygon: [{ x: 16, y: 16 }, { x: 30, y: 16 }, { x: 30, y: 26 }, { x: 16, y: 26 }],
      color: [12, 12, 12, 255],
    }])
    const plan = planBlockEdit(block('妈', '*', { polygon: line }), painted)
    const color = plan.regions[0]?.color ?? [0, 0, 0, 0]
    expect(color[0]).toBeGreaterThan(220)
    expect(color[1]).toBeGreaterThan(220)
    expect(color[2]).toBeGreaterThan(220)
  })

  it('reads light glyphs on a dark panel instead of the panel', () => {
    const source = solidImage(100, 50, [30, 70, 150, 255])
    const panel: OcrBlock['polygon'] = [
      { x: 10, y: 12 },
      { x: 90, y: 12 },
      { x: 90, y: 38 },
      { x: 10, y: 38 },
    ]
    const painted = applyFills(applyFills(source, [{ polygon: panel, color: [6, 6, 6, 255] }]), [{
      polygon: [{ x: 28, y: 18 }, { x: 72, y: 18 }, { x: 72, y: 32 }, { x: 28, y: 32 }],
      color: [236, 236, 236, 255],
    }])
    expect(luminance(sampleInk(painted, panel)!)).toBeGreaterThan(180)
    const turned = liveRedraw(block('What?', 'When?', { polygon: panel }), painted)
    expect(turned.textStyle.fill).toBe('#ececec')
  })

  it('prefers light ink over a larger dark photo region by contrast instead of count', () => {
    const frame = solidImage(100, 60, [30, 30, 30, 255])
    const panel: OcrBlock['polygon'] = [
      { x: 10, y: 10 },
      { x: 90, y: 10 },
      { x: 90, y: 50 },
      { x: 10, y: 50 },
    ]
    const rect = (x0: number, y0: number, x1: number, y1: number, color: [number, number, number, number]) => ({
      polygon: [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ] as Point[],
      color,
    })
    // 312 dark pixels in two shades outnumber the 144 white glyph pixels, so a
    // raw count sort picks the photo; the white ink has far more contrast.
    const painted = applyFills(frame, [
      rect(14, 14, 40, 26, [76, 76, 76, 255]),
      rect(26, 14, 32, 26, [90, 90, 90, 255]),
      rect(52, 22, 64, 34, [245, 245, 245, 255]),
    ])
    let photoPixels = 0
    let glyphPixels = 0
    for (let index = 0; index < painted.data.length; index += 4) {
      if (painted.data[index] === 245) glyphPixels += 1
      else if (painted.data[index] === 76 || painted.data[index] === 90) photoPixels += 1
    }
    expect(photoPixels).toBe(312)
    expect(glyphPixels).toBe(144)
    expect(photoPixels).toBeGreaterThan(glyphPixels)
    const ink = sampleInk(painted, panel)!
    expect(ink[0]).toBeGreaterThan(230)
    expect(luminance(ink)).toBeGreaterThan(200)
  })

  it('keeps replacement text when softening a varied photo background', () => {
    const source = solidImage(420, 140, [0, 0, 0, 255])
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const value = Math.round(x / source.width * 255)
        source.data.set([value, value, value, 255], (y * source.width + x) * 4)
      }
    }
    const edited = block('说人话', '说猫话')
    const patches = activePatches(edited, planBlockEdit(edited, source), source)
    expect(patches).toHaveLength(1)
    expect(patches[0]).toMatchObject({ text: '猫', blur: true, textOnly: false })
    const blurred = blurPolygon(source, patches[0].polygon, 20)
    expect(countDifferences(source, blurred, [patches[0].polygon])).toBe(0)
  })

  it('marks a noisy background as review and samples a flat gray field', () => {
    const noisy = solidImage(80, 80, [255, 255, 255, 255])
    for (let i = 0; i < noisy.data.length; i += 4) noisy.data[i] = (i * 13) % 255
    const item = block('小明', '小红', {
      polygon: [{ x: 10, y: 20 }, { x: 70, y: 20 }, { x: 70, y: 60 }, { x: 10, y: 60 }],
    })
    expect(planBlockEdit(item, noisy).safety).toBe('review')
    const gray = solidImage(80, 80, [180, 180, 180, 255])
    const sample = sampleBackground(gray, item.polygon)
    expect(sample.solid).toBe(true)
    expect(sample.color[0]).toBeGreaterThan(170)
  })
})

describe('history and image sniffing', () => {
  it('undo and redo restore text snapshots without a place to store image bytes', () => {
    let history = createHistory({ blocks: ['小明'], freeTexts: [] as string[] })
    const image = { bytes: new Uint8Array([1, 2, 3]) }
    history = historyCommit(history, { blocks: ['小红'], freeTexts: [] })
    history = historyUndo(history)
    expect(history.present.blocks).toEqual(['小明'])
    history = historyRedo(history)
    expect(history.present.blocks).toEqual(['小红'])
    expect(image.bytes[0]).toBe(1)
    expect(JSON.stringify(history)).not.toContain('bytes')
  })

  it('normalizes OCR polygons and rejects animated files', () => {
    const blocks = normalizeOcrItems([
      { text: '小明，我想打你', score: 0.4, poly: [[1, 2], [30, 2], [30, 20], [1, 20]] },
      { text: '  ', score: 1, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    ])
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.targetText).toBe(blocks[0]?.originalText)
    expect(blocks[0]?.polygon).toHaveLength(4)
    const caption = normalizeOcrItems([
      { text: '说人', score: 1, poly: [[94, 558], [452, 558], [452, 754], [94, 754]] },
      { text: '话', score: 1, poly: [[397, 566], [591, 566], [591, 747], [397, 747]] },
      { text: '1', score: 0.5, poly: [[200, 300], [230, 300], [230, 340], [200, 340]] },
    ])
    expect(caption.map((block) => block.originalText)).toEqual(['说人话'])
    const watermarked = normalizeOcrItems([
      { text: '不想说话', score: 1, poly: [[20, 300], [400, 300], [400, 390], [20, 390]] },
      { text: '@NAN凯星', score: 1, poly: [[350, 370], [440, 370], [440, 390], [350, 390]] },
    ])
    expect(watermarked.map((block) => block.originalText)).toEqual(['不想说话', '@NAN凯星'])
    expect(sniffImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), 'image/gif').animated).toBe(true)
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 'image/png').animated).toBe(false)
  })

  it('composes a GIF so a cleared frame does not hide the next one', () => {
    const solid = (width: number, height: number, color: number[], left = 0, top = 0, disposal = 1) => {
      const patch = new Uint8ClampedArray(width * height * 4)
      for (let index = 0; index < patch.length; index += 4) {
        patch[index] = color[0]
        patch[index + 1] = color[1]
        patch[index + 2] = color[2]
        patch[index + 3] = color[3]
      }
      return { dims: { width, height, left, top }, delay: 10, disposalType: disposal, patch }
    }
    const frames = composeGifFrames(2, 1, [
      solid(2, 1, [255, 0, 0, 255], 0, 0, 2),
      solid(1, 1, [0, 0, 255, 255]),
    ])
    expect(frames[0]?.imageData.data[0]).toBe(255)
    expect(frames[1]?.imageData.data[2]).toBe(255)
    expect(frames[1]?.imageData.data[4]).toBe(0)
  })

  it('encodes every GIF frame and reads them back', () => {
    const red = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]), 2, 1)
    const blue = new ImageData(new Uint8ClampedArray([0, 0, 255, 255, 0, 0, 255, 255]), 2, 1)
    const decoded = decodeGifFrames(encodeGif([
      { imageData: red, delayMs: 100 },
      { imageData: blue, delayMs: 80 },
    ]))
    expect(decoded.frames).toHaveLength(2)
    expect(decoded.frames[0]?.imageData.data[0]).toBeGreaterThan(decoded.frames[0]?.imageData.data[2] ?? 0)
    expect(decoded.frames[1]?.imageData.data[2]).toBeGreaterThan(decoded.frames[1]?.imageData.data[0] ?? 0)
    expect(decoded.frames[1]?.delayMs).toBeGreaterThan(20)
  })

  it('loads OCR weights from the maker site, not a model CDN', () => {
    expect(ocrModelUrl(OCR_MODEL_FILES.det, '/ChineseBQB/maker/')).toBe('/ChineseBQB/maker/models/PP-OCRv5_mobile_det_onnx_infer.tar')
    expect(ocrModelUrl(OCR_MODEL_FILES.rec, '/ChineseBQB/maker')).toBe('/ChineseBQB/maker/models/PP-OCRv5_mobile_rec_onnx_infer.tar')
    expect(ocrModelUrl(OCR_MODEL_FILES.det, '/ChineseBQB/maker/')).not.toMatch(/^https?:/)
  })

  it('maps an upscaled OCR box back onto the original image', () => {
    const [block] = normalizeOcrItems([{ text: '啊', score: 0.9, poly: [[0, 0], [40, 0], [40, 20], [0, 20]] }])
    const [scaled] = scaleOcrBlocks([block], 4)
    expect(scaled?.polygon.map((point) => [point.x, point.y])).toEqual([[0, 0], [10, 0], [10, 5], [0, 5]])
  })
})

describe('character cells', () => {
  it('turns several characters typed into one cell into one cell each', () => {
    expect(spreadCellValue([''], 0, '你好')).toEqual({ cells: ['你', '好'], focus: 1 })
    expect(spreadCellValue(['拽'], 0, '拽了啊')).toEqual({ cells: ['拽', '了', '啊'], focus: 2 })
    expect(spreadCellValue(['拽', '了'], 0, '哈')).toEqual({ cells: ['哈', '了'], focus: 0 })
    expect(spreadCellValue(['你', '好'], 1, '')).toEqual({ cells: ['你', ''], focus: 1 })
  })
})

describe('added text color', () => {
  const fontBox: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 40 },
    { x: 0, y: 40 },
  ]

  it('copies the original ink when the picture already has text', () => {
    const source = solidImage(420, 140, [214, 208, 198, 255])
    const painted = applyFills(source, [{ polygon, color: [250, 250, 250, 255] }])
    const style = addedTextStyle(painted, [block('今天上班')], fontBox)
    expect(style.fill).toBe('#fafafa')
    expect(style.softOutline).toBe(false)
  })

  it('uses white text with a soft outline when the picture has no text', () => {
    const source = solidImage(80, 80, [180, 60, 50, 255])
    const style = addedTextStyle(source, [], fontBox)
    expect(style.fill).toBe('#ffffff')
    expect(style.softOutline).toBe(true)
    expect(style.strokeWidth).toBe(0)
  })
})

describe('free text box', () => {
  const layer = {
    text: '新文字',
    x: 200,
    y: 100,
    textStyle: {
      fontFamily: 'sans-serif',
      fontSize: 40,
      fill: '#111111',
      weight: 700,
    },
  }

  it('wraps the text with eight handles', () => {
    const box = freeTextBox(layer)
    const handles = textBoxHandles(box)
    expect(handles).toHaveLength(8)
    expect(handles.map((handle) => handle.name)).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'])
    expect(box.minX).toBeLessThan(layer.x)
    expect(box.maxX).toBeGreaterThan(layer.x)
    expect(handles[0]?.x).toBe(box.minX)
    expect(handles[0]?.y).toBe(box.minY)
  })

  it('changes font size from the center when a handle is dragged', () => {
    const box = freeTextBox(layer)
    const corner = textBoxHandles(box).find((handle) => handle.name === 'se')
    expect(corner).toBeTruthy()
    const center = { x: layer.x, y: layer.y }
    const grown = scaledFontSize(40, 'se', center, corner!, {
      x: center.x + (corner!.x - center.x) * 2,
      y: center.y + (corner!.y - center.y) * 2,
    })
    expect(grown).toBe(80)
    const edge = textBoxHandles(box).find((handle) => handle.name === 'e')
    expect(scaledFontSize(40, 'e', center, edge!, { x: center.x + (edge!.x - center.x) / 2, y: center.y })).toBe(20)
    expect(scaledFontSize(40, 'se', center, corner!, { x: 99999, y: 99999 })).toBe(400)
  })
})

describe('export format', () => {
  it('keeps jpeg, png, and webp instead of renaming everything to png', () => {
    expect(inheritedStillExport('image/jpeg', '假笑男孩00001-拽')).toEqual({ mime: 'image/jpeg', extension: 'jpg' })
    expect(inheritedStillExport('', 'media/abc.jpg', '假笑男孩00001-拽')).toEqual({ mime: 'image/jpeg', extension: 'jpg' })
    expect(inheritedStillExport('image/png', 'shot.png')).toEqual({ mime: 'image/png', extension: 'png' })
    expect(inheritedStillExport('image/webp', 'sticker.webp')).toEqual({ mime: 'image/webp', extension: 'webp' })
    expect(editedDownloadName('假笑男孩00001-拽.jpg', 'jpg')).toBe('edited-假笑男孩00001-拽.jpg')
    expect(editedDownloadName('shot.png', 'png')).toBe('edited-shot.png')
  })
})

describe('clipboard paste', () => {
  it('takes an image file and leaves plain text alone', () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'shot.png', { type: 'image/png' })
    const imagePaste = {
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
      files: [],
    } as unknown as DataTransfer
    const textPaste = {
      items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
      files: [],
    } as unknown as DataTransfer
    expect(imageFileFromClipboard(imagePaste)).toBe(file)
    expect(imageFileFromClipboard(textPaste)).toBeNull()
    expect(imageFileFromClipboard(null)).toBeNull()
  })
})
