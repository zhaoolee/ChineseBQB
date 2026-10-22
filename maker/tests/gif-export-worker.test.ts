import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { exportGifInWorker } from '../src/lib/gif-export-worker'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage?: (event: { data: unknown }) => void
  onerror?: (event: unknown) => void
  onmessageerror?: () => void
  terminate = vi.fn()
  postMessage = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
}
const edits = { blocks: [], freeTexts: [], selectedId: null }
beforeEach(() => {
  vi.useFakeTimers()
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('window', new EventTarget())
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('passes only compressed source and edits, reports progress and releases the worker after success', async () => {
  const source = new Blob(['gif'])
  const progress = vi.fn()
  const pending = exportGifInWorker(source, edits, { onProgress: progress })
  const worker = FakeWorker.instances[0]
  expect(worker.postMessage).toHaveBeenCalledWith({ source, edits })
  worker.onmessage?.({ data: { progress: { stage:'prepare', completed:1, total:115 } } })
  expect(progress).toHaveBeenCalledOnce()
  const blob = new Blob(['encoded'], { type:'image/gif' })
  worker.onmessage?.({ data: { blob } })
  expect(await pending).toBe(blob)
  expect(worker.terminate).toHaveBeenCalledOnce()
  worker.onmessage?.({ data: { progress: {} } })
  expect(progress).toHaveBeenCalledOnce()
  expect(vi.getTimerCount()).toBe(0)
})

it('cancels CPU work immediately, ignores late results, and allows a new export', async () => {
  const controller = new AbortController()
  const pending = exportGifInWorker(new Blob(), edits, { signal:controller.signal })
  const rejection = expect(pending).rejects.toMatchObject({ name:'AbortError' })
  controller.abort()
  await rejection
  const first = FakeWorker.instances[0]
  expect(first.terminate).toHaveBeenCalledOnce()
  first.onmessage?.({ data: { blob:new Blob() } })
  const retry = exportGifInWorker(new Blob(), edits)
  FakeWorker.instances[1].onmessage?.({ data: { blob:new Blob(['retry']) } })
  expect((await retry).size).toBe(5)
  expect(vi.getTimerCount()).toBe(0)
})

it('does not start an already cancelled export and stops timed-out or failed workers', async () => {
  await expect(exportGifInWorker(new Blob(), edits, { signal:AbortSignal.abort() })).rejects.toMatchObject({ name:'AbortError' })
  expect(FakeWorker.instances).toHaveLength(0)
  const pending = exportGifInWorker(new Blob(), edits)
  const rejection = expect(pending).rejects.toThrow('耗时过长')
  await vi.advanceTimersByTimeAsync(120_000)
  await rejection
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  const failed = exportGifInWorker(new Blob(), edits)
  FakeWorker.instances[1].onmessage?.({ data:{ error:'encoding failed' } })
  await expect(failed).rejects.toThrow('encoding failed')
  expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce()
})
