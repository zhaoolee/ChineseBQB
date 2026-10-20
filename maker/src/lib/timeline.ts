import type { FreeText, OcrBlock } from '../types'
import type { GifFrame } from './gif'

export type GifSegment = { id: string; start: number; end: number }
export type TimedEdits = { blocks: OcrBlock[]; freeTexts: FreeText[]; segments?: GifSegment[]; selectedId: string | null }
export const MAX_SEGMENTS = 20

export function segmentAtFrame(segments: GifSegment[] | undefined, frame: number): GifSegment | undefined {
  return segments?.find(segment => frame >= segment.start && frame < segment.end)
}

export function editsAtFrame<T extends TimedEdits>(edits: T, frame: number): T {
  const id = segmentAtFrame(edits.segments, frame)?.id
  const includes = (item: { segmentId?: string }) => !item.segmentId || item.segmentId === id
  return { ...edits, blocks: edits.blocks.filter(includes), freeTexts: edits.freeTexts.filter(includes) }
}

export function frameTimes(frames: Pick<GifFrame, 'delayMs'>[]) {
  let total = 0
  const starts = frames.map(frame => { const start = total; total += frame.delayMs; return start })
  return { starts, total }
}

/** Frame ranges are half-open; cloning the right side makes subsequent text edits independent. */
export function splitSegment<T extends TimedEdits>(edits: T, frame: number, newId: string): T {
  const segment = segmentAtFrame(edits.segments, frame)
  if (!segment || frame <= segment.start || frame >= segment.end || edits.segments!.length >= MAX_SEGMENTS) return edits
  const clone = <L extends { id: string; segmentId?: string }>(items: L[]): L[] => items.flatMap(item => item.segmentId === segment.id
    ? [item, { ...item, id: `${newId}:${item.id}`, segmentId: newId }]
    : [item])
  return {
    ...edits,
    segments: edits.segments!.flatMap(item => item.id === segment.id
      ? [{ ...item, end: frame }, { id: newId, start: frame, end: item.end }]
      : [item]),
    blocks: clone(edits.blocks), freeTexts: clone(edits.freeTexts),
    selectedId: edits.selectedId ? `${newId}:${edits.selectedId}` : null,
  }
}
