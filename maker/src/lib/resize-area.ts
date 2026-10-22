/** Integrate source pixel areas instead of point-sampling a dithered GIF. This
 * prevents the source's fine halftone grid becoming large moiré patterns. Alpha
 * is premultiplied while filtering so transparent edges keep their true colour.
 */
export function resizeArea(source: ImageData, width: number, height: number): ImageData {
  return resize(source, width, height, false)
}

/** Windowed-sinc low-pass filtering removes the source GIF's high-frequency
 * dither before downsampling, while keeping caption edges sharper than a blur. */
export function resizeGif(source: ImageData, width: number, height: number): ImageData {
  return resize(source, width, height, true)
}

type Filter = { start: number; weights: Float64Array }
const filters = new Map<string, Filter[]>()
function axisFilters(size: number, target: number, lanczos: boolean): Filter[] {
  const key = `${size}:${target}:${lanczos}`
  const cached = filters.get(key)
  if (cached) return cached
  const scale = size / target
  const sinc = (x: number) => Math.abs(x) < 1e-8 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
  const result = Array.from({length:target}, (_, i) => {
    const centre = (i + .5) * scale
    const support = lanczos ? 3 * Math.max(1, scale) : scale / 2
    const start = Math.max(0, Math.floor(centre - support))
    const end = Math.min(size - 1, Math.ceil(centre + support))
    const weights = new Float64Array(end - start + 1)
    let sum = 0
    for (let p = start; p <= end; p++) {
      const distance = (p + .5 - centre) / Math.max(1, scale)
      const weight = lanczos
        ? (Math.abs(distance) < 3 ? sinc(distance) * sinc(distance / 3) : 0)
        : Math.max(0, Math.min((i + 1) * scale, p + 1) - Math.max(i * scale, p))
      weights[p - start] = weight
      sum += weight
    }
    for (let p = 0; p < weights.length; p++) weights[p] /= sum
    return {start, weights}
  })
  if (filters.size >= 8) filters.delete(filters.keys().next().value!)
  filters.set(key, result)
  return result
}

function resize(source: ImageData, width: number, height: number, lanczos: boolean): ImageData {
  if (width === source.width && height === source.height) return source
  const horizontal = axisFilters(source.width, width, lanczos)
  const vertical = axisFilters(source.height, height, lanczos)
  const rows = new Float32Array(width * source.height * 4)
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < width; x++) {
      const filter = horizontal[x]
      const target = (y * width + x) * 4
      let red = 0, green = 0, blue = 0, alpha = 0
      for (let i = 0; i < filter.weights.length; i++) {
        const weight = filter.weights[i]
        const offset = (y * source.width + filter.start + i) * 4
        const a = source.data[offset + 3] * weight
        red += source.data[offset] * a
        green += source.data[offset + 1] * a
        blue += source.data[offset + 2] * a
        alpha += a
      }
      rows[target] = red
      rows[target + 1] = green
      rows[target + 2] = blue
      rows[target + 3] = alpha
    }
  }
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const filter = vertical[y]
    for (let x = 0; x < width; x++) {
      let red = 0, green = 0, blue = 0, alpha = 0
      for (let i = 0; i < filter.weights.length; i++) {
        const weight = filter.weights[i]
        const offset = ((filter.start + i) * width + x) * 4
        red += rows[offset] * weight
        green += rows[offset + 1] * weight
        blue += rows[offset + 2] * weight
        alpha += rows[offset + 3] * weight
      }
      const offset = (y * width + x) * 4
      if (alpha > 0) {
        pixels[offset] = red / alpha
        pixels[offset + 1] = green / alpha
        pixels[offset + 2] = blue / alpha
      }
      pixels[offset + 3] = alpha
    }
  }
  return new ImageData(pixels, width, height)
}
