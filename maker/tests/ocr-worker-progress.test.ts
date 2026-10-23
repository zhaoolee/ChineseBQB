import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), assets: vi.fn() }))
vi.mock('@paddleocr/paddleocr-js', () => ({ PaddleOCR: { create: mocks.create } }))
vi.mock('../src/lib/ocr-assets', () => ({ prepareOcrAssets: mocks.assets }))

type WorkerScope = { onmessage: ((event: MessageEvent) => void) | null; postMessage: ReturnType<typeof vi.fn> }
let scope: WorkerScope
beforeEach(() => {
  vi.resetModules()
  scope = { onmessage: null, postMessage: vi.fn() }
  vi.stubGlobal('self', scope)
  mocks.assets.mockResolvedValue({ fetch: vi.fn() })
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

it('reports actual initialization and inference boundaries while retaining the engine', async () => {
  let initialized!: () => void
  let predicted!: (items: unknown[]) => void
  const engine = {
    sourceToMat: vi.fn(),
    initialize: vi.fn(() => new Promise<void>(resolve => { initialized = resolve })),
    predict: vi.fn(() => new Promise(resolve => { predicted = resolve })),
    dispose: vi.fn(async () => undefined),
  }
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({ data: { kind: 'recognize', blob: new Blob() } } as MessageEvent)
  await vi.waitFor(() => expect(engine.initialize).toHaveBeenCalledOnce())
  expect(scope.postMessage.mock.calls.map(([m]) => m.progress?.stage)).toEqual(['resources', 'initialize'])
  expect(engine.predict).not.toHaveBeenCalled()
  initialized()
  await vi.waitFor(() => expect(engine.predict).toHaveBeenCalledOnce())
  expect(scope.postMessage).toHaveBeenLastCalledWith({ kind: 'progress', progress: {stage: 'recognize'} })
  predicted([{items: []}])
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: true, items: []}))
  expect(scope.postMessage.mock.calls.map(([m]) => m.progress?.stage).filter(Boolean)).toEqual(['resources', 'initialize', 'recognize', 'finish'])
  expect(engine.dispose).not.toHaveBeenCalled()
})

it('does not report inference or completion when initialization fails', async () => {
  const engine = { sourceToMat: vi.fn(), initialize: vi.fn(async () => { throw new Error('Model unavailable') }), predict: vi.fn(), dispose: vi.fn(async () => undefined) }
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({ data: { kind: 'recognize', blob: new Blob() } } as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: false, error: expect.objectContaining({name: 'Error', message: 'Model unavailable', stage: 'initialize', phase: 'initialize', stack: expect.stringContaining('Model unavailable')})}))
  expect(scope.postMessage.mock.calls.map(([m]) => m.progress?.stage).filter(Boolean)).toEqual(['resources', 'initialize'])
  expect(engine.predict).not.toHaveBeenCalled()
  expect(engine.dispose).toHaveBeenCalledOnce()
})

it('initializes before a picture is supplied and reuses that engine across two inferences', async () => {
  const engine = {sourceToMat: vi.fn(), initialize: vi.fn(async () => undefined), predict: vi.fn(async () => [{items: ['text']}]), dispose: vi.fn(async () => undefined)}
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({data: {kind: 'warmup'}} as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({kind: 'ready'}))
  expect(engine.initialize).toHaveBeenCalledOnce()
  expect(engine.predict).not.toHaveBeenCalled()
  expect(engine.dispose).not.toHaveBeenCalled()
  const warmMessages = scope.postMessage.mock.calls.length
  scope.onmessage!({data: {kind: 'recognize', blob: new Blob()}} as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: true, items: ['text']}))
  expect(mocks.create).toHaveBeenCalledOnce()
  expect(engine.initialize).toHaveBeenCalledOnce()
  expect(engine.predict).toHaveBeenCalledOnce()
  expect(engine.dispose).not.toHaveBeenCalled()
  expect(scope.postMessage.mock.calls.slice(warmMessages).map(([m]) => m.progress?.stage).filter(Boolean)).toEqual(['recognize', 'finish'])
  scope.onmessage!({data: {kind: 'recognize', blob: new Blob(['second'])}} as MessageEvent)
  await vi.waitFor(() => expect(engine.predict).toHaveBeenCalledTimes(2))
  await vi.waitFor(() => expect(scope.postMessage.mock.calls.filter(([m]) => m.ok)).toHaveLength(2))
  expect(mocks.create).toHaveBeenCalledOnce()
  expect(engine.initialize).toHaveBeenCalledOnce()
  expect(engine.dispose).not.toHaveBeenCalled()
})

it('joins an unfinished warm-up instead of initializing another engine', async () => {
  let ready!: () => void
  const engine = {sourceToMat: vi.fn(), initialize: vi.fn(() => new Promise<void>(resolve => {ready = resolve})), predict: vi.fn(async () => [{items: []}]), dispose: vi.fn(async () => undefined)}
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({data: {kind: 'warmup'}} as MessageEvent)
  await vi.waitFor(() => expect(ready).toBeTypeOf('function'))
  scope.onmessage!({data: {kind: 'warmup'}} as MessageEvent)
  scope.onmessage!({data: {kind: 'recognize', blob: new Blob()}} as MessageEvent)
  expect(engine.predict).not.toHaveBeenCalled()
  ready()
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: true, items: []}))
  expect(mocks.create).toHaveBeenCalledOnce()
  expect(engine.initialize).toHaveBeenCalledOnce()
  expect(engine.dispose).not.toHaveBeenCalled()
})

it('disposes a failed warm initialization without trying inference', async () => {
  const engine = {sourceToMat: vi.fn(), initialize: vi.fn(async () => {throw new Error('Warm-up failed')}), predict: vi.fn(), dispose: vi.fn(async () => undefined)}
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({data: {kind: 'warmup'}} as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: false, error: expect.objectContaining({name: 'Error', message: 'Warm-up failed', stage: 'initialize'})}))
  expect(engine.predict).not.toHaveBeenCalled()
  expect(engine.dispose).toHaveBeenCalledOnce()
})

it('keeps the failing SDK phase and original stack when a model session cannot allocate', async () => {
  const failure = new RangeError('Out of memory')
  const engine = {
    sourceToMat: vi.fn(), ocrPhase: 'recognition-session', cv: { HEAPU8: new Uint8Array(64) },
    initialize: vi.fn(async () => { throw failure }), predict: vi.fn(), dispose: vi.fn(async () => undefined),
  }
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({data: {kind: 'recognize', blob: new Blob()}} as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: false, error: {
    name: 'RangeError', message: 'Out of memory', stack: failure.stack,
    stage: 'initialize', phase: 'recognition-session', openCvHeapBytes: 64,
  }}))
})
