import { encodeGifAsync, type GifFrame } from './gif'
import { paintComposite, type TextPatch } from './paint'
import type { FreeText } from '../types'

export async function exportGif(frames: GifFrame[], patches: TextPatch[], texts: FreeText[]): Promise<Blob> {
  const canvas = document.createElement('canvas')
  async function* painted() {
    for (const frame of frames) {
      paintComposite(frame.imageData, patches, texts, canvas)
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
