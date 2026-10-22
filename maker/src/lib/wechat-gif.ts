import { encodeGifAsync, GifSizeLimitError, type GifFrame } from './gif'
import type { TimedEdits } from './timeline'

// Conservative chat-sticker export profile, not a guarantee of store approval.
// Public submission references differ by category (100KB/500KB); see README.
export const WECHAT_GIF_EDGE = 240
export const WECHAT_GIF_MAX_BYTES = 500_000

/** Fit the image inside an `edge` box while keeping its original aspect ratio.
 * No square letterboxing, and never enlarge a source already smaller than `edge`
 * (scale is capped at 1), so 100x200 stays 100x200.
 */
export function stickerBounds(width: number, height: number, edge = WECHAT_GIF_EDGE) {
  if (![width, height, edge].every(value => Number.isFinite(value) && value > 0)) throw new Error('GIF 尺寸无效。')
  const scale = Math.min(1, edge / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  return { x: 0, y: 0, width: w, height: h }
}

export type StickerFrame = { index: number; delayMs: number }
export type FittedGif = { bytes: Uint8Array; plan: StickerFrame[]; edge: number; colors: number }

/** Keep actual caption edits and segment transitions when thinning motion. OCR
 * observations alone do not change the rendered image and must not pin every frame.
 */
export function stickerFramePlan(frames: GifFrame[], edits: TimedEdits, stride = 1): StickerFrame[] {
  const keep = new Set<number>([0, frames.length - 1])
  const captions = edits.blocks.filter(block => block.enabled !== false && block.targetText !== '' && block.targetText !== block.originalText)
  for (const item of [...captions, ...(edits.segments ?? []).map(s => ({ startFrame: s.start, endFrame: s.end }))]) {
    for (const boundary of [item.startFrame, item.endFrame]) {
      if (boundary !== undefined && Number.isInteger(boundary) && boundary >= 0 && boundary < frames.length) keep.add(boundary)
    }
  }
  if (Number.isFinite(stride)) {
    for (let i = 0; i < frames.length; i += Math.max(1, stride)) keep.add(Math.floor(i))
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

/** Clarity first: do not shrink the canvas while a reasonable 240px palette/motion
 * combination might fit. Only overflow triggers the next attempt. Render from the
 * prepared pixels and never truncate the timeline.
 */
export async function encodeWechatGif(
  frames: GifFrame[], edits: TimedEdits,
  render: (plan: StickerFrame[], edge: number) => AsyncIterable<GifFrame>,
  paletteFor?: (maxColors: number) => number[][] | undefined,
  improveMotion?: (fit: FittedGif) => Uint8Array,
): Promise<Blob> {
  const profiles = [
    [240, 1, 256], [240, 1.25, 256], [240, 1.5, 256], [240, 1.5, 192],
    [240, 2, 256], [240, 2, 192], [240, 2, 128],
    [240, 2.5, 256], [240, 2.5, 192], [240, 2.5, 128],
    [240, 3, 256], [240, 3.25, 256], [240, 3.5, 256], [240, 3, 192], [240, 3, 160],
    [240, 3, 128], [240, 3, 64], [240, 4, 256], [240, 4, 128], [240, 4, 64],
    [240, 4, 32], [240, 6, 64], [240, 6, 32],
    [224, 4, 64], [224, 4, 32], [208, 4, 64], [208, 4, 32],
    [192, 4, 64], [192, 4, 32],
    [160, 4, 64], [160, 4, 32], [128, 8, 32], [96, 8, 32], [96, 8, 16],
    [72, 16, 16], [48, Infinity, 8], [32, Infinity, 4], [24, Infinity, 4],
  ]
  const attempted = new Set<string>()
  const frameCache = new Map()
  const failedColors = new Map<string, number>()
  const encode = (plan: StickerFrame[], edge: number, maxColors: number) => {
    const globalPalette = paletteFor?.(maxColors)
    return encodeGifAsync(render(plan, edge), { maxColors, maxBytes: WECHAT_GIF_MAX_BYTES, frameCache,
      ...(globalPalette ? { globalPalette } : {}),
    })
  }
  for (const [edge, stride, maxColors] of profiles) {
    const plan = stickerFramePlan(frames, edits, stride)
    // A cue on every frame can make thinning a no-op. Do not encode the same
    // resolution, palette and frame plan repeatedly on a phone.
    const planKey = `${edge}:${plan.map(item => `${item.index},${item.delayMs}`).join(';')}`
    const key = `${maxColors}:${planKey}`
    if (attempted.has(key)) continue
    attempted.add(key)
    try {
      let bytes = await encode(plan, edge, maxColors)
      // A coarse 160 -> 128 step can leave enough room for, say, 148 colours.
      // Restore colour detail with up to four measured attempts, keeping exactly
      // the same dimensions, frame indices, caption boundaries and delays.
      let lower = maxColors
      let upper = failedColors.get(planKey) ?? 257
      for (let refinement = 0; refinement < 4 && upper - lower > 1; refinement++) {
        const colors = Math.floor((lower + upper) / 2)
        try {
          const candidate = await encode(plan, edge, colors)
          bytes = candidate
          lower = colors
        } catch (error) {
          if (!(error instanceof GifSizeLimitError)) throw error
          upper = colors
        }
      }
      if (improveMotion) {
        const candidate = improveMotion({ bytes, plan, edge, colors: lower })
        if (candidate.length < WECHAT_GIF_MAX_BYTES) bytes = candidate
      }
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' })
    } catch (error) {
      if (!(error instanceof GifSizeLimitError)) throw error
      failedColors.set(planKey, Math.min(failedColors.get(planKey) ?? 257, maxColors))
    }
  }
  throw new Error('动画内容过多，自动压缩后仍超过 500KB，请缩短动画后重试。')
}
