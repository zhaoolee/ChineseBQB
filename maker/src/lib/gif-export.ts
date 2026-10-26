import { createEditableGifFrames, encodeGif, encodeGifAsync, type GifFrame } from './gif'
import { canvasToImage, paintComposite, paintTextLayers, type StillMime, type TextPatch } from './paint'
import { collectPatches } from './plan'
import { editsAtFrame, type TimedEdits } from './timeline'
import type { FreeText, OcrBlock, Point } from '../types'
import { encodeWechatGif, stickerBounds, stickerFramePlan, WECHAT_GIF_MAX_BYTES, type FittedGif, type StickerFrame } from './wechat-gif'
import { improveGifMotion } from './gif-motion'
import { resizeGif } from './resize-area'
import { sniffImage } from './image'
import { quantize } from 'gifenc'

export type GifExportProgress = { stage: 'prepare' | 'encode' | 'motion'; completed: number; total: number; attempt?: number }
export type GifExportOptions = { onProgress?: (progress: GifExportProgress) => void }

/** A static editing source is already on the editor canvas: its pixels are sent
 * as one frame instead of re-decoding the original file at a possibly different
 * size. Animated sources stay compressed and are decoded lazily in the worker.
 * Native mode keeps the compressed source because the editor may only hold a
 * downscaled preview; the worker composites edits on the real source pixels.
 */
export type NativeExportInput = { mode: 'native'; source: Blob; editWidth: number; editHeight: number }
export type EditableExportInput =
  | ({ mode?: 'wechat' } & ({ source: Blob } | { imageData: ImageData }))
  | NativeExportInput

// One frame needs a non-zero delay for viewers that ignore zero-delay frames;
// there is no second frame, so the exported sticker remains visually static.
export const STILL_GIF_DELAY_MS = 100

