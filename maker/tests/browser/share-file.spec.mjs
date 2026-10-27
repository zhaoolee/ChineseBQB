import { test, expect } from '@playwright/test'
import gifenc from 'gifenc'
import gifuct from 'gifuct-js'

const { GIFEncoder } = gifenc
const { parseGIF, decompressFrames } = gifuct

test.beforeEach(async ({ page }) => {
  page.shareErrors = []
  page.on('pageerror', error => page.shareErrors.push(error.message))
})
test.afterEach(async ({ page }) => { expect(page.shareErrors).toEqual([]) })

async function prepare(page, { canShare = true } = {}) {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
  await page.route('**/models/**', route => route.abort())
  await page.addInitScript(({ canShare }) => {
    window.__copyCalls = 0
    window.__copyPayloads = 0
    window.__copied = null
    window.__copiedTypes = []
    window.__exportStarts = 0
    window.__share = {
      calls: [], file: null, mode: 'success', queue: [], settle: null,
      canShare, canShareCalls: 0, canShareThrows: false,
    }
    const NativeWorker = Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        this.exporting = String(args[0]).includes('gif-export.worker')
      }
      postMessage(data, ...args) {
        if (this.exporting) window.__exportStarts++
        return super.postMessage(data, ...args)
      }
    }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async items => {
        window.__copyCalls++
        window.__copiedTypes = [...items[0].types]
        window.__copied = await items[0].getType(items[0].types[0])
        window.__copyPayloads++
      },
    } })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => {
      window.__share.canShareCalls++
      if (window.__share.canShareThrows) throw new Error('canShare probe failed')
      return window.__share.canShare && data?.files?.length === 1
    } })
    Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
      const file = data.files?.[0] ?? null
      const mode = window.__share.queue.length ? window.__share.queue.shift() : window.__share.mode
      window.__share.calls.push({
        keys: Object.keys(data), fileCount: data.files?.length ?? 0,
        name: file?.name, type: file?.type, size: file?.size,
        active: navigator.userActivation?.isActive ?? false, mode,
      })
      window.__share.file = file
      if (mode === 'success') return Promise.resolve()
      if (mode === 'cancel') return Promise.reject(new DOMException('cancelled', 'AbortError'))
      if (mode === 'error') return Promise.reject(new DOMException('denied', 'NotAllowedError'))
      return new Promise((resolve, reject) => { window.__share.settle = { resolve, reject } })
    } })
  }, { canShare })
  await page.goto('./')
}

async function upload(page, { name = 'copy.png', width = 480, height = 240 } = {}) {
  const data = await page.evaluate(({ width, height }) => {
    const c = document.createElement('canvas'); c.width = width; c.height = height
    const x = c.getContext('2d'); x.fillStyle = '#e8352a'; x.fillRect(0, 0, width / 2, height)
    return c.toDataURL('image/png').split(',')[1]
  }, { width, height })
  await page.locator('input[type=file]').first().setInputFiles({
    name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64'),
  })
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeEnabled()
}

function animatedGif() {
  const gif = GIFEncoder()
  const width = 480, height = 240, palette = [[232, 53, 42], [20, 80, 230]]
  gif.writeFrame(new Uint8Array(width * height), width, height, { palette, delay: 100 })
  gif.writeFrame(new Uint8Array(width * height).fill(1), width, height, { palette, delay: 250 })
  gif.finish()
  return Buffer.from(gif.bytes())
}

async function uploadAnimatedGif(page) {
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'animated.gif', mimeType: 'image/gif', buffer: animatedGif(),
  })
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: '适配微信表情' })).toBeChecked()
}

function decodeGif(bytes) {
  const data = Uint8Array.from(bytes)
  const parsed = parseGIF(data.buffer)
  const frames = decompressFrames(parsed, true)
  return { data, width: parsed.lsd.width, height: parsed.lsd.height, delays: frames.map(frame => frame.delay) }
}

async function copyAndWait(page) {
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
}

