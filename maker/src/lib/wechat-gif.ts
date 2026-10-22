import { encodeGifAsync, GifSizeLimitError, type GifFrame } from './gif'
import type { TimedEdits } from './timeline'

// Conservative chat-sticker export profile, not a guarantee of store approval.
// Public submission references differ by category (100KB/500KB); see README.
export const WECHAT_GIF_EDGE = 240
export const WECHAT_GIF_MAX_BYTES = 500_000

export function stickerBounds(width: number, height: number) {
  if (!(width > 0 && height > 0)) throw new Error('GIF 尺寸无效。')
  const scale = WECHAT_GIF_EDGE / Math.max(width, height)
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  return { x: Math.floor((WECHAT_GIF_EDGE - w) / 2), y: Math.floor((WECHAT_GIF_EDGE - h) / 2), width: w, height: h }
}

export type StickerFrame = { index: number; delayMs: number }

/** Keep subtitle/segment transitions even when thinning motion frames. */
export function stickerFramePlan(frames: GifFrame[], edits: TimedEdits, stride = 1): StickerFrame[] {
  const keep = new Set<number>([0, frames.length - 1])
  for (const item of [...edits.blocks, ...(edits.segments ?? []).map(s => ({ startFrame: s.start, endFrame: s.end }))]) {
    for (const boundary of [item.startFrame, item.endFrame]) {
      if (boundary !== undefined && Number.isInteger(boundary) && boundary >= 0 && boundary < frames.length) keep.add(boundary)
    }
  }
  if (Number.isFinite(stride)) {
    for (let i = 0; i < frames.length; i += Math.max(1, Math.floor(stride))) keep.add(i)
  }
  const result: StickerFrame[] = []
  // GIF delays are 16-bit centiseconds. Split long holds rather than wrapping.
  for (let i = 0; i < frames.length; i++) {
    let delayMs = Math.max(20, Math.round(frames[i].delayMs / 10) * 10)
    if (keep.has(i) || !result.length) result.push({ index: i, delayMs: 0 })
    while (delayMs > 0) {
      const current = result[result.length - 1]
      const amount = Math.min(delayMs, 655_350 - current.delayMs)
      current.delayMs += amount
      delayMs -= amount
      if (delayMs > 0) result.push({ index: current.index, delayMs: 0 })
    }
  }
  return result
}

/** Retry with fewer colors first, then thinner motion; never truncate the timeline. */
export async function encodeWechatGif(
  frames: GifFrame[], edits: TimedEdits,
  render: (plan: StickerFrame[]) => AsyncIterable<GifFrame>,
): Promise<Blob> {
  const profiles = [
    [1, 256], [1, 128], [1, 64], [1, 32],
    [2, 32], [4, 32], [8, 16], [16, 16], [Infinity, 16], [Infinity, 8],
  ]
  for (const [stride, maxColors] of profiles) {
    try {
      const bytes = await encodeGifAsync(render(stickerFramePlan(frames, edits, stride)), { maxColors, maxBytes: WECHAT_GIF_MAX_BYTES })
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    } catch (error) {
      if (!(error instanceof GifSizeLimitError)) throw error
    }
  }
  throw new Error('压缩后仍超过 500KB，请缩短动画或减少字幕。')
}
