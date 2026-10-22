import { encodeGifAsync, type GifFrame } from './gif'
import { paintComposite, type TextPatch } from './paint'
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
  // At most 200 frames, longest edge 240: <=46 MB, released with the worker.
  // Native source frames remain lazy; erasures are rendered exactly once, not
  // again for each palette/frame-rate attempt.
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
      paintComposite(pixels, collectPatches(current.blocks, pixels), current.freeTexts, source)
      const context = source.getContext('2d')
      if (!context) throw new Error('浏览器不能创建画布，无法导出。')
      const bounds = stickerBounds(source.width, source.height)
      prepared.push(resizeGif(context.getImageData(0, 0, source.width, source.height), bounds.width, bounds.height))
      options.onProgress?.({ stage: 'prepare', completed: index + 1, total: frames.length })
    }
    // Sample all prepared frames for one stable palette. Transparent sources
    // retain full-frame disposal encoding so genuinely clear pixels stay clear.
    const opaque = prepared.every(frame => {
      for (let i = 3; i < frame.data.length; i += 4) if (frame.data[i] !== 255) return false
      return true
    })
    const totalPixels = prepared.reduce((sum, frame) => sum + frame.width * frame.height, 0)
    const step = Math.max(1, Math.ceil(totalPixels / 80_000))
    const sample = new Uint8ClampedArray(Math.ceil(totalPixels / step) * 4)
    let cursor = 0, offset = 0
    for (const frame of prepared) {
      for (let i = (step - offset % step) % step; i < frame.data.length / 4; i += step) {
        sample.set(frame.data.subarray(i * 4, i * 4 + 4), cursor)
        cursor += 4
      }
      offset += frame.data.length / 4
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
  }
}