test('GIF copy shares the exact ready File, keeps the success modal open and cycles both actions', async ({ page }, testInfo) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  let downloads = 0; page.on('download', () => downloads++)
  await copyAndWait(page)
  expect(await page.evaluate(() => ({ starts: window.__exportStarts, calls: window.__copyCalls })))
    .toEqual({ starts: 1, calls: 1 })
  await page.locator('.export-overlay').evaluate(async node => {
    await Promise.all(node.getAnimations({ subtree: true })
      .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})))
  })
  await page.screenshot({ path: testInfo.outputPath('share-ready.png') })

  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toBeVisible()
  const shared = await page.evaluate(async () => {
    const file = window.__share.file
    const html = await window.__copied.text()
    const match = /data:image\/gif;base64,([A-Za-z0-9+/=]+)/.exec(html)
    return {
      name: file.name, type: file.type, size: file.size,
      bytes: [...new Uint8Array(await file.arrayBuffer())],
      htmlBytes: match ? [...Uint8Array.from(atob(match[1]), character => character.charCodeAt(0))] : [],
    }
  })
  const call = await page.evaluate(() => window.__share.calls[0])
  expect(call).toMatchObject({
    keys: ['files'], fileCount: 1, name: 'edited-animated.gif', type: 'image/gif', active: true,
  })
  expect(shared).toMatchObject({ name: 'edited-animated.gif', type: 'image/gif' })
  expect(shared.size).toBe(shared.bytes.length)
  expect(shared.bytes).toEqual(shared.htmlBytes)
  const gif = decodeGif(shared.bytes)
  expect([gif.width, gif.height]).toEqual([240, 120])
  expect(gif.delays).toEqual([100, 250])
  expect(await page.evaluate(() => ({ starts: window.__exportStarts, calls: window.__copyCalls, shares: window.__share.calls.length })))
    .toEqual({ starts: 1, calls: 1, shares: 1 })
  expect(downloads).toBe(0)

  await page.waitForTimeout(2600)
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()

  await page.locator('.export-dialog').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '分享', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '知道了', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '分享', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: '知道了', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('pending native share blocks duplicate share and close, Escape, then allows retry', async ({ page }) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  await copyAndWait(page)
  await page.evaluate(() => { window.__share.mode = 'hold' })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  const pendingShare = page.getByRole('button', { name: '分享中…' })
  const close = page.getByRole('button', { name: '知道了', exact: true })
  await expect(pendingShare).toBeDisabled()
  await expect(close).toBeDisabled()
  await expect(page.getByText('正在等待系统分享，请选择目标应用。')).toBeVisible()
  await page.evaluate(() => document.querySelector('.export-dialog-share').dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect(await page.evaluate(() => window.__share.calls.length)).toBe(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()

  await page.evaluate(() => window.__share.settle.resolve())
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toBeVisible()
  await expect(page.getByRole('button', { name: '分享', exact: true })).toBeEnabled()
  await expect(close).toBeEnabled()
  await page.evaluate(() => { window.__share.mode = 'success' })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__share.calls.length)).toBe(2)
  await close.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('cancelling the native share keeps the copy result and retry succeeds', async ({ page }) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  await copyAndWait(page)
  await page.evaluate(() => { window.__share.queue = ['cancel', 'success'] })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByText('已取消系统分享，可以再次点「分享」重试。')).toBeVisible()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  await expect(page.getByRole('button', { name: '分享', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toBeVisible()
  expect(await page.evaluate(() => window.__share.calls.map(call => call.mode))).toEqual(['cancel', 'success'])
})

test('permission failure shows an actionable share error and retry works', async ({ page }) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  await copyAndWait(page)
  await page.evaluate(() => { window.__share.mode = 'error' })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('未允许系统分享')
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  await page.evaluate(() => { window.__share.mode = 'success' })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toBeVisible()
  expect(await page.evaluate(() => window.__share.calls.length)).toBe(2)
})

test('unsupported file sharing disables Share with download guidance and never calls share', async ({ page }) => {
  await prepare(page, { canShare: false })
  await uploadAnimatedGif(page)
  let downloads = 0; page.on('download', () => downloads++)
  await copyAndWait(page)
  await expect(page.getByRole('button', { name: '分享', exact: true })).toBeDisabled()
  await expect(page.getByText('当前浏览器无法分享这个图片文件，请下载图片后发送。')).toBeVisible()
  expect(await page.evaluate(() => window.__share.calls.length)).toBe(0)
  expect(downloads).toBe(0)
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('a late share result after source replacement cannot revive the old modal', async ({ page }) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  await copyAndWait(page)
  await page.evaluate(() => { window.__share.mode = 'hold' })
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByRole('button', { name: '分享中…' })).toBeDisabled()
  await upload(page, { name: 'replacement.png' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.evaluate(() => window.__share.settle.resolve())
  await page.waitForTimeout(250)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toHaveCount(0)
})

test('unchecked GIF copy shares the exact PNG of the current frame', async ({ page }) => {
  await prepare(page)
  await uploadAnimatedGif(page)
  await page.getByRole('checkbox', { name: '适配微信表情' }).uncheck()
  await page.getByRole('slider', { name: 'GIF 当前帧' }).focus()
  await page.keyboard.press('End')
  await copyAndWait(page)
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.getByText('已交给系统分享；请在目标应用里完成发送。')).toBeVisible()
  const shared = await page.evaluate(async () => {
    const file = window.__share.file
    const copied = new Uint8Array(await window.__copied.arrayBuffer())
    const bytes = new Uint8Array(await file.arrayBuffer())
    const bitmap = await createImageBitmap(file)
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0)
      const pixel = [...context.getImageData(0, 0, 1, 1).data]
      return {
        name: file.name, type: file.type, width: bitmap.width, height: bitmap.height, pixel,
        sameBytes: bytes.length === copied.length && bytes.every((value, index) => value === copied[index]),
      }
    } finally { bitmap.close() }
  })
  expect(shared).toMatchObject({
    name: 'edited-animated.png', type: 'image/png', width: 480, height: 240, sameBytes: true,
  })
  expect(shared.pixel[2]).toBeGreaterThan(180)
  expect(shared.pixel[0]).toBeLessThan(80)
})
