import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clipboardErrorMessage, writeClipboardImage } from '../src/lib/clipboard-write'

class Item {
  constructor(public data: Record<string, Promise<Blob>>) {}
}
const png = () => new Blob(['png'], { type: 'image/png' })
// 含 0x00 / 0x80 / 0xFF 等非 ASCII 字节，用来确认 base64 往返不改动 GIF 原始字节。
const gifBytes = () => new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x80, 0xff, 0xfe, 0xc3, 0x28, 0x3b])
const gif = () => new Blob([gifBytes()], { type: 'image/gif' })

function decodeHtmlGif(html: string): Uint8Array {
  const match = /^<img src="data:image\/gif;base64,([A-Za-z0-9+/=]+)">$/.exec(html)
  expect(match).not.toBeNull()
  return Uint8Array.from(atob(match![1]), character => character.charCodeAt(0))
}

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

it('starts a text/html GIF write while the GIF encoding is still pending', async () => {
  let finish!: (blob: Blob) => void
  const encoding = new Promise<Blob>(resolve => { finish = resolve })
  const items: Item[] = []
  const write = vi.fn(async (received: Item[]) => {
    items.push(received[0])
    await received[0].data['text/html']
  })
  vi.stubGlobal('navigator', { clipboard: { write } })
  const pending = writeClipboardImage(() => encoding, new AbortController().signal, 'image/gif')
  expect(write).toHaveBeenCalledOnce()
  expect(items[0]).toBeInstanceOf(Item)
  expect(Object.keys(items[0].data)).toEqual(['text/html'])
  finish(gif())
  await pending
  const html = await items[0].data['text/html']
  expect(html.type).toBe('text/html')
  expect(decodeHtmlGif(await html.text())).toEqual(gifBytes())
})

it('writes GIF rich text when native image/gif support is false or the capability API is absent', async () => {
  const capabilities: Array<[string, typeof Item]> = [
    ['false', class extends Item { static supports(mime: string) { return mime === 'image/png' } }],
    ['absent', class extends Item {}],
  ]
  for (const [name, ClipboardItemStub] of capabilities) {
    vi.stubGlobal('ClipboardItem', ClipboardItemStub)
    const write = vi.fn(async (items: Item[]) => {
      const blob = await items[0].data['text/html']
      expect(blob.type, name).toBe('text/html')
    })
    vi.stubGlobal('navigator', { clipboard: { write } })
    await writeClipboardImage(async () => gif(), new AbortController().signal, 'image/gif')
    expect(write, name).toHaveBeenCalledOnce()
  }
})

it('keeps every original GIF byte through the base64 HTML payload', async () => {
  const bytes = new Uint8Array(200_000)
  for (let index = 0; index < bytes.length; index++) bytes[index] = index % 256
  const write = vi.fn(async (items: Item[]) => { await items[0].data['text/html'] })
  vi.stubGlobal('navigator', { clipboard: { write } })
  await writeClipboardImage(async () => new Blob([bytes], { type: 'image/gif' }), new AbortController().signal, 'image/gif')
  const html = await write.mock.calls[0][0][0].data['text/html']
  expect(decodeHtmlGif(await html.text())).toEqual(bytes)
})

it('rejects a PNG produced for a requested GIF instead of writing it as HTML', async () => {
  const write = vi.fn(async (items: Item[]) => { await items[0].data['text/html'] })
  vi.stubGlobal('navigator', { clipboard: { write } })
  await expect(writeClipboardImage(async () => png(), new AbortController().signal, 'image/gif'))
    .rejects.toThrow('格式错误')
})

it('denies a late HTML payload when cancelled during GIF bytes-to-HTML conversion', async () => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const source = gif()
  const arrayBuffer = source.arrayBuffer.bind(source)
  const reading = vi.fn(async () => { await gate; return arrayBuffer() })
  Object.defineProperty(source, 'arrayBuffer', { value: reading })
  const deliveries: Blob[] = []
  let payloadError: unknown
  vi.stubGlobal('navigator', { clipboard: { write: async (items: Item[]) => {
    try { deliveries.push(await items[0].data['text/html']) } catch (error) { payloadError = error; throw error }
  } } })
  const controller = new AbortController()
  const pending = writeClipboardImage(async () => source, controller.signal, 'image/gif')
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  await vi.waitFor(() => expect(reading).toHaveBeenCalledOnce())
  controller.abort()
  release()
  await rejected
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(payloadError).toMatchObject({ name: 'AbortError' })
  expect(deliveries).toEqual([])
})

it('reports a conversion failure instead of writing an empty or partial HTML payload', async () => {
  const source = gif()
  Object.defineProperty(source, 'arrayBuffer', { value: async () => { throw new Error('read failed') } })
  const write = vi.fn(async (items: Item[]) => { await items[0].data['text/html'] })
  vi.stubGlobal('navigator', { clipboard: { write } })
  await expect(writeClipboardImage(async () => source, new AbortController().signal, 'image/gif'))
    .rejects.toThrow('read failed')
})

it('does not leak an unhandled rejection when GIF permission is denied before encoding ends', async () => {
  const denied = new DOMException('denied', 'NotAllowedError')
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    vi.stubGlobal('navigator', { clipboard: { write: vi.fn().mockRejectedValue(denied) } })
    let finish!: (blob: Blob) => void
    const encoding = new Promise<Blob>(resolve => { finish = resolve })
    await expect(writeClipboardImage(() => encoding, new AbortController().signal, 'image/gif')).rejects.toBe(denied)
    finish(gif())
    await new Promise(resolve => setTimeout(resolve, 0))
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
  expect(unhandled).toEqual([])
})

it('releases a cancelled GIF copy even if the native clipboard promise never settles', async () => {
  vi.stubGlobal('navigator', { clipboard: { write: () => new Promise<void>(() => {}) } })
  let finish!: (blob: Blob) => void
  const encoding = new Promise<Blob>(resolve => { finish = resolve })
  const controller = new AbortController()
  const pending = writeClipboardImage(() => encoding, controller.signal, 'image/gif')
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  controller.abort()
  await rejected
  finish(gif())
})
