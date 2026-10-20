import type { Plugin } from 'vite'

export const OPENCV_INITIAL_BYTES = 32 * 1024 * 1024
const INITIAL_PAGES = OPENCV_INITIAL_BYTES / 65536

/** Lower both sides of the pinned Emscripten memory import contract, without changing its growth limit. */
export function boundedOpenCvSource(source: string): string {
  const allocation = 'Module["TOTAL_MEMORY"]||134217728'
  const embedded = /data:application\/(?:octet-stream|wasm);base64,([A-Za-z0-9+/=]+)/
  const match = source.match(embedded)
  if (!source.includes(allocation) || !match) throw new Error('OpenCV allocation changed; review the mobile memory limit before upgrading')
  const bytes = new Uint8Array(Buffer.from(match[1], 'base64'))
  let p = 8
  let memories = 0
  let dataEnd = 0
  function uint() {
    let value = 0, shift = 0, byte: number
    do { byte = bytes[p++]; value += (byte & 127) * 2 ** shift; shift += 7 } while (byte & 128)
    return value
  }
  function skipString() { const length = uint(); p += length }
  function limits() {
    const flags = uint()
    const at = p
    const minimum = uint()
    const length = p - at
    const maximum = flags & 1 ? uint() : undefined
    return { flags, at, minimum, maximum, length }
  }
  while (p < bytes.length) {
    const section = bytes[p++]
    const length = uint()
    const end = p + length
    if (section === 2) {
      for (let i = uint(); i > 0; i--) {
        skipString(); skipString()
        const kind = bytes[p++]
        if (kind === 0) uint()
        else if (kind === 1) { p++; limits() }
        else if (kind === 2) {
          const memory = limits()
          if (memory.flags !== 1 || memory.minimum !== 2048 || memory.maximum !== 16384 || memory.length !== 2) {
            throw new Error('OpenCV WASM memory contract changed')
          }
          bytes[memory.at] = (INITIAL_PAGES & 127) | 128
          bytes[memory.at + 1] = INITIAL_PAGES >> 7
          memories++
        } else if (kind === 3) p += 2
        else throw new Error('Unsupported OpenCV WASM import')
      }
    } else if (section === 11) {
      for (let i = uint(); i > 0; i--) {
        const flags = uint()
        if (flags === 2) uint()
        let offset = 0
        if (flags !== 1) {
          if (bytes[p++] !== 0x41) throw new Error('Unsupported OpenCV data offset')
          // Pinned active data offsets are positive i32.const values.
          const start = p
          offset = uint()
          if (bytes[p - 1] & 0x40 || p - start > 5 || bytes[p++] !== 0x0b) throw new Error('Unsupported OpenCV data expression')
        }
        const size = uint()
        if (flags !== 1) dataEnd = Math.max(dataEnd, offset + size)
        p += size
      }
    }
    p = end
  }
  if (memories !== 1 || dataEnd <= 0 || dataEnd >= OPENCV_INITIAL_BYTES || !WebAssembly.validate(bytes)) {
    throw new Error('OpenCV cannot safely initialize within the configured memory')
  }
  return source.replace(allocation, `Module["TOTAL_MEMORY"]||${OPENCV_INITIAL_BYTES}`)
    .replace(match[0], match[0].slice(0, -match[1].length) + Buffer.from(bytes).toString('base64'))
}

export function boundedOpenCvMemory(): Plugin {
  return {
    name: 'bounded-opencv-initial-memory',
    enforce: 'pre',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk')
      if (!chunks.some(chunk => chunk.isEntry && chunk.facadeModuleId?.endsWith('/index.html'))) return
      if (chunks.some(chunk => Object.keys(chunk.modules).some(id => /node_modules\/(?:@paddleocr|@techstark|onnxruntime-web)\//.test(id)))) {
        this.error('OCR WASM must stay in the disposable worker, outside the page module graph')
      }
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@techstark/opencv-js/dist/opencv.js')) return null
      return { code: boundedOpenCvSource(code), map: null }
    },
  }
}
