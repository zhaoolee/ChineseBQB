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
let documentState: EventTarget & { visibilityState: string }
beforeEach(() => {
  vi.resetModules()
  FakeWorker.instances = []
  page = new EventTarget()
  Object.assign(page, { setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms), clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id) })
  documentState = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('window', page)
  vi.stubGlobal('document', documentState)
})
afterEach(async () => {
  const { cancelOcrRecognition, cancelOcrWarmup } = await import('../src/lib/ocr-worker-client')
  cancelOcrRecognition()
  cancelOcrWarmup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function nextWorker(count: number) {
  await vi.waitFor(() => expect(FakeWorker.instances).toHaveLength(count))
  return FakeWorker.instances[count - 1]
}

it('serializes inference, skips stale queued requests, and reuses the same warm worker', async () => {
  const { recognize } = await import('../src/lib/ocr')
  const first = recognize(new Blob(['first']))
  let current = true
  const stale = recognize(new Blob(['stale']), () => current)
  const last = recognize(new Blob(['last']))
  const worker = await nextWorker(1)
  expect(worker.postMessage.mock.calls[0][0]).toMatchObject({ kind: 'recognize', blob: expect.any(Blob) })
  current = false
  worker.reply({ ok: true, items: [] })
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))
  expect(FakeWorker.instances).toHaveLength(1)
  expect(worker.terminate).not.toHaveBeenCalled()
  worker.reply({ ok: true, items: [] })
  await Promise.all([first, stale, last])
  expect(worker.terminate).not.toHaveBeenCalled()
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
  expect(fresh.terminate).not.toHaveBeenCalled()
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

it('cancels immediately, drains the discarded result, and reuses the engine for the next picture', async () => {
  const { recognize, cancelOcrRecognition } = await import('../src/lib/ocr')
  const pending = recognize(new Blob())
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  const worker = await nextWorker(1)
  cancelOcrRecognition()
  await rejected
  expect(worker.terminate).not.toHaveBeenCalled()
  const next = recognize(new Blob(['next']))
  await Promise.resolve()
  expect(worker.postMessage).toHaveBeenCalledTimes(1)
  worker.reply({ ok: true, items: [{text: 'stale'}] })
  await vi.waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))
  worker.reply({ ok: true, items: [] })
  await expect(next).resolves.toEqual([])
  expect(FakeWorker.instances).toHaveLength(1)
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
  expect(worker.terminate).not.toHaveBeenCalled()
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

it('prewarms only one worker and reuses it across pictures', async () => {
  const { warmOcrWorker, cancelOcrRecognition, runOcrWorker } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  warmOcrWorker()
  const worker = FakeWorker.instances[0]
  expect(FakeWorker.instances).toHaveLength(1)
  expect(worker.postMessage).toHaveBeenCalledWith({kind: 'warmup'})
  worker.reply({kind: 'progress', progress: {stage: 'initialize'}})
  worker.reply({kind: 'ready'})
  cancelOcrRecognition()
  expect(worker.terminate).not.toHaveBeenCalled()
  const progress = vi.fn()
  const pending = runOcrWorker(new Blob(), progress)
  expect(progress).toHaveBeenCalledWith({stage: 'recognize'})
  expect(worker.postMessage).toHaveBeenLastCalledWith({kind: 'recognize', blob: expect.any(Blob)})
  expect(FakeWorker.instances).toHaveLength(1)
  worker.reply({ok: true, items: ['first']})
  await expect(pending).resolves.toEqual(['first'])
  expect(worker.terminate).not.toHaveBeenCalled()
  const next = runOcrWorker(new Blob())
  expect(FakeWorker.instances).toHaveLength(1)
  worker.reply({ok: true, items: []})
  await next
})

it('claims initialization already in flight without resolving recognition on the ready message', async () => {
  const { warmOcrWorker, runOcrWorker } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  const progress = vi.fn()
  const completed = vi.fn()
  const pending = runOcrWorker(new Blob(), progress).then(completed)
  const worker = FakeWorker.instances[0]
  worker.reply({kind: 'ready'})
  await Promise.resolve()
  expect(completed).not.toHaveBeenCalled()
  worker.reply({kind: 'progress', progress: {stage: 'recognize'}})
  expect(progress).toHaveBeenLastCalledWith({stage: 'recognize'})
  worker.reply({ok: true, items: []})
  await pending
  expect(completed).toHaveBeenCalledOnce()
  expect(FakeWorker.instances).toHaveLength(1)
})

it('discards failed prewarming silently and starts recognition with a fresh worker', async () => {
  const { warmOcrWorker, runOcrWorker } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  const failed = FakeWorker.instances[0]
  failed.reply({ok: false, error: {name: 'RangeError', message: 'Out of memory'}})
  expect(failed.terminate).toHaveBeenCalledOnce()
  const pending = runOcrWorker(new Blob())
  const fresh = FakeWorker.instances[1]
  failed.reply({kind: 'ready'})
  fresh.reply({ok: true, items: []})
  await expect(pending).resolves.toEqual([])
})

it('expires an unused warmed heap and can still recognize afterward', async () => {
  vi.useFakeTimers()
  const { warmOcrWorker, runOcrWorker, OCR_WARM_IDLE_MS } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  const warm = FakeWorker.instances[0]
  warm.reply({kind: 'ready'})
  await vi.advanceTimersByTimeAsync(OCR_WARM_IDLE_MS)
  expect(warm.terminate).toHaveBeenCalledOnce()
  const pending = runOcrWorker(new Blob())
  FakeWorker.instances[1].reply({ok: true, items: []})
  await pending
})

it('times out stalled prewarming and resets its timer when a picture claims the worker', async () => {
  vi.useFakeTimers()
  const { warmOcrWorker, runOcrWorker, OCR_WORKER_TIMEOUT_MS } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  await vi.advanceTimersByTimeAsync(OCR_WORKER_TIMEOUT_MS)
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  warmOcrWorker()
  await vi.advanceTimersByTimeAsync(OCR_WORKER_TIMEOUT_MS - 1)
  const pending = runOcrWorker(new Blob())
  const rejected = expect(pending).rejects.toMatchObject({name: 'TimeoutError'})
  await vi.advanceTimersByTimeAsync(1)
  expect(FakeWorker.instances[1].terminate).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(OCR_WORKER_TIMEOUT_MS - 1)
  await rejected
  expect(FakeWorker.instances[1].terminate).toHaveBeenCalledOnce()
})

it.each(['pagehide', 'hidden'])('releases unused prewarming on %s', async kind => {
  const { warmOcrWorker } = await import('../src/lib/ocr-worker-client')
  warmOcrWorker()
  if (kind === 'pagehide') page.dispatchEvent(new Event('pagehide'))
  else {
    documentState.visibilityState = 'hidden'
    documentState.dispatchEvent(new Event('visibilitychange'))
  }
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
})

it('schedules after rendering, survives effect replay and cancels unused prewarming on unmount', async () => {
  vi.useFakeTimers()
  const { scheduleOcrWarmup } = await import('../src/lib/ocr-worker-client')
  const firstCleanup = scheduleOcrWarmup()
  firstCleanup()
  const cleanup = scheduleOcrWarmup()
  expect(FakeWorker.instances).toHaveLength(0)
  await vi.advanceTimersByTimeAsync(0)
  expect(FakeWorker.instances).toHaveLength(1)
  cleanup()
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
})

it('waits until a background page is visible before preparing the engine', async () => {
  vi.useFakeTimers()
  const { scheduleOcrWarmup } = await import('../src/lib/ocr-worker-client')
  documentState.visibilityState = 'hidden'
  const cleanup = scheduleOcrWarmup()
  await vi.advanceTimersByTimeAsync(0)
  expect(FakeWorker.instances).toHaveLength(0)
  documentState.visibilityState = 'visible'
  documentState.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(0)
  expect(FakeWorker.instances).toHaveLength(1)
  cleanup()
})

it('does not create a competing warm worker when recognition starts before the idle callback', async () => {
  vi.useFakeTimers()
  const { scheduleOcrWarmup, runOcrWorker } = await import('../src/lib/ocr-worker-client')
  const cleanup = scheduleOcrWarmup()
  const pending = runOcrWorker(new Blob())
  await vi.advanceTimersByTimeAsync(0)
  expect(FakeWorker.instances).toHaveLength(1)
  cleanup()
  expect(FakeWorker.instances[0].terminate).not.toHaveBeenCalled()
  FakeWorker.instances[0].reply({ok: true, items: []})
  await pending
})


it('releases a successfully used engine after the idle limit', async () => {
  vi.useFakeTimers()
  const { runOcrWorker, OCR_WARM_IDLE_MS } = await import('../src/lib/ocr-worker-client')
  const first = runOcrWorker(new Blob())
  const worker = FakeWorker.instances[0]
  worker.reply({ok: true, items: []})
  await first
  await vi.advanceTimersByTimeAsync(OCR_WARM_IDLE_MS - 1)
  const second = runOcrWorker(new Blob())
  await vi.advanceTimersByTimeAsync(1)
  expect(worker.terminate).not.toHaveBeenCalled()
  worker.reply({ok: true, items: []})
  await second
  await vi.advanceTimersByTimeAsync(OCR_WARM_IDLE_MS)
  expect(worker.terminate).toHaveBeenCalledOnce()
})

it('still releases a stalled inference after skipping, allowing a fresh retry', async () => {
  vi.useFakeTimers()
  const { runOcrWorker, cancelOcrRecognition, OCR_WORKER_TIMEOUT_MS } = await import('../src/lib/ocr-worker-client')
  const first = runOcrWorker(new Blob())
  const rejected = expect(first).rejects.toMatchObject({name: 'AbortError'})
  cancelOcrRecognition()
  await rejected
  const next = runOcrWorker(new Blob())
  await vi.advanceTimersByTimeAsync(OCR_WORKER_TIMEOUT_MS)
  expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
  expect(FakeWorker.instances).toHaveLength(2)
  FakeWorker.instances[1].reply({ok: true, items: []})
  await expect(next).resolves.toEqual([])
})
