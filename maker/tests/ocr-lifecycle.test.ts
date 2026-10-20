import { afterEach, beforeEach, expect, it, vi } from 'vitest'

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: (() => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() { FakeWorker.instances.push(this) }
  reply(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}
let page: EventTarget
beforeEach(() => {
  vi.resetModules()
  FakeWorker.instances = []
  page = new EventTarget()
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('window', page)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function nextWorker(count: number) {
  await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(count))
  return FakeWorker.instances[count - 1]
}

it('serializes inference, skips stale queued requests, and terminates before the next worker', async () => {
  const { recognize } = await import('../src/lib/ocr')
  const first = recognize(new Blob(['first']))
  let current = true
  const stale = recognize(new Blob(['stale']), () => current)
  const last = recognize(new Blob(['last']))
  const worker = await nextWorker(1)
  expect(worker.postMessage.mock.calls[0][0]).toMatchObject({ kind: 'recognize', blob: expect.any(Blob) })
  current = false
  worker.reply({ ok: true, items: [] })
  const second = await nextWorker(2)
  expect(worker.terminate).toHaveBeenCalledOnce()
  second.reply({ ok: true, items: [] })
  await Promise.all([first, stale, last])
  expect(second.terminate).toHaveBeenCalledOnce()
})

it('releases a poisoned WASM backend and retries in a fresh worker', async () => {
  const { recognize } = await import('../src/lib/ocr')
  const failed = recognize(new Blob())
  const rejection = expect(failed).rejects.toThrow('内存不足')
  const worker = await nextWorker(1)
  worker.reply({ ok: false, error: { name: 'RangeError', message: 'no available backend found. ERR: [wasm] RangeError: Out of memory' } })
  await rejection
  expect(worker.terminate).toHaveBeenCalledOnce()
  const retry = recognize(new Blob())
  const fresh = await nextWorker(2)
  expect(fresh).not.toBe(worker)
  fresh.reply({ ok: true, items: [{ text: '丢人', score: 1, poly: [[0,0],[80,0],[80,40],[0,40]] }] })
  expect((await retry)[0].originalText).toBe('丢人')
  expect(fresh.terminate).toHaveBeenCalledOnce()
})

it('terminates on pagehide and allows recognition after a page is restored', async () => {
  const { recognize } = await import('../src/lib/ocr')
  const pending = recognize(new Blob())
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  const worker = await nextWorker(1)
  page.dispatchEvent(new Event('pagehide'))
  await rejected
  expect(worker.terminate).toHaveBeenCalledOnce()
  const retry = recognize(new Blob())
  const fresh = await nextWorker(2)
  fresh.reply({ ok: true, items: [] })
  await expect(retry).resolves.toEqual([])
})

it('terminates immediately when changing pictures, without accepting a late result', async () => {
  const { recognize, cancelOcrRecognition } = await import('../src/lib/ocr')
  const pending = recognize(new Blob())
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  const worker = await nextWorker(1)
  cancelOcrRecognition()
  worker.reply({ ok: true, items: [] })
  await rejected
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it.each(['error', 'messageerror', 'invalid'] as const)('cleans up after worker %s', async (kind) => {
  const { recognize } = await import('../src/lib/ocr')
  const pending = recognize(new Blob())
  const rejected = expect(pending).rejects.toBeInstanceOf(Error)
  const worker = await nextWorker(1)
  if (kind === 'error') worker.onerror?.({ message: 'Failed to load worker', preventDefault() {} } as ErrorEvent)
  else if (kind === 'messageerror') worker.onmessageerror?.()
  else worker.reply({ wrong: true })
  await rejected
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it('terminates a stalled worker on timeout rather than leaving a background allocation alive', async () => {
  vi.useFakeTimers()
  const { runOcrWorker, OCR_WORKER_TIMEOUT_MS } = await import('../src/lib/ocr-worker-client')
  const pending = runOcrWorker(new Blob())
  const rejected = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
  await vi.advanceTimersByTimeAsync(OCR_WORKER_TIMEOUT_MS)
  await rejected
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
})

it('forwards progress without settling or terminating, and ignores messages after completion', async () => {
  const { recognize } = await import('../src/lib/ocr')
  const progress = vi.fn()
  const pending = recognize(new Blob(), () => true, progress)
  const worker = await nextWorker(1)
  worker.reply({ kind: 'progress', progress: { stage: 'initialize' } })
  worker.reply({ kind: 'progress', progress: { stage: 'recognize' } })
  expect(progress.mock.calls.map(([value]) => value.stage)).toEqual(['initialize', 'recognize'])
  expect(worker.terminate).not.toHaveBeenCalled()
  worker.reply({ ok: true, items: [] })
  await expect(pending).resolves.toEqual([])
  worker.reply({ kind: 'progress', progress: { stage: 'finish' } })
  expect(progress).toHaveBeenCalledTimes(2)
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it('suppresses progress from stale recognition and after cancellation', async () => {
  const { recognize, cancelOcrRecognition } = await import('../src/lib/ocr')
  let current = true
  const progress = vi.fn()
  const pending = recognize(new Blob(), () => current, progress)
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  const worker = await nextWorker(1)
  current = false
  worker.reply({ kind: 'progress', progress: { stage: 'recognize' } })
  cancelOcrRecognition()
  worker.reply({ kind: 'progress', progress: { stage: 'finish' } })
  await rejected
  expect(progress).not.toHaveBeenCalled()
})
