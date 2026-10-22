import { GIFEncoder } from 'gifenc'
import { mapOpaquePalette, type GifFrame } from './gif'
import type { StickerFrame } from './wechat-gif'

type MotionOptions = { maxBytes: number; pinned: number[]; onProgress?: (completed: number, total: number) => void }
type Mode = 0 | 1 | 2 // transparent differences, opaque horizontal runs, full opaque frame

/** Every representation reconstructs exactly the same palette indices. Filling
 * unchanged pixels of a partly changed colour run can compress better than
 * punching transparent holes through it. No pixel approximations are made.
 */
function frameBody(current: Uint8Array, previous: Uint8Array | null, width: number, height: number,
  palette: number[][], mode: Mode, delayMs: number, first = false): Uint8Array {
  const transparent = palette.length
  const pixels = current.slice()
  if (previous && mode === 0) {
    for (let p = 0; p < pixels.length; p++) if (current[p] === previous[p]) pixels[p] = transparent
  } else if (previous && mode === 1) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width;) {
      const start = y * width + x, color = current[start]
      let end = x + 1, changed = current[start] !== previous[start]
      while (end < width && current[y * width + end] === color) {
        changed ||= current[y * width + end] !== previous[y * width + end]
        end++
      }
      if (!changed) pixels.fill(transparent, start, y * width + end)
      x = end
    }
  }
  const gif = GIFEncoder({ auto: first })
  gif.writeFrame(pixels, width, height, {
    palette: first ? [...palette, [0, 0, 0]] : undefined,
    delay: delayMs, repeat: 0, dispose: 1, transparent: mode !== 2,
    transparentIndex: transparent, colorDepth: 8,
  })
  return gif.bytes()
}

/** Find a denser timeline using measured lossless frame costs, after the existing
 * export has fixed its dimensions and palette. Bound the graph to eight source
 * steps and never lengthen the baseline's maximum hold or cross a caption cue.
 * Keep the baseline if no strictly denser plan also preserves temporal fidelity.
 */
export function improveGifMotion(frames: GifFrame[], baseline: StickerFrame[], palette: number[][],
  fallback: Uint8Array, options: MotionOptions): Uint8Array {
  const n = frames.length
  if (n < 3 || n > 200 || baseline.length >= n || baseline[0]?.index !== 0 || baseline.at(-1)?.index !== n - 1) return fallback
  const steps = baseline.slice(1).map((item, i) => item.index - baseline[i].index)
  const maxStep = Math.max(...steps)
  if (steps.some(step => step <= 0) || maxStep > 8) return fallback
  const delays = frames.map(frame => Math.max(20, Math.round(frame.delayMs / 10) * 10))
  const starts = [0]
  for (const delay of delays) starts.push(starts.at(-1)! + delay)
  const maxHold = Math.max(...baseline.map(item => item.delayMs))
  if (maxHold > 655_350) return fallback
  const width = frames[0].imageData.width, height = frames[0].imageData.height
  const lookup = new Map<number, number>()
  options.onProgress?.(0, n)
  const indexed = frames.map(frame => {
    if (frame.imageData.width !== width || frame.imageData.height !== height) throw new Error('GIF 帧尺寸不一致。')
    return mapOpaquePalette(frame.imageData, palette, lookup)
  })
  const pins = [...new Set([0, n - 1, ...options.pinned])].sort((a, b) => a - b)
  const costs = new Float64Array(n * n).fill(Infinity)
  const modes = new Uint8Array(n * n)
  for (let j = 1; j < n; j++) {
    for (let i = Math.max(0, j - maxStep); i < j; i++) {
      if (starts[j] - starts[i] > maxHold || pins.some(pin => pin > i && pin < j)) continue
      // Do not claim smoother motion by adding duplicate pictures. Required cue
      // boundaries still need their own frame even if their pixels are equal.
      if (!pins.includes(j) && indexed[j].every((value, p) => value === indexed[i][p])) continue
      const offset = i * n + j
      for (const mode of [0, 1, 2] as const) {
        const bytes = frameBody(indexed[j], indexed[i], width, height, palette, mode, 20)
        if (bytes.length < costs[offset]) { costs[offset] = bytes.length; modes[offset] = mode }
      }
    }
    options.onProgress?.(j + 1, n)
  }
  // Frame delays occupy a fixed-size field, so edge costs are additive even
  // though the final hold of a frame is determined by the next chosen frame.
  const stride = n + 1
  const best = new Float64Array(n * stride).fill(Infinity)
  const back = new Int16Array(n * stride).fill(-1)
  best[1] = frameBody(indexed[0], null, width, height, palette, 2, 20, true).length + 1 // trailer
  for (let j = 1; j < n; j++) for (let i = Math.max(0, j - maxStep); i < j; i++) {
    const cost = costs[i * n + j]
    if (!Number.isFinite(cost)) continue
    for (let count = 2; count <= j + 1; count++) {
      const value = best[i * stride + count - 1] + cost
      if (value < best[j * stride + count]) { best[j * stride + count] = value; back[j * stride + count] = i }
    }
  }
  const distance = new Float64Array(palette.length * palette.length)
  for (let a = 0; a < palette.length; a++) for (let b = 0; b < palette.length; b++) {
    distance[a * palette.length + b] = palette[a].slice(0, 3).reduce((sum, value, channel) => sum + (value - palette[b][channel]) ** 2, 0)
  }
  const errors = new Float64Array(n * n).fill(-1)
  const temporalError = (indices: number[]) => {
    let error = 0
    for (let k = 0; k < indices.length; k++) {
      const i = indices[k], end = indices[k + 1] ?? n
      for (let j = i + 1; j < end; j++) {
        const key = i * n + j
        if (errors[key] < 0) {
          let sum = 0
          for (let p = 0; p < indexed[i].length; p++) sum += distance[indexed[i][p] * palette.length + indexed[j][p]]
          errors[key] = sum
        }
        error += errors[key] * delays[j]
      }
    }
    return error
  }
  let chosen: number[] | null = null
  const baselineError = temporalError(baseline.map(item => item.index))
  // Prefer more genuine source frames, but reject a denser sampling pattern if
  // its held-frame motion error exceeds the already accepted baseline.
  for (let count = baseline.length + 1; count <= n; count++) {
    if (best[(n - 1) * stride + count] >= options.maxBytes) continue
    const indices: number[] = []
    let index = n - 1
    for (let c = count; c > 0; c--) { indices.push(index); index = back[index * stride + c] }
    indices.reverse()
    const error = temporalError(indices)
    if (error <= baselineError) chosen = indices
  }
  if (!chosen) return fallback
  const chunks = chosen.map((index, k) => frameBody(indexed[index], k ? indexed[chosen![k - 1]] : null,
    width, height, palette, k ? modes[chosen![k - 1] * n + index] as Mode : 2,
    starts[chosen![k + 1] ?? n] - starts[index], k === 0))
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 1)
  if (size >= options.maxBytes) return fallback
  const output = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length }
  output[offset] = 0x3b
  return output
}
