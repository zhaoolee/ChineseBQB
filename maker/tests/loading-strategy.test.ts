import { afterEach, expect, it, vi } from 'vitest'
import { makeStylesheetAsync } from '../build/async-app-styles'
import { afterFirstPaint } from '../src/lib/after-first-paint'
import { waitForAppStyles } from '../src/lib/app-styles'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('starts content work only after a second animation frame and cancels cleanly', () => {
  const frames = new Map<number, (time: number) => void>()
  let nextFrame = 1
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })

  const task = vi.fn()
  const cancel = afterFirstPaint(task)
  expect(frames.size).toBe(1)

  const [firstId, first] = [...frames.entries()][0]
  frames.delete(firstId)
  first(0)
  // The first rAF callback still belongs to the frame that has not painted yet.
  expect(task).not.toHaveBeenCalled()
  expect(frames.size).toBe(1)

  const [secondId, second] = [...frames.entries()][0]
  frames.delete(secondId)
  second(16)
  expect(task).toHaveBeenCalledOnce()

  const cancelledTask = vi.fn()
  const cancelAgain = afterFirstPaint(cancelledTask)
  const [pendingId, pending] = [...frames.entries()][0]
  frames.delete(pendingId)
  pending(32)
  cancelAgain()
  expect(frames.size).toBe(0)
  expect(cancelledTask).not.toHaveBeenCalled()
  cancel()
})

it('falls back to a timer when the environment has no frame clock', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', undefined)
  const task = vi.fn()
  afterFirstPaint(task)
  expect(task).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(0)
  expect(task).toHaveBeenCalledOnce()
})

it('turns the built app stylesheet into an async load with a noscript fallback', () => {
  const html = '<link rel="stylesheet" crossorigin href="/ChineseBQB/maker/assets/index-abc.css">'
  const result = makeStylesheetAsync(html)
  expect(result).toContain('data-maker-app-styles')
  expect(result).toContain('media="print"')
  expect(result).toContain("this.media='all'")
  expect(result).toContain("this.dataset.makerAppStylesReady='true'")
  expect(result).toContain('<noscript><link rel="stylesheet" crossorigin href="/ChineseBQB/maker/assets/index-abc.css"></noscript>')
  expect(makeStylesheetAsync('<link rel="stylesheet" href="https://example.com/font.css">'))
    .toBe('<link rel="stylesheet" href="https://example.com/font.css">')
})

it('keeps the boot skeleton until the marked stylesheet reports ready', async () => {
  class FakeLink extends EventTarget {
    dataset: Record<string, string> = {}
  }
  const link = new FakeLink()
  const doc = { querySelector: () => link } as unknown as Parameters<typeof waitForAppStyles>[0]

  let settled = false
  const pending = waitForAppStyles(doc).then(() => { settled = true })
  await Promise.resolve()
  expect(settled).toBe(false)

  link.dispatchEvent(new Event('load'))
  await pending
  expect(settled).toBe(true)

  link.dataset.makerAppStylesReady = 'true'
  await expect(waitForAppStyles(doc)).resolves.toBeUndefined()
})
