import type { Point } from '../types'

export type ViewTransform = {
  /** Source pixels to CSS pixels. */
  scale: number
  offsetX: number
  offsetY: number
  /** Device pixels per CSS pixel. Pointer events stay in CSS pixels. */
  dpr: number
}

export function containTransform(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  userScale = 1,
  panX = 0,
  panY = 0,
  dpr = 1,
): ViewTransform {
  const fit = Math.min(viewWidth / imageWidth, viewHeight / imageHeight)
  const scale = fit * userScale
  return {
    scale,
    offsetX: (viewWidth - imageWidth * scale) / 2 + panX,
    offsetY: (viewHeight - imageHeight * scale) / 2 + panY,
    dpr,
  }
}

export function imageToScreen(point: Point, transform: ViewTransform): Point {
  return {
    x: point.x * transform.scale + transform.offsetX,
    y: point.y * transform.scale + transform.offsetY,
  }
}

export function screenToImage(point: Point, transform: ViewTransform): Point {
  return {
    x: (point.x - transform.offsetX) / transform.scale,
    y: (point.y - transform.offsetY) / transform.scale,
  }
}

/** Convert a device pixel (for example a touch point before CSS scaling) into image space. */
export function deviceToImage(deviceX: number, deviceY: number, transform: ViewTransform): Point {
  return screenToImage({ x: deviceX / transform.dpr, y: deviceY / transform.dpr }, transform)
}

export function orderQuad(points: Point[]): [Point, Point, Point, Point] {
  if (points.length < 4) {
    throw new Error('文字框至少需要四个点')
  }
  const sample = points.slice(0, Math.max(points.length, 4))
  const cx = sample.reduce((sum, point) => sum + point.x, 0) / sample.length
  const cy = sample.reduce((sum, point) => sum + point.y, 0) / sample.length
  const sorted = [...sample].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  )
  const start = sorted.reduce((best, point, index) => (
    point.x + point.y < sorted[best].x + sorted[best].y ? index : best
  ), 0)
  const rotated = [...sorted.slice(start), ...sorted.slice(0, start)].slice(0, 4)
  return [rotated[0], rotated[1], rotated[2], rotated[3]]
}

export function polygonBounds(polygon: Point[]) {
  const xs = polygon.map((point) => point.x)
  const ys = polygon.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function centroid(polygon: Point[]): Point {
  return {
    x: polygon.reduce((sum, point) => sum + point.x, 0) / polygon.length,
    y: polygon.reduce((sum, point) => sum + point.y, 0) / polygon.length,
  }
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersect = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x
    if (intersect) inside = !inside
  }
  return inside
}

export function clampPolygon(polygon: Point[], width: number, height: number): Point[] {
  return polygon.map((point) => ({
    x: Math.min(width, Math.max(0, point.x)),
    y: Math.min(height, Math.max(0, point.y)),
  }))
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
