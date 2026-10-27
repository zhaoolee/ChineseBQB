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

it('rejects unsupported GIF before encoding or touching the clipboard', async () => {
  class PngOnlyItem extends Item { static supports(mime: string) { return mime === 'image/png' } }
  vi.stubGlobal('ClipboardItem', PngOnlyItem)
  const write = vi.fn()
  const render = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { write } })
  await expect(writeClipboardImage(render, new AbortController().signal, 'image/gif')).rejects.toThrow('不支持复制 GIF')
  expect(render).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
})

it('does not guess GIF support when the capability API is absent', async () => {
  const write = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { write } })
  const render = vi.fn()
  await expect(writeClipboardImage(render, new AbortController().signal, 'image/gif')).rejects.toThrow('不支持复制 GIF')
  expect(render).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
})

it('writes genuine GIF bytes under image/gif when native GIF is supported', async () => {
  class GifItem extends Item { static supports() { return true } }
  vi.stubGlobal('ClipboardItem', GifItem)
  const gif = new Blob(['GIF89a'], { type: 'image/gif' })
  const write = vi.fn(async (items: Item[]) => {
    expect(Object.keys(items[0].data)).toEqual(['image/gif'])
    expect(await items[0].data['image/gif']).toBe(gif)
  })
  vi.stubGlobal('navigator', { clipboard: { write } })
  await writeClipboardImage(async () => gif, new AbortController().signal, 'image/gif')
  expect(write).toHaveBeenCalledOnce()
})

it('never substitutes PNG for a requested GIF even on a GIF-capable browser', async () => {
  class GifItem extends Item { static supports() { return true } }
  vi.stubGlobal('ClipboardItem', GifItem)
  vi.stubGlobal('navigator', { clipboard: { write: async (items: Item[]) => { await items[0].data['image/gif'] } } })
  await expect(writeClipboardImage(async () => png(), new AbortController().signal, 'image/gif')).rejects.toThrow('格式错误')
})
