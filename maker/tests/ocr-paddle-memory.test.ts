import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'
import { boundedPaddleSource } from '../build/ocr-paddle-memory'
import { isOcrMemoryError, prefersLowMemoryOcr } from '../src/lib/ocr-memory-policy'

const source = readFileSync(new URL('../node_modules/@paddleocr/paddleocr-js/dist/index.mjs', import.meta.url), 'utf8')
const patched = boundedPaddleSource(source)
function initializer(dependencies: Record<string, unknown>) {
  const start = patched.indexOf('async initialize() {')
  const end = patched.indexOf('  getInitializationSummary()', start)
  return runInNewContext(`(async function ${patched.slice(start + 'async '.length, end)})`, dependencies)
}
function fixture() {
  const det = {config: {}, provider:'wasm', dispose:vi.fn()}
  const rec = {config: {}, provider:'wasm', dispose:vi.fn()}
  const dependencies = {
    nowMs: () => 0, initOpenCvRuntime: async () => ({cv:{}}),
    initOrtRuntime: async () => ({ort:{},webgpuState:{available:false},backend:'wasm'}),
    getResolvedAssets: () => ({det:'det',rec:'rec'}), fetch:vi.fn(),
    loadModelAsset:vi.fn(async (name: string) => ({modelBytes:new Uint8Array(8),configText:name,download:{url:name}})),
    validateLoadedModelName:vi.fn(), createDetModel:vi.fn(async () => det),createRecModel:vi.fn(async () => rec),
  }
  const runner = {
    ensureServedFromHttp:vi.fn(),options:{},detModel:null as typeof det | null,recModel:null as typeof rec | null,
    pipelineConfig:{assets:{},modelSelection:{},warnings:[],textDetectionBatchSize:1,textRecognitionBatchSize:1},
    async disposeModelsOnly() {await this.detModel?.dispose();await this.recModel?.dispose();this.detModel=null;this.recModel=null},
  }
  return {dependencies,runner,det,rec}
}

it('loads and initializes detection fully before allocating the recognition model', async () => {
  const {dependencies,runner,det} = fixture()
  let complete!: (value: typeof det) => void
  dependencies.createDetModel.mockImplementationOnce(() => new Promise(resolve => {complete=resolve}))
  const pending = initializer(dependencies).call(runner)
  await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
  expect(dependencies.loadModelAsset.mock.calls.map(call=>call[0])).toEqual(['det'])
  expect(dependencies.createRecModel).not.toHaveBeenCalled()
  complete(det)
  const summary = await pending
  expect(runner.detModel).toBe(det)
  expect(dependencies.loadModelAsset.mock.calls.map(call=>call[0])).toEqual(['det','rec'])
  expect(summary.assets).toEqual([{url:'det'},{url:'rec'}])
})

it('releases an already initialized detection session when recognition initialization fails', async () => {
  const {dependencies,runner,det} = fixture()
  dependencies.createRecModel.mockRejectedValueOnce(new Error('Out of memory'))
  await expect(initializer(dependencies).call(runner)).rejects.toThrow('Out of memory')
  expect(det.dispose).toHaveBeenCalledOnce()
  expect(runner.detModel).toBeNull()
  expect(runner).toHaveProperty('ocrPhase', 'recognition-session')
})

it.each([
  ['initOpenCvRuntime', 'opencv-initialize'],
  ['initOrtRuntime', 'onnx-runtime'],
  ['createDetModel', 'detection-session'],
  ['createRecModel', 'recognition-session'],
] as const)('records the exact failing initialization boundary: %s', async (operation, phase) => {
  const {dependencies,runner} = fixture()
  const failure = new RangeError('Out of memory')
  Object.assign(dependencies, {[operation]: vi.fn(async () => { throw failure })})
  await expect(initializer(dependencies).call(runner)).rejects.toBe(failure)
  expect(runner).toHaveProperty('ocrPhase', phase)
})

it('replaces the previous frame phase before converting the next source image', async () => {
  const start = patched.indexOf('async predict(input, params = {}) {')
  const end = patched.indexOf('  async disposeModelsOnly()', start)
  const predict = runInNewContext(`(async function ${patched.slice(start + 'async '.length, end)})`, {
    nowMs: () => 0, getOcrRuntimeParams: () => ({}), chunkArray: (items: unknown[]) => [items],
  })
  const failure = new RangeError('Out of memory')
  const runner = { cv: {}, ort: {}, detModel: {}, recModel: {}, pipelineConfig: {},
    ocrPhase: 'recognition-inference', sourceToMat: async () => { throw failure } }
  await expect(predict.call(runner, {})).rejects.toBe(failure)
  expect(runner.ocrPhase).toBe('source-conversion')
})

it.each([false,true])('applies bounded session settings only to low-memory workers: %s', async lowMemory => {
  const create = vi.fn(async (_bytes: Uint8Array, _options: unknown) => ({}))
  const start = patched.indexOf('async function createSession('),end=patched.indexOf('async function releaseSessions(',start)
  const scope={__CHINESEBQB_OCR_LOW_MEMORY__:lowMemory}
  const createSession=runInNewContext(`(${patched.slice(start,end)})`,{globalThis:scope})
  await createSession({InferenceSession:{create}},new Uint8Array(),[['wasm']])
  expect(create.mock.calls[0][1]).toMatchObject({graphOptimizationLevel:lowMemory?'basic':'all'})
  if(lowMemory) expect(create.mock.calls[0][1]).toMatchObject({enableCpuMemArena:false,enableMemPattern:false})
})

it('fails the build instead of silently retaining a changed SDK allocation path', () => {
  expect(()=>boundedPaddleSource(source.replace('const loadedAssets = await Promise.all([','const loadedAssets = await Promise.allSettled(['))).toThrow('memory contract')
})

it.each([
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 26_2) CriOS/155 Mobile',0,undefined,true],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X)',5,undefined,true],
  ['desktop',0,4,true],['desktop',0,8,false],
] as const)('selects memory settings for device %s', (userAgent,maxTouchPoints,deviceMemory,expected) => {
  expect(prefersLowMemoryOcr({userAgent,maxTouchPoints,deviceMemory} as unknown as Navigator)).toBe(expected)
})

it('distinguishes memory faults from unrelated download failures', () => {
  expect(isOcrMemoryError(new Error('Out of memory'))).toBe(true)
  expect(isOcrMemoryError(new Error('memory access out of bounds'))).toBe(true)
  expect(isOcrMemoryError(new Error('Failed to fetch dynamically imported module'))).toBe(false)
})
