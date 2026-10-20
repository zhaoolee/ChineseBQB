import { expect, it } from 'vitest'
import { boundedOpenCvSource, OPENCV_INITIAL_BYTES } from '../build/ocr-memory'

function uint(value: number) {
  const bytes: number[] = []
  do { const byte = value & 127; value >>>= 7; bytes.push(byte | (value ? 128 : 0)) } while (value)
  return bytes
}
function sampleModule(offset = 1024) {
  const memory = [1, 3, 101, 110, 118, 6, 109, 101, 109, 111, 114, 121, 2, 1, ...uint(2048), ...uint(16384)]
  const data = [1, 0, 0x41, ...uint(offset), 0x0b, 4, 1, 2, 3, 4]
  return new Uint8Array([0,97,115,109,1,0,0,0, 2,...uint(memory.length),...memory, 11,...uint(data.length),...data])
}
function source(wasm: Uint8Array) {
  return `var INITIAL_TOTAL_MEMORY=Module["TOTAL_MEMORY"]||134217728;var wasm="data:application/octet-stream;base64,${Buffer.from(wasm).toString('base64')}";`
}

it('lowers both the JavaScript allocation and the actual WASM import minimum to 32 MiB', () => {
  const original = sampleModule()
  const memory = new WebAssembly.Memory({ initial: OPENCV_INITIAL_BYTES / 65536, maximum: 16384 })
  expect(() => new WebAssembly.Instance(new WebAssembly.Module(original), { env: { memory } })).toThrow(WebAssembly.LinkError)
  const adjusted = boundedOpenCvSource(source(original))
  expect(adjusted).toContain('Module["TOTAL_MEMORY"]||33554432')
  const binary = new Uint8Array(Buffer.from(adjusted.match(/base64,([A-Za-z0-9+/=]+)/)![1], 'base64'))
  expect(() => new WebAssembly.Instance(new WebAssembly.Module(binary), { env: { memory } })).not.toThrow()
  expect([...new Uint8Array(memory.buffer, 1024, 4)]).toEqual([1,2,3,4])
})

it('refuses a build when active WASM data would exceed the reduced initial heap', () => {
  expect(() => boundedOpenCvSource(source(sampleModule(OPENCV_INITIAL_BYTES)))).toThrow('cannot safely initialize')
})

it('requires a review if the pinned OpenCV allocation changes', () => {
  expect(() => boundedOpenCvSource(source(sampleModule()).replace('134217728', '268435456'))).toThrow('allocation changed')
})
