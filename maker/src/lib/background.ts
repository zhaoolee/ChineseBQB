import { pointInPolygon, polygonBounds } from './geometry'
import type { Point } from '../types'

export type BackgroundSample = {
  color: [number, number, number, number]
  variance: number
  solid: boolean
  samples: number
}

export function sampleBackground(image: ImageData, polygon: Point[], radius = 4): BackgroundSample {
  const bounds = polygonBounds(polygon)
  const pixels: number[][] = []
  const x0 = Math.max(0, Math.floor(bounds.minX))
  const x1 = Math.min(image.width - 1, Math.ceil(bounds.maxX))
  const y0 = Math.max(0, Math.floor(bounds.minY - radius))
  const y1 = Math.min(image.height - 1, Math.ceil(bounds.maxY + radius))
  for (let y = y0; y <= y1; y += 1) {
    const above = y < bounds.minY && y >= bounds.minY - radius
    const below = y > bounds.maxY && y <= bounds.maxY + radius
    if (!above && !below) continue
    for (let x = x0; x <= x1; x += 1) {
      const index = (y * image.width + x) * 4
      pixels.push([
        image.data[index],
        image.data[index + 1],
        image.data[index + 2],
        image.data[index + 3],
      ])
    }
  }
  if (pixels.length < 6) {
    const expanded = polygonBounds([
      { x: bounds.minX - radius, y: bounds.minY - radius },
      { x: bounds.maxX + radius, y: bounds.maxY + radius },
    ])
    for (let y = Math.max(0, Math.floor(expanded.minY)); y <= Math.min(image.height - 1, Math.ceil(expanded.maxY)); y += 1) {
      for (let x = Math.max(0, Math.floor(expanded.minX)); x <= Math.min(image.width - 1, Math.ceil(expanded.maxX)); x += 1) {
        if (pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue
        const index = (y * image.width + x) * 4
        pixels.push([image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]])
      }
    }
  }
  if (!pixels.length) {
    return { color: [255, 255, 255, 255], variance: 255, solid: false, samples: 0 }
  }
  const channels = [0, 1, 2, 3].map((channel) => median(pixels.map((pixel) => pixel[channel])))
  const color: [number, number, number, number] = [
    Math.round(channels[0]),
    Math.round(channels[1]),
    Math.round(channels[2]),
    Math.round(channels[3] || 255),
  ]
  const spreads = [0, 1, 2].map((channel) => percentileSpread(pixels.map((pixel) => pixel[channel])))
  const variance = Math.max(...spreads)
  return { color, variance, solid: pixels.length >= 6 && variance <= 12, samples: pixels.length }
}

export function luminance(color: [number, number, number, number]): number {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722
}

export function colorToHex(color: [number, number, number, number]): string {
  return `#${[color[0], color[1], color[2]].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

/** The color of the original glyphs, not the panel they sit on. */
export function sampleInk(image: ImageData, polygon: Point[]): [number, number, number, number] | null {
  const background = sampleBackground(image, polygon).color
  const bounds = polygonBounds(polygon)
  const x0 = Math.max(0, Math.floor(bounds.minX))
  const x1 = Math.min(image.width - 1, Math.ceil(bounds.maxX))
  const y0 = Math.max(0, Math.floor(bounds.minY))
  const y1 = Math.min(image.height - 1, Math.ceil(bounds.maxY))
  const buckets = new Map<string, [number, number, number, number][]>()
  let count = 0
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!pointInPolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) continue
      const index = (y * image.width + x) * 4
      const color: [number, number, number, number] = [
        image.data[index],
        image.data[index + 1],
        image.data[index + 2],
        image.data[index + 3],
      ]
      if (color[3] < 20) continue
      count += 1
      const key = [0, 1, 2].map((channel) => Math.round(color[channel] / 16) * 16).join(',')
      const bucket = buckets.get(key)
      if (bucket) bucket.push(color)
      else buckets.set(key, [color])
    }
  }
  if (count < 6) return null
  const groups = mergeColorBuckets([...buckets.values()].map((colors) => ({ colors, count: colors.length })))
  const distinct = groups
    .filter((group) => group.count >= 6 && colorDistance(group.color, background) >= 24)
    .sort((left, right) => right.count - left.count)
  const ranked = distinct.length ? distinct : groups.sort((left, right) => right.count - left.count)
  const main = ranked[0]
  if (!main || main.count < 6) return null
  const glyphFloor = Math.max(12, Math.round(count * 0.05))
  const onPanel = main.count >= count * 0.45
    ? ranked.slice(1).find((group) => group.count >= glyphFloor && colorDistance(group.color, main.color) >= 48)
    : undefined
  return (onPanel ?? main).color
}

function mergeColorBuckets(seeds: { colors: [number, number, number, number][]; count: number }[]): { color: [number, number, number, number]; count: number }[] {
  const pending = seeds
    .map((seed) => ({ color: medianColor(seed.colors), colors: seed.colors, count: seed.count }))
    .sort((left, right) => right.count - left.count)
  const groups: { color: [number, number, number, number]; count: number }[] = []
  const used = new Set<number>()
  for (let index = 0; index < pending.length; index += 1) {
    if (used.has(index)) continue
    const members = [pending[index]]
    used.add(index)
    for (let other = index + 1; other < pending.length; other += 1) {
      if (used.has(other)) continue
      if (colorDistance(pending[other].color, pending[index].color) > 56) continue
      members.push(pending[other])
      used.add(other)
    }
    const colors = members.flatMap((member) => member.colors)
    groups.push({ color: medianColor(colors), count: colors.length })
  }
  return groups
}

function medianColor(colors: [number, number, number, number][]): [number, number, number, number] {
  const channels = [0, 1, 2, 3].map((channel) => median(colors.map((color) => color[channel])))
  return [
    Math.round(channels[0]),
    Math.round(channels[1]),
    Math.round(channels[2]),
    Math.round(channels[3] || 255),
  ]
}

function colorDistance(left: [number, number, number, number], right: [number, number, number, number]): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2])
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentileSpread(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)))]
  return pick(0.9) - pick(0.1)
}
