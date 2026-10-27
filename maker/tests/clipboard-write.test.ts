import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clipboardErrorMessage, writeClipboardImage } from '../src/lib/clipboard-write'

class Item {
  constructor(public data: Record<string, Promise<Blob>>) {}
}
const png = () => new Blob(['png'], { type: 'image/png' })
beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('ClipboardItem', Item)
})
afterEach(() => vi.unstubAllGlobals())

it('starts the clipboard write immediately while the composite is still pending', async () => {
  let finish!: (blob: Blob) => void
  const composite = new Promise<Blob>(resolve => { finish = resolve })
  const write = vi.fn(async (items: Item[]) => { await items[0].data['image/png'] })
  vi.stubGlobal('navigator', { clipboard: { write } })
  const pending = writeClipboardImage(() => composite, new AbortController().signal)
  expect(write).toHaveBeenCalledOnce()
  expect(write.mock.calls[0][0][0]).toBeInstanceOf(Item)
  finish(png())
  await pending
})

it('does not render or write when image clipboard access is unavailable', async () => {
  vi.stubGlobal('navigator', {})
  const render = vi.fn()
  await expect(writeClipboardImage(render, new AbortController().signal)).rejects.toThrow('不支持复制图片')
  expect(render).not.toHaveBeenCalled()
})

it('rejects a cancelled pending image instead of allowing a late clipboard payload', async () => {
  let finish!: (blob: Blob) => void
  const composite = new Promise<Blob>(resolve => { finish = resolve })
  const write = vi.fn(async (items: Item[]) => { await items[0].data['image/png'] })
  vi.stubGlobal('navigator', { clipboard: { write } })
  const controller = new AbortController()
  const pending = writeClipboardImage(() => composite, controller.signal)
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  finish(png())
  await rejected
})

it('handles permission denial before encoding finishes and explains it without claiming success', async () => {
  const denied = new DOMException('denied', 'NotAllowedError')
  vi.stubGlobal('navigator', { clipboard: { write: vi.fn().mockRejectedValue(denied) } })
  let fail!: (error: Error) => void
  const pendingImage = new Promise<Blob>((_resolve, reject) => { fail = reject })
  await expect(writeClipboardImage(() => pendingImage, new AbortController().signal)).rejects.toBe(denied)
  fail(new Error('worker aborted'))
  expect(clipboardErrorMessage(denied)).toContain('允许剪贴板访问')
})

it('releases a cancelled operation even if the native clipboard promise never settles', async () => {
  vi.stubGlobal('navigator', { clipboard: { write: () => new Promise<void>(() => {}) } })
  let finish!: (blob: Blob) => void
  const composite = new Promise<Blob>(resolve => { finish = resolve })
  const controller = new AbortController()
  const pending = writeClipboardImage(() => composite, controller.signal)
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  await rejected
  finish(png())
})

it('rejects a mislabeled GIF payload rather than putting GIF bytes under image/png', async () => {
  vi.stubGlobal('navigator', { clipboard: { write: async (items: Item[]) => { await items[0].data['image/png'] } } })
  await expect(writeClipboardImage(async () => new Blob(['GIF89a'], { type: 'image/gif' }), new AbortController().signal))
    .rejects.toThrow('格式错误')
})
