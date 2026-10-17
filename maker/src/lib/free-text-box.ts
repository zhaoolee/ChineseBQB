import { estimateTextWidth } from './char-layout'
import type { FreeText, Point } from '../types'

export type TextBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export type TextHandleName = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLES: TextHandleName[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function freeTextBox(layer: Pick<FreeText, 'text' | 'x' | 'y' | 'textStyle'>): TextBox {
  const size = Math.max(8, layer.textStyle.fontSize)
  const pad = Math.max(6, size * 0.12)
  const width = Math.max(estimateTextWidth(layer.text, size), size * 0.6) + pad * 2
  const height = size + pad * 2
  return {
    minX: layer.x - width / 2,
    minY: layer.y - height / 2,
    maxX: layer.x + width / 2,
    maxY: layer.y + height / 2,
    width,
    height,
  }
}

export function textBoxHandles(box: TextBox): { name: TextHandleName; x: number; y: number }[] {
  const midX = (box.minX + box.maxX) / 2
  const midY = (box.minY + box.maxY) / 2
  const at: Record<TextHandleName, Point> = {
    nw: { x: box.minX, y: box.minY },
    n: { x: midX, y: box.minY },
    ne: { x: box.maxX, y: box.minY },
    e: { x: box.maxX, y: midY },
    se: { x: box.maxX, y: box.maxY },
    s: { x: midX, y: box.maxY },
    sw: { x: box.minX, y: box.maxY },
    w: { x: box.minX, y: midY },
  }
  return HANDLES.map((name) => ({ name, ...at[name] }))
}

/** Dragging a handle scales the font around the text center. */
export function scaledFontSize(
  startSize: number,
  handle: TextHandleName,
  center: Point,
  handlePoint: Point,
  pointer: Point,
): number {
  const vertical = handle === 'n' || handle === 's'
  const horizontal = handle === 'e' || handle === 'w'
  const start = vertical
    ? Math.abs(handlePoint.y - center.y)
    : horizontal
      ? Math.abs(handlePoint.x - center.x)
      : Math.hypot(handlePoint.x - center.x, handlePoint.y - center.y)
  const next = vertical
    ? Math.abs(pointer.y - center.y)
    : horizontal
      ? Math.abs(pointer.x - center.x)
      : Math.hypot(pointer.x - center.x, pointer.y - center.y)
  if (start < 1) return startSize
  return Math.min(400, Math.max(8, Math.round(startSize * (next / start))))
}

export function pointInTextBox(point: Point, box: TextBox): boolean {
  return point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY
}
