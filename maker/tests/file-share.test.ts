import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  fileShareSupport,
  isShareCancellation,
  shareErrorMessage,
  shareFile,
  shareFileFromBlob,
} from '../src/lib/file-share'

const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x80, 0xff, 0xfe, 0xc3, 0x28, 0x3b])

function stubNavigator(value: Record<string, unknown>) {
  vi.stubGlobal('navigator', value)
}

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
})

afterEach(() => vi.unstubAllGlobals())

it('disables file sharing outside a secure context even when the API exists', () => {
  const share = vi.fn()
  const canShare = vi.fn(() => true)
  vi.stubGlobal('isSecureContext', false)
  stubNavigator({ share, canShare })
  const file = new File([gifBytes], 'edited.gif', { type: 'image/gif' })
  const support = fileShareSupport(file)
  expect(support).toMatchObject({ ok: false, reason: 'insecure' })
  expect(support.ok ? '' : support.message).toContain('HTTPS')
  expect(share).not.toHaveBeenCalled()
  expect(canShare).not.toHaveBeenCalled()
})

it('requires both navigator.share and navigator.canShare for file sharing', () => {
  const file = new File([gifBytes], 'edited.gif', { type: 'image/gif' })
  for (const navigatorValue of [{ share: vi.fn() }, { canShare: vi.fn(() => true) }]) {
    stubNavigator(navigatorValue)
    expect(fileShareSupport(file)).toMatchObject({ ok: false, reason: 'unsupported' })
  }
})

it('checks capability for this file and treats false or a throwing probe as unavailable', () => {
  const file = new File([gifBytes], 'edited.gif', { type: 'image/gif' })
  const canShare = vi.fn(() => false)
  stubNavigator({ share: vi.fn(), canShare })
  expect(fileShareSupport(file)).toMatchObject({ ok: false, reason: 'file' })
  expect(canShare).toHaveBeenCalledWith({ files: [file] })

  canShare.mockImplementation(() => { throw new Error('probe failed') })
  expect(() => fileShareSupport(file)).not.toThrow()
  expect(fileShareSupport(file)).toMatchObject({ ok: false, reason: 'file' })
})

it('wraps the ready Blob as a File with the edited name, MIME and exact bytes', async () => {
  const gif = new Blob([gifBytes], { type: 'image/gif' })
  const file = shareFileFromBlob(gif, 'animated.gif')
  expect(file.type).toBe('image/gif')
  expect(file.name).toBe('edited-animated.gif')
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(gifBytes)

  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
  expect(shareFileFromBlob(png, 'copy.png')).toMatchObject({ name: 'edited-copy.png', type: 'image/png' })
})

it('calls navigator.share immediately with files only and the already cached File', async () => {
  let finish!: () => void
  const pending = new Promise<void>(resolve => { finish = resolve })
  const share = vi.fn((_data: ShareData) => pending)
  stubNavigator({ share, canShare: vi.fn(() => true) })
  const file = new File([gifBytes], 'edited.gif', { type: 'image/gif' })
  expect(fileShareSupport(file)).toEqual({ ok: true })
  const task = shareFile(file)
  expect(share).toHaveBeenCalledOnce()
  expect(share).toHaveBeenCalledWith({ files: [file] })
  expect(Object.keys(share.mock.calls[0][0])).toEqual(['files'])
  finish()
  await task
})

it('maps AbortError to user cancellation and other failures to actionable errors', () => {
  const abort = new DOMException('cancelled', 'AbortError')
  const denied = new DOMException('denied', 'NotAllowedError')
  const data = new DOMException('bad file', 'DataError')
  expect(isShareCancellation(abort)).toBe(true)
  expect(shareErrorMessage(abort)).toContain('已取消系统分享')
  expect(isShareCancellation(denied)).toBe(false)
  expect(shareErrorMessage(denied)).toContain('未允许系统分享')
  expect(shareErrorMessage(data)).toContain('无法处理')
  expect(shareErrorMessage(new Error('boom'))).toContain('请重试')
})
