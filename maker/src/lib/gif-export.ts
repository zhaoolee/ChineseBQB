import { encodeGifAsync, type GifFrame } from './gif'
import { paintComposite, paintTextLayers, type TextPatch } from './paint'
import { collectPatches } from './plan'
import { editsAtFrame, type TimedEdits } from './timeline'
import type { FreeText } from '../types'
import { encodeWechatGif, stickerBounds, type StickerFrame } from './wechat-gif'
import { resizeGif } from './resize-area'
import { quantize } from 'gifenc'

export type GifExportProgress = { stage: 'prepare' | 'encode'; completed: number; total: number; attempt?: number }
export type GifExportOptions = { onProgress?: (progress: GifExportProgress) => void }

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
    return await encodeWechatGif(frames, edits, painted, opaque ? maxColors => {
      let palette = palettes.get(maxColors)
      if (!palette) {
        palette = quantize(sample.subarray(0, cursor), maxColors - 1, { format: 'rgb565' })
        palettes.set(maxColors, palette)
      }
      return palette
    } : undefined)
  } finally {
    prepared.length = 0
    source.width = source.height = 0
    output.width = output.height = 0
  }
}
