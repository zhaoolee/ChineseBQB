import { pointInPolygon, polygonBounds } from './geometry'
import type { Point } from '../types'

export type FillPatch = {
  polygon: Point[]
  color: [number, number, number, number]
}

export function copyImageData(source: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height)
}

export function fillPolygon(image: ImageData, polygon: Point[], color: [number, number, number, number]) {
  const xs = polygon.map((point) => point.x)
  const ys = polygon.map((point) => point.y)
  const x0 = Math.max(0, Math.floor(Math.min(...xs)))
  const y0 = Math.max(0, Math.floor(Math.min(...ys)))
  const x1 = Math.min(image.width - 1, Math.ceil(Math.max(...xs)))
  const y1 = Math.min(image.height - 1, Math.ceil(Math.max(...ys)))
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue
      const index = (y * image.width + x) * 4
      image.data[index] = color[0]
      image.data[index + 1] = color[1]
      image.data[index + 2] = color[2]
      image.data[index + 3] = color[3]
    }
  }
}

export function applyFills(source: ImageData, patches: FillPatch[]): ImageData {
  const copy = copyImageData(source)
  for (const patch of patches) fillPolygon(copy, patch.polygon, patch.color)
  return copy
}

/** Smear the pixels inside a polygon. Pixels outside that polygon stay as they were. */
export function blurPolygon(image: ImageData, polygon: Point[], radius: number): ImageData {
  const output = copyImageData(image)
  if (polygon.length < 3) return output
  const r = Math.max(1, Math.round(radius))
  const { width, height } = image
  const bounds = polygonBounds(polygon)
  const x0 = Math.max(0, Math.floor(bounds.minX))
  const x1 = Math.min(width - 1, Math.ceil(bounds.maxX))
  const y0 = Math.max(0, Math.floor(bounds.minY))
  const y1 = Math.min(height - 1, Math.ceil(bounds.maxY))
  if (x1 < x0 || y1 < y0) return output
  const hx0 = Math.max(0, x0 - r)
  const hx1 = Math.min(width - 1, x1 + r)
  const hy0 = Math.max(0, y0 - r)
  const hy1 = Math.min(height - 1, y1 + r)
  const span = hx1 - hx0 + 1
  const horizontal = new Float32Array((hy1 - hy0 + 1) * span * 4)
  const sample = (x: number, y: number) => ((y - hy0) * span + (x - hx0)) * 4
  for (let y = hy0; y <= hy1; y += 1) {
    for (let x = hx0; x <= hx1; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      let count = 0
      const from = Math.max(0, x - r)
      const to = Math.min(width - 1, x + r)
      for (let xx = from; xx <= to; xx += 1) {
        const index = (y * width + xx) * 4
        red += image.data[index]
        green += image.data[index + 1]
        blue += image.data[index + 2]
        alpha += image.data[index + 3]
        count += 1
      }
      const offset = sample(x, y)
      horizontal[offset] = red / count
      horizontal[offset + 1] = green / count
      horizontal[offset + 2] = blue / count
      horizontal[offset + 3] = alpha / count
    }
  }
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      let count = 0
      const from = Math.max(hy0, y - r)
      const to = Math.min(hy1, y + r)
      for (let yy = from; yy <= to; yy += 1) {
        const index = sample(x, yy)
        red += horizontal[index]
        green += horizontal[index + 1]
        blue += horizontal[index + 2]
        alpha += horizontal[index + 3]
        count += 1
      }
      const offset = (y * width + x) * 4
      output.data[offset] = Math.round(red / count)
      output.data[offset + 1] = Math.round(green / count)
      output.data[offset + 2] = Math.round(blue / count)
      output.data[offset + 3] = Math.round(alpha / count)
    }
  }
  return output
}

/** Put original pixels back everywhere outside the erase polygons. */
export function restoreOutside(original: ImageData, current: ImageData, polygons: Point[][]): ImageData {
  if (original.width !== current.width || original.height !== current.height) {
    throw new Error('合成尺寸与原图不一致')
  }
  const output = copyImageData(current)
  for (let y = 0; y < original.height; y += 1) {
    for (let x = 0; x < original.width; x += 1) {
      const point = { x: x + 0.5, y: y + 0.5 }
      if (polygons.some((polygon) => pointInPolygon(point, polygon))) continue
      const index = (y * original.width + x) * 4
      output.data[index] = original.data[index]
      output.data[index + 1] = original.data[index + 1]
      output.data[index + 2] = original.data[index + 2]
      output.data[index + 3] = original.data[index + 3]
    }
  }
  return output
}

export function countDifferences(left: ImageData, right: ImageData, ignore?: Point[][]): number {
  let count = 0
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const point = { x: x + 0.5, y: y + 0.5 }
      if (ignore?.some((polygon) => pointInPolygon(point, polygon))) continue
      const index = (y * left.width + x) * 4
      for (let channel = 0; channel < 4; channel += 1) {
        if (left.data[index + channel] !== right.data[index + channel]) {
          count += 1
          break
        }
      }
    }
  }
  return count
}
