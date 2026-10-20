import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({ env: { wasm: {} as Record<string, unknown> } }))
vi.mock('onnxruntime-web/wasm', () => runtime)

const detUrl = '/ChineseBQB/maker/models/det.tar'
const recUrl = '/ChineseBQB/maker/models/rec.tar'

beforeEach(() => {
  vi.resetModules()
  runtime.env.wasm = {}
  vi.stubGlobal('location', { href: 'https://example.test/ChineseBQB/maker/' })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function storage() {
  const entries = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (url: string) => entries.get(url)?.clone()),
    put: vi.fn(async (url: string, response: Response) => {
      entries.set(url, new Response(await response.arrayBuffer(), { headers: response.headers }))
    }),
  }
  vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
  return { cache, entries }
}

it('does not retain WASM bytes or prefetch model bodies, and reuses cached model downloads', async () => {
  const { entries } = storage()
  const network = vi.fn(async (url: string) => new Response(url))
  vi.stubGlobal('fetch', network)
  const { prepareOcrAssets } = await import('../src/lib/ocr-assets')
  const assets = await prepareOcrAssets(detUrl, recUrl)
  expect(network).not.toHaveBeenCalled()
  expect(runtime.env.wasm.wasmBinary).toBeUndefined()
  expect(runtime.env.wasm.wasmPaths).toMatchObject({ wasm: expect.stringContaining('ort-wasm-simd-threaded.wasm') })
  expect(runtime.env.wasm.numThreads).toBe(1)
  expect(await (await assets.fetch(detUrl)).text()).toContain('det.tar')
  expect(await (await assets.fetch(recUrl)).text()).toContain('rec.tar')
  await vi.waitFor(() => expect(entries.size).toBe(2))
  const next = await prepareOcrAssets(detUrl, recUrl)
  expect(await (await next.fetch(detUrl)).text()).toContain('det.tar')
  expect(network).toHaveBeenCalledTimes(2)
})

it('still recognizes when browser storage is disabled or full', async () => {
  vi.stubGlobal('caches', { open: vi.fn(async () => { throw new Error('Storage disabled') }) })
  vi.stubGlobal('fetch', vi.fn(async () => new Response('resource')))
  const { prepareOcrAssets } = await import('../src/lib/ocr-assets')
  const assets = await prepareOcrAssets(detUrl, recUrl)
  expect(await (await assets.fetch(detUrl)).text()).toBe('resource')
  const { cache } = storage()
  cache.put.mockRejectedValue(new Error('Quota exceeded'))
  const next = await prepareOcrAssets(detUrl, recUrl)
  expect(await (await next.fetch(recUrl)).text()).toBe('resource')
})

it('does not cache an HTTP failure, so a retry can download a good resource', async () => {
  const { entries } = storage()
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
    .mockResolvedValueOnce(new Response('valid model')))
  const { fetchOcrAsset } = await import('../src/lib/ocr-assets')
  await expect(fetchOcrAsset(detUrl)).rejects.toThrow('503')
  expect(entries.size).toBe(0)
  expect(await (await fetchOcrAsset(detUrl)).text()).toBe('valid model')
})

it('gives downloads an abort signal so stalled requests cannot wait forever', async () => {
  const controller = new AbortController()
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal)
  const network = vi.fn((_url, options) => new Promise<Response>((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason))
  }))
  vi.stubGlobal('fetch', network)
  const { fetchOcrAsset } = await import('../src/lib/ocr-assets')
  const pending = fetchOcrAsset(detUrl)
  const rejection = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
  await vi.waitFor(() => expect(network).toHaveBeenCalledOnce())
  controller.abort(new DOMException('Timed out', 'TimeoutError'))
  await rejection
})
