import type { OcrBlock, Point } from '../types'
import type { GifFrame } from './gif'
import { polygonBounds } from './geometry'

export type GifOcrProgress = { completed: number; total: number; recognized: number }
export const MAX_GIF_OCR_FRAMES = 200
const MAX_CUES = 2000

const interrupted = () => new DOMException('字幕识别已取消', 'AbortError')
const textKey = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ')

/** Exact equality only: even a brief caption on one changed frame must reach OCR. */
export function sameGifPixels(a: ImageData, b: ImageData): boolean {
  if (a === b) return true
  if (a.width !== b.width || a.height !== b.height || a.data.length !== b.data.length) return false
  for (let i = 0; i < a.data.length; i += 1) if (a.data[i] !== b.data[i]) return false
  return true
}

function positionDistance(left: Point[], right: Point[]): number {
  const a = polygonBounds(left), b = polygonBounds(right)
  const height = Math.max(1, a.height, b.height)
  const widthRatio = Math.min(a.width, b.width) / Math.max(1, a.width, b.width)
  const dx = Math.abs((a.minX + a.maxX - b.minX - b.maxX) / 2)
  const dy = Math.abs((a.minY + a.maxY - b.minY - b.maxY) / 2)
  return widthRatio >= 0.5 && dx <= height * 1.5 && dy <= height * 0.75
    ? dx / height + dy / height : Infinity
}

/** Recognize every changed decoded frame, then merge adjacent matching lines into editable cues.
 * Results are returned atomically. Cancellation/errors never publish a half-scanned timeline.
 */
export async function scanGifSubtitles(
  frames: GifFrame[],
  recognizeFrame: (frame: GifFrame, index: number) => Promise<OcrBlock[]>,
  options: { isCurrent?: () => boolean; onProgress?: (progress: GifOcrProgress) => void; idPrefix?: string } = {},
): Promise<{ blocks: OcrBlock[]; recognized: number }> {
  if (!frames.length || frames.length > MAX_GIF_OCR_FRAMES) throw new Error(`字幕识别支持 1–${MAX_GIF_OCR_FRAMES} 个解码帧，请先缩短 GIF。`)
  const current = options.isCurrent ?? (() => true)
  const cues: OcrBlock[] = []
  let active: OcrBlock[] = []
  let observations: OcrBlock[] = []
  let recognized = 0
  options.onProgress?.({ completed: 0, total: frames.length, recognized })
  for (let index = 0; index < frames.length; index += 1) {
    if (!current()) throw interrupted()
    if (index === 0 || !sameGifPixels(frames[index - 1].imageData, frames[index].imageData)) {
      observations = await recognizeFrame(frames[index], index)
      recognized += 1
    }
    if (!current()) throw interrupted()
    const unused = new Set(active)
    const next: OcrBlock[] = []
    for (const observation of observations) {
      if (!textKey(observation.originalText)) continue
      let match: OcrBlock | undefined
      let best = Infinity
      for (const candidate of unused) {
        if (textKey(candidate.originalText) !== textKey(observation.originalText)) continue
        const previous = candidate.framePolygons!.at(-1)!.polygon
        const distance = positionDistance(previous, observation.polygon)
        if (distance < best) { match = candidate; best = distance }
      }
      if (match) {
        unused.delete(match)
        match.endFrame = index + 1
        match.score = Math.min(match.score, observation.score)
        match.framePolygons!.push({ frame: index, polygon: observation.polygon })
      } else {
        if (cues.length >= MAX_CUES) throw new Error('识别出的字幕过多，请缩短 GIF 后重试。')
        match = { ...observation, id: `${options.idPrefix ?? 'subtitle'}-${cues.length + 1}`,
          segmentId: undefined, startFrame: index, endFrame: index + 1,
          framePolygons: [{ frame: index, polygon: observation.polygon }],
          targetText: observation.originalText, enabled: true, applyLocal: false, lineRedraw: false }
        cues.push(match)
      }
      next.push(match)
    }
    active = next
    options.onProgress?.({ completed: index + 1, total: frames.length, recognized })
    // Yield between frames so cancel/edit/navigation can invalidate the scan promptly.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  if (!current()) throw interrupted()
  return { blocks: cues, recognized }
}
