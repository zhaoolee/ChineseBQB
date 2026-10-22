import { encodeGifAsync, type GifFrame } from './gif'
import { paintComposite, type TextPatch } from './paint'
import { collectPatches } from './plan'
import { editsAtFrame, type TimedEdits } from './timeline'
import type { FreeText } from '../types'
import { encodeWechatGif, stickerBounds, WECHAT_GIF_EDGE, type StickerFrame } from './wechat-gif'

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

export async function exportWechatSegmentedGif(frames: GifFrame[], edits: TimedEdits): Promise<Blob> {
  const source = document.createElement('canvas')
  const output = document.createElement('canvas')
  output.width = output.height = WECHAT_GIF_EDGE
  async function* painted(plan: StickerFrame[]) {
    const context = output.getContext('2d')
    if (!context) throw new Error('浏览器不能创建画布，无法导出。')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    for (const item of plan) {
      const frame = frames[item.index]
      const current = editsAtFrame(edits, item.index)
      paintComposite(frame.imageData, collectPatches(current.blocks, frame.imageData), current.freeTexts, source)
      const bounds = stickerBounds(source.width, source.height)
      context.clearRect(0, 0, WECHAT_GIF_EDGE, WECHAT_GIF_EDGE)
      context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height)
      yield { imageData: context.getImageData(0, 0, WECHAT_GIF_EDGE, WECHAT_GIF_EDGE), delayMs: item.delayMs }
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
  }
  try {
    return await encodeWechatGif(frames, edits, painted)
  } finally {
    source.width = source.height = output.width = output.height = 0
  }
}
