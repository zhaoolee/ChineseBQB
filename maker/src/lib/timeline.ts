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
  const includes = (item: { segmentId?: string; startFrame?: number; endFrame?: number }) =>
    (!item.segmentId || item.segmentId === id)
    && frame >= (item.startFrame ?? 0) && frame < (item.endFrame ?? Infinity)
  return { ...edits, blocks: edits.blocks.filter(includes).map(block => blockAtFrame(block, frame)), freeTexts: edits.freeTexts.filter(includes) }
}

/** A cue follows its measured location instead of erasing the first frame's box everywhere. */
export function blockAtFrame(block: OcrBlock, frame: number): OcrBlock {
  const positions = block.framePolygons
  if (!positions?.length) return block
  const position = positions.find(item => item.frame === frame)
    ?? positions.reduce((nearest, item) => Math.abs(item.frame - frame) < Math.abs(nearest.frame - frame) ? item : nearest)
  if (position.polygon === block.polygon) return block
  return { ...block, polygon: position.polygon }
}

export function frameTimes(frames: Pick<GifFrame, 'delayMs'>[]) {
  let total = 0
  const starts = frames.map(frame => { const start = total; total += frame.delayMs; return start })
  return { starts, total }
}

/** Snap editable subtitle seconds to actual boundaries, including the final frame's end. */
export function closestFrameBoundary(frames: Pick<GifFrame, 'delayMs'>[], ms: number): number {
  if (!Number.isFinite(ms)) return 0
  const { starts, total } = frameTimes(frames)
  const boundaries = [...starts, total]
  return boundaries.reduce((nearest, time, index) => Math.abs(time - ms) < Math.abs(boundaries[nearest] - ms) ? index : nearest, 0)
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
    blocks: edits.blocks.flatMap(block => {
      if (block.startFrame !== undefined && block.endFrame !== undefined && block.startFrame < frame && block.endFrame > frame) {
        return [{ ...block, endFrame: frame, framePolygons: block.framePolygons?.filter(item => item.frame < frame) },
          { ...block, id: `${newId}:${block.id}`, startFrame: frame, framePolygons: block.framePolygons?.filter(item => item.frame >= frame),
            segmentId: block.segmentId === segment.id ? newId : block.segmentId }]
      }
      return clone([block])
    }), freeTexts: clone(edits.freeTexts),
    selectedId: edits.selectedId ? (
      [...edits.blocks, ...edits.freeTexts].some(item => item.id === edits.selectedId && item.segmentId === segment.id)
      || edits.blocks.some(item => item.id === edits.selectedId && item.startFrame !== undefined && item.endFrame !== undefined && item.startFrame < frame && item.endFrame > frame)
        ? `${newId}:${edits.selectedId}` : edits.selectedId
    ) : null,
  }
}
