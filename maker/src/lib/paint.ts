import { applyFills, blurPolygon } from './compose'
import { centroid, polygonBounds } from './geometry'
import type { FreeText, Point, TextStyle } from '../types'

export type TextPatch = {
  polygon: Point[]
  color: [number, number, number, number]
  text: string
  style: TextStyle
  /** Smear the source pixels in this box. Used when a character cell is cleared. */
  blur?: boolean
  /** Draw the glyphs on the photo without covering them with a flat background. */
  textOnly?: boolean
}

/** Transparent layer of erasures and replacement text. Preview replays frames under this. */
export function paintOverlay(
  width: number,
  height: number,
  patches: TextPatch[],
  freeTexts: FreeText[],
  canvas: HTMLCanvasElement,
  source?: ImageData | null,
) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器不能创建画布，无法导出。')
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  } else {
    context.clearRect(0, 0, width, height)
  }
  for (const patch of patches) {
    if (patch.blur && source) stampBlur(context, source, patch.polygon)
    if (!patch.blur && !patch.textOnly) fillClipped(context, patch.polygon, patch.color)
    drawClippedText(context, patch.polygon, patch.text, patch.style)
  }
  for (const layer of freeTexts) drawFreeText(context, layer)
}

function blurRadius(polygon: Point[]): number {
  return Math.max(2, Math.round(polygonBounds(polygon).height * 0.42))
}

let blurStamp: HTMLCanvasElement | null = null

function stampBlur(context: CanvasRenderingContext2D, source: ImageData, polygon: Point[]) {
  const blurred = blurPolygon(source, polygon, blurRadius(polygon))
  if (!blurStamp) blurStamp = document.createElement('canvas')
  if (blurStamp.width !== source.width || blurStamp.height !== source.height) {
    blurStamp.width = source.width
    blurStamp.height = source.height
  }
  const stampContext = blurStamp.getContext('2d')
  if (!stampContext) return
  stampContext.putImageData(blurred, 0, 0)
  context.save()
  context.beginPath()
  polygon.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
  context.closePath()
  context.clip()
  context.drawImage(blurStamp, 0, 0)
  context.restore()
}

function fillClipped(context: CanvasRenderingContext2D, polygon: Point[], color: [number, number, number, number]) {
  if (polygon.length < 3) return
  context.save()
  context.beginPath()
  polygon.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
  context.closePath()
  context.clip()
  context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`
  context.fill()
  context.restore()
}

export function paintComposite(source: ImageData, patches: TextPatch[], freeTexts: FreeText[], canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器不能创建画布，无法导出。')
  if (canvas.width !== source.width || canvas.height !== source.height) {
    canvas.width = source.width
    canvas.height = source.height
  }
  let current = source
  for (const patch of patches) {
    if (!patch.blur) continue
    current = blurPolygon(current, patch.polygon, blurRadius(patch.polygon))
  }
  const fills = patches.filter((patch) => !patch.blur && !patch.textOnly).map((patch) => ({ polygon: patch.polygon, color: patch.color }))
  const filled = fills.length ? applyFills(current, fills) : current
  context.putImageData(filled, 0, 0)
  paintTextLayers(context, patches, freeTexts)
}

/** Draw the replacement glyphs and free text on top of already composited pixels.
 * The caller owns the transform, so scaled exports can paint text on the final grid.
 */
export function paintTextLayers(context: CanvasRenderingContext2D, patches: TextPatch[], freeTexts: FreeText[]) {
  for (const patch of patches) drawClippedText(context, patch.polygon, patch.text, patch.style)
  for (const layer of freeTexts) drawFreeText(context, layer)
}

function drawClippedText(context: CanvasRenderingContext2D, polygon: Point[], text: string, style: TextStyle) {
  if (!text) return
  const bounds = polygonBounds(polygon)
  const center = centroid(polygon)
  context.save()
  context.beginPath()
  polygon.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)))
  context.closePath()
  context.clip()
  const fontSize = fitFontSize(context, text, style, bounds.width)
  context.font = `${style.weight ?? 700} ${fontSize}px ${style.fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  if (style.stroke && style.strokeWidth) {
    context.strokeStyle = style.stroke
    context.lineWidth = style.strokeWidth
    context.strokeText(text, center.x, center.y)
  }
  context.fillStyle = style.fill
  context.fillText(text, center.x, center.y)
  context.restore()
}

function drawFreeText(context: CanvasRenderingContext2D, layer: FreeText) {
  if (!layer.text) return
  context.save()
  context.font = `${layer.textStyle.weight ?? 700} ${layer.textStyle.fontSize}px ${layer.textStyle.fontFamily}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.miterLimit = 2
  if (layer.textStyle.stroke && layer.textStyle.strokeWidth) {
    context.strokeStyle = layer.textStyle.stroke
    context.lineWidth = layer.textStyle.strokeWidth
    context.strokeText(layer.text, layer.x, layer.y)
  } else if (layer.textStyle.softOutline) {
    const size = layer.textStyle.fontSize
    context.shadowColor = 'rgba(40, 32, 24, 0.32)'
    context.shadowBlur = Math.max(2, size * 0.14)
    context.shadowOffsetY = Math.max(1, size * 0.03)
    context.strokeStyle = 'rgba(40, 32, 24, 0.22)'
    context.lineWidth = Math.max(2, size * 0.055)
    context.strokeText(layer.text, layer.x, layer.y)
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetY = 0
  }
  context.fillStyle = layer.textStyle.fill
  context.fillText(layer.text, layer.x, layer.y)
  context.restore()
}

function fitFontSize(context: CanvasRenderingContext2D, text: string, style: TextStyle, maxWidth: number): number {
  let size = style.fontSize
  context.font = `${style.weight ?? 700} ${size}px ${style.fontFamily}`
  const width = context.measureText(text).width
  if (width > maxWidth && width > 0) size = Math.max(8, size * (maxWidth / width))
  return size
}

export type StillMime = 'image/png' | 'image/jpeg' | 'image/webp'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
}

/** Keep the downloaded extension tied to the bytes the browser actually encoded. */
export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[mime.trim().toLowerCase()] ?? 'png'
}

export function editedDownloadName(name: string, extension: string): string {
  const base = name.trim().replace(/\.[^.]+$/, '') || 'chinesebqb'
  return `edited-${base}.${extension}`
}

type BlobCanvas = HTMLCanvasElement & { convertToBlob?: (options?: { type?: string; quality?: number }) => Promise<Blob> }

export async function canvasToImage(canvas: HTMLCanvasElement, mime: StillMime): Promise<Blob> {
  const target = canvas as BlobCanvas
  // Workers use OffscreenCanvas, which exposes convertToBlob instead of toBlob.
  if (typeof target.convertToBlob === 'function') {
    try {
      return await target.convertToBlob({ type: mime, quality: mime === 'image/jpeg' ? 0.92 : undefined })
    } catch (error) {
      if (mime === 'image/png') throw error
      return target.convertToBlob({ type: 'image/png' })
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, mime === 'image/png' ? undefined : 0.92)
  })
  if (!blob) throw new Error('导出失败，请换一张较小的图片再试。')
  return blob
}

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasToImage(canvas, 'image/png')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export async function copyBlob(blob: Blob): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('这个浏览器不能把图片写入剪贴板，请改用下载 PNG。')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
