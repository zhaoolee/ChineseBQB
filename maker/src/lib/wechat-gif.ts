import { encodeGifAsync, GifSizeLimitError, type GifFrame } from './gif'
import type { TimedEdits } from './timeline'

// Conservative chat-sticker export profile, not a guarantee of store approval.
// Public submission references differ by category (100KB/500KB); see README.
export const WECHAT_GIF_EDGE = 240
export const WECHAT_GIF_MAX_BYTES = 500_000

export function stickerBounds(width: number, height: number, edge = WECHAT_GIF_EDGE) {
  if (![width, height, edge].every(value => Number.isFinite(value) && value > 0)) throw new Error('GIF 尺寸无效。')
  const scale = edge / Math.max(width, height)
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  return { x: Math.floor((edge - w) / 2), y: Math.floor((edge - h) / 2), width: w, height: h }
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

/** Reduce colors/motion first, then resolution when protected caption boundaries pin
 * most frames. Always re-render the original edits at the selected size; never truncate time.
 */
export async function encodeWechatGif(
  frames: GifFrame[], edits: TimedEdits,
  render: (plan: StickerFrame[], edge: number) => AsyncIterable<GifFrame>,
): Promise<Blob> {
  const profiles = [
    [240, 1, 256], [240, 1, 128], [240, 1, 64],
    [240, 2, 64], [192, 2, 128], [192, 2, 64],
    [160, 4, 64], [160, 4, 32], [128, 8, 32], [96, 8, 32], [96, 8, 16],
    [72, 16, 16], [48, Infinity, 8], [32, Infinity, 4], [24, Infinity, 4],
  ]
  const attempted = new Set<string>()
  for (const [edge, stride, maxColors] of profiles) {
    const plan = stickerFramePlan(frames, edits, stride)
    // A cue on every frame can make thinning a no-op. Do not encode the same
    // resolution, palette and frame plan repeatedly on a phone.
    const key = `${edge}:${maxColors}:${plan.map(item => `${item.index},${item.delayMs}`).join(';')}`
    if (attempted.has(key)) continue
    attempted.add(key)
    try {
      const bytes = await encodeGifAsync(render(plan, edge), { maxColors, maxBytes: WECHAT_GIF_MAX_BYTES })
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    } catch (error) {
      if (!(error instanceof GifSizeLimitError)) throw error
    }
  }
  throw new Error('动画内容过多，自动压缩后仍超过 500KB，请缩短动画后重试。')
}