export async function exportGif(frames: GifFrame[], patches: TextPatch[], texts: FreeText[], select?: (frame: GifFrame, index: number) => { patches: TextPatch[]; texts: FreeText[] }): Promise<Blob> {
  const canvas = document.createElement('canvas')
  async function* painted() {
    for (const [index, frame] of frames.entries()) {
      const edits = select?.(frame, index) ?? { patches, texts }
      paintComposite(frame.imageData, edits.patches, edits.texts, canvas)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('浏览器不能创建画布，无法导出。')
      yield { imageData: context.getImageData(0, 0, canvas.width, canvas.height), delayMs: frame.delayMs }
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }
  try {
    const bytes = await encodeGifAsync(painted())
    return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
  } finally {
    canvas.width = canvas.height = 0
  }
}

export function exportSegmentedGif(frames: GifFrame[], edits: TimedEdits): Promise<Blob> {
  return exportGif(frames, [], [], (frame, index) => {
    const current = editsAtFrame(edits, index)
    return { patches: collectPatches(current.blocks, frame.imageData), texts: current.freeTexts }
  })
}

/** Shared entry point for the disposable export worker. WeChat mode applies
 * the sticker profile to stills and animations; native mode preserves source
 * dimensions. Both modes share progress and worker lifecycle handling.
 */
export async function exportEditableSource(
  input: EditableExportInput, edits: TimedEdits, options: GifExportOptions = {},
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<Blob> {
  if (input.mode === 'native') return exportNativeSource(input, edits, options, createCanvas)
  const frames = 'source' in input
    ? createEditableGifFrames(new Uint8Array(await input.source.arrayBuffer())).frames
    : [{ imageData: input.imageData, delayMs: STILL_GIF_DELAY_MS }]
  return exportWechatSegmentedGif(frames, edits, options, createCanvas)
}

/** Map edit geometry from the editor canvas (which may be capped at 1600px)
 * back onto the original source pixels. The editor preserves aspect ratio, so
 * both axes normally share one factor; x/y are still mapped independently.
 */
export function scaleEditsForSource(
  edits: TimedEdits, fromWidth: number, fromHeight: number, toWidth: number, toHeight: number,
): TimedEdits {
  if (!(fromWidth > 0 && fromHeight > 0) || !(toWidth > 0 && toHeight > 0)) return edits
  const scaleX = toWidth / fromWidth
  const scaleY = toHeight / fromHeight
  if (Math.abs(scaleX - 1) < 1e-9 && Math.abs(scaleY - 1) < 1e-9) return edits
  const point = (value: Point): Point => ({ x: value.x * scaleX, y: value.y * scaleY })
  const glyphScale = Math.sqrt(scaleX * scaleY)
  const style = (value: TimedEdits['blocks'][number]['textStyle']) => ({
    ...value,
    fontSize: value.fontSize * glyphScale,
    ...(value.strokeWidth === undefined ? {} : { strokeWidth: value.strokeWidth * glyphScale }),
  })
  return {
    ...edits,
    blocks: edits.blocks.map(block => ({
      ...block,
      polygon: block.polygon.map(point) as OcrBlock['polygon'],
      ...(block.manualPolygon ? { manualPolygon: block.manualPolygon.map(point) } : {}),
      ...(block.framePolygons ? { framePolygons: block.framePolygons.map(item => ({
        ...item, polygon: item.polygon.map(point) as OcrBlock['polygon'],
      })) } : {}),
      textStyle: style(block.textStyle),
    })),
    freeTexts: edits.freeTexts.map(layer => ({
      ...layer, x: layer.x * scaleX, y: layer.y * scaleY, textStyle: style(layer.textStyle),
    })),
  }
}

function nativeStillMime(mime: string): StillMime {
  const type = mime.trim().toLowerCase()
  if (type === 'image/jpg' || type === 'image/pjpeg') return 'image/jpeg'
  return type === 'image/jpeg' || type === 'image/webp' ? type : 'image/png'
}

async function decodeNativeStill(source: Blob, createCanvas: () => HTMLCanvasElement): Promise<ImageData> {
  const bitmap = await createImageBitmap(source)
  const canvas = createCanvas()
  try {
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器不能创建画布，无法导出。')
    context.drawImage(bitmap, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    canvas.width = canvas.height = 0
    bitmap.close()
  }
}

/** Native still export: one full-resolution composite, then the source format
 * when the browser can encode it. A canvas that cannot encode WebP returns PNG,
 * and the caller derives the download extension from the resulting Blob.type.
 */
export async function exportNativeStillImage(
  pixels: ImageData, edits: TimedEdits, editWidth: number, editHeight: number,
  options: GifExportOptions, createCanvas: () => HTMLCanvasElement, mime: string,
): Promise<Blob> {
  const scaled = scaleEditsForSource(edits, editWidth, editHeight, pixels.width, pixels.height)
  const current = editsAtFrame(scaled, 0)
  const patches = collectPatches(current.blocks, pixels)
  const canvas = createCanvas()
  try {
    paintComposite(pixels, patches, current.freeTexts, canvas)
    options.onProgress?.({ stage: 'prepare', completed: 1, total: 1 })
    if (mime.trim().toLowerCase() === 'image/gif') {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('浏览器不能创建画布，无法导出。')
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const bytes = encodeGif([{ imageData, delayMs: STILL_GIF_DELAY_MS }])
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    }
    return await canvasToImage(canvas, nativeStillMime(mime))
  } finally {
    canvas.width = canvas.height = 0
  }
}

/** Animation export keeps native pixels and timing. Each lazily decoded source
 * frame is composited and yielded to the encoder before the next one is read, so
 * the worker never retains a whole native RGBA sequence.
 */
export async function exportNativeAnimation(
  frames: GifFrame[], edits: TimedEdits, editWidth: number, editHeight: number,
  options: GifExportOptions, createCanvas: () => HTMLCanvasElement,
): Promise<Blob> {
  const first = frames[0]?.imageData
  if (!first) throw new Error('这个 GIF 没有画面。')
  const scaled = scaleEditsForSource(edits, editWidth, editHeight, first.width, first.height)
  const canvas = createCanvas()
  async function* painted() {
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index]
      const pixels = frame.imageData
      const current = editsAtFrame(scaled, index)
      const patches = collectPatches(current.blocks, pixels)
      paintComposite(pixels, patches, current.freeTexts, canvas)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('浏览器不能创建画布，无法导出。')
      options.onProgress?.({ stage: 'prepare', completed: index + 1, total: frames.length })
      yield { imageData: context.getImageData(0, 0, canvas.width, canvas.height), delayMs: frame.delayMs }
    }
  }
  try {
    const bytes = await encodeGifAsync(painted())
    return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
  } finally {
    canvas.width = canvas.height = 0
  }
}

/** Native export reads the compressed original, never the editor preview. */
export async function exportNativeSource(
  input: NativeExportInput, edits: TimedEdits, options: GifExportOptions,
  createCanvas: () => HTMLCanvasElement,
): Promise<Blob> {
  const bytes = new Uint8Array(await input.source.arrayBuffer())
  const sniffed = sniffImage(bytes, input.source.type || '')
  if (sniffed.mime === 'image/gif') {
    const decoded = createEditableGifFrames(bytes)
    if (decoded.frames.length > 1) {
      return exportNativeAnimation(decoded.frames, edits, input.editWidth, input.editHeight, options, createCanvas)
    }
    return exportNativeStillImage(decoded.frames[0].imageData, edits, input.editWidth, input.editHeight,
      options, createCanvas, 'image/gif')
  }
  const pixels = await decodeNativeStill(new Blob([bytes], { type: sniffed.mime || input.source.type }), createCanvas)
  return exportNativeStillImage(pixels, edits, input.editWidth, input.editHeight, options, createCanvas, sniffed.mime)
}

export async function exportWechatSegmentedGif(
  frames: GifFrame[], edits: TimedEdits, options: GifExportOptions = {},
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): Promise<Blob> {
  const source = createCanvas()
  const output = createCanvas()
  // Native erasures and final-grid glyphs are rendered once per frame. Keep
  // only the 240px result (<=46 MB for 200 frames), never native RGBA sequences.
  const prepared: ImageData[] = []
  let attempt = 0
  async function* painted(plan: StickerFrame[], edge: number) {
    attempt++
    for (const [index, item] of plan.entries()) {
      const frame = prepared[item.index]
      const bounds = stickerBounds(frame.width, frame.height, edge)
      options.onProgress?.({ stage: 'encode', completed: index, total: plan.length, attempt })
      yield { imageData: resizeGif(frame, bounds.width, bounds.height), delayMs: item.delayMs }
    }
  }
  try {
    options.onProgress?.({ stage: 'prepare', completed: 0, total: frames.length })
    for (const [index, frame] of frames.entries()) {
      const pixels = frame.imageData
      const current = editsAtFrame(edits, index)
      const patches = collectPatches(current.blocks, pixels)
      paintComposite(pixels, patches.map((patch) => ({ ...patch, text: '' })), [], source)
      const context = source.getContext('2d')
      if (!context) throw new Error('浏览器不能创建画布，无法导出。')
      const bounds = stickerBounds(source.width, source.height)
      output.width = bounds.width
      output.height = bounds.height
      const target = output.getContext('2d')
      if (!target) throw new Error('浏览器不能创建画布，无法导出。')
      target.putImageData(resizeGif(context.getImageData(0, 0, source.width, source.height), bounds.width, bounds.height), 0, 0)
      target.save()
      target.scale(bounds.width / source.width, bounds.height / source.height)
      paintTextLayers(target, patches, current.freeTexts)
      target.restore()
      // Include the finished glyphs in palette sampling, including rare caption
      // colours; a palette trained only on the photo would distort red text.
      prepared.push(target.getImageData(0, 0, bounds.width, bounds.height))
      options.onProgress?.({ stage: 'prepare', completed: index + 1, total: frames.length })
    }
    // Sample all prepared frames for one stable palette. Transparent sources
    // retain full-frame disposal encoding so genuinely clear pixels stay clear.
    const opaque = prepared.every(pixels => {
      for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] !== 255) return false
      return true
    })
    const totalPixels = prepared.reduce((sum, pixels) => sum + pixels.width * pixels.height, 0)
    const step = Math.max(1, Math.ceil(totalPixels / 80_000))
    const sample = new Uint8ClampedArray(Math.ceil(totalPixels / step) * 4)
    let cursor = 0, offset = 0
    for (const pixels of prepared) {
      for (let i = (step - offset % step) % step; i < pixels.data.length / 4; i += step) {
        sample.set(pixels.data.subarray(i * 4, i * 4 + 4), cursor)
        cursor += 4
      }
      offset += pixels.data.length / 4
    }
    const palettes = new Map<number, number[][]>()
    const paletteFor = (maxColors: number) => {
      let palette = palettes.get(maxColors)
      if (!palette) {
        palette = quantize(sample.subarray(0, cursor), maxColors - 1, { format: 'rgb565' })
        palettes.set(maxColors, palette)
      }
      return palette
    }
    // A one-frame still has no motion to improve; keep its export cheap and deterministic.
    const improveMotion = opaque && frames.length > 1 ? (fit: FittedGif) => {
      if (fit.edge !== 240) return fit.bytes
      return improveGifMotion(prepared.map((imageData, i) => ({ imageData, delayMs: frames[i].delayMs })),
        fit.plan, paletteFor(fit.colors), fit.bytes, {
          maxBytes: WECHAT_GIF_MAX_BYTES,
          pinned: stickerFramePlan(frames, edits, Infinity).map(item => item.index),
          onProgress: (completed, total) => options.onProgress?.({stage:'motion',completed,total}),
        })
    } : undefined
    return await encodeWechatGif(frames, edits, painted, opaque ? paletteFor : undefined, improveMotion)
  } finally {
    prepared.length = 0
    source.width = source.height = 0
    output.width = output.height = 0
  }
}
