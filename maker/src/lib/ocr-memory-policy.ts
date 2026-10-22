export function isOcrMemoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /out of memory|memory access out of bounds|failed to allocate|allocation failed|cannot enlarge memory|bad_alloc/i.test(message)
}

/** iOS browsers do not expose deviceMemory. Choose the bounded inference path
 * for them explicitly; the editor and downloaded image keep their own pixels.
 */
export function prefersLowMemoryOcr(device = globalThis.navigator): boolean {
  if (!device) return false
  const memory = (device as Navigator & { deviceMemory?: number }).deviceMemory
  return (memory !== undefined && memory <= 4) || /iPhone|iPad|iPod/i.test(device.userAgent)
    || (/Macintosh/i.test(device.userAgent) && device.maxTouchPoints > 1)
}
