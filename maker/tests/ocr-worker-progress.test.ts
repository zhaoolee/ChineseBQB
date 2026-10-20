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

it('reports actual initialization and inference boundaries and disposes before success', async () => {
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
  expect(engine.dispose).toHaveBeenCalledOnce()
})

it('does not report inference or completion when initialization fails', async () => {
  const engine = { sourceToMat: vi.fn(), initialize: vi.fn(async () => { throw new Error('Model unavailable') }), predict: vi.fn(), dispose: vi.fn(async () => undefined) }
  mocks.create.mockResolvedValue(engine)
  await import('../src/workers/ocr.worker')
  scope.onmessage!({ data: { kind: 'recognize', blob: new Blob() } } as MessageEvent)
  await vi.waitFor(() => expect(scope.postMessage).toHaveBeenLastCalledWith({ok: false, error: {name: 'Error', message: 'Model unavailable'}}))
  expect(scope.postMessage.mock.calls.map(([m]) => m.progress?.stage).filter(Boolean)).toEqual(['resources', 'initialize'])
  expect(engine.predict).not.toHaveBeenCalled()
  expect(engine.dispose).toHaveBeenCalledOnce()
})
