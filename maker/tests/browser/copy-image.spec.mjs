import { test, expect } from '@playwright/test'
import gifenc from 'gifenc'
import gifuct from 'gifuct-js'

const { GIFEncoder } = gifenc
const { parseGIF, decompressFrames } = gifuct

test.beforeEach(async ({ page }) => {
  page.copyErrors = []
  page.on('pageerror', error => page.copyErrors.push(error.message))
})
test.afterEach(async ({ page }) => { expect(page.copyErrors).toEqual([]) })

async function prepare(page, { mock = true, delay = 450, hold = false, gifSupport = null } = {}) {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
  await page.route('**/models/**', route => route.abort())
  await page.addInitScript(({ mock, delay, hold, gifSupport }) => {
    window.__copyCalls = 0
    window.__copyPayloads = 0
    window.__copyDenied = false
    window.__exportDelay = delay
    window.__terminatedExports = 0
    window.__unhandledRejections = []
    window.addEventListener('unhandledrejection', event => {
      window.__unhandledRejections.push(String(event.reason?.message ?? event.reason))
    })
    const NativeWorker = Worker
    // 测试专用 gate：hold 时导出 Worker 的 postMessage 停在页面内，编码任务
    // 无法在自动化取消前完成；释放时拒绝把数据投递给已 terminate 的 Worker。
    const gate = window.__exportGate = { hold, started: 0, posted: 0, attempted: 0, blocked: 0, waiting: [] }
    const nextTask = () => new Promise(resolve => setTimeout(resolve, 0))
    window.__exportGateSettled = Promise.resolve()
    window.__releaseExportGate = ({ keepHolding = false } = {}) => {
      gate.hold = keepHolding
      const summary = { attempted: 0, posted: 0, blocked: 0 }
      for (const worker of gate.waiting.splice(0)) {
        for (const call of worker.exportPending.splice(0)) {
          gate.attempted++; summary.attempted++
          if (worker.exportTerminated) { gate.blocked++; summary.blocked++; continue }
          gate.posted++; summary.posted++
          NativeWorker.prototype.postMessage.call(worker, call.data, ...call.args)
        }
      }
      // 页面内 settled Promise：放行后等两个任务轮转，观察是否留下延迟 rejection。
      window.__exportGateSettled = nextTask().then(nextTask)
        .then(() => ({ ...summary, unhandled: window.__unhandledRejections.slice() }))
      return summary
    }
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        this.exporting = String(args[0]).includes('gif-export.worker')
        this.exportPending = []
      }
      postMessage(data, ...args) {
        if (!this.exporting) return super.postMessage(data, ...args)
        gate.started++
        if (gate.hold) { this.exportPending.push({ data, args }); gate.waiting.push(this); return }
        this.delayed = setTimeout(() => { this.delayed = null; gate.posted++; super.postMessage(data, ...args) }, window.__exportDelay)
      }
      terminate() {
        clearTimeout(this.delayed)
        if (this.exporting) { this.exportTerminated = true; window.__terminatedExports++ }
        return super.terminate()
      }
    }
    if (gifSupport === false) {
      // 只压低原生 image/gif 的检测结果，ClipboardItem 仍使用浏览器真实实现。
      Object.defineProperty(ClipboardItem, 'supports', { configurable: true, value: mime => mime === 'image/png' })
    }
    if (mock) Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async items => {
        window.__copyCalls++
        window.__activeAtCopy = navigator.userActivation?.isActive
        if (window.__copyDenied) throw new DOMException('denied', 'NotAllowedError')
        window.__copiedTypes = [...items[0].types]
        const blob = await items[0].getType(items[0].types[0])
        window.__copied = blob
        window.__copyPayloads++
      },
    } })
  }, { mock, delay, hold, gifSupport })
  await page.goto('./')
}

async function upload(page, width = 480, height = 240, keepWechat = false) {
  const data = await page.evaluate(({ width, height }) => {
    const c = document.createElement('canvas'); c.width = width; c.height = height
    const x = c.getContext('2d'); x.fillStyle = '#e8352a'; x.fillRect(0, 0, width / 2, height)
    return c.toDataURL('image/png').split(',')[1]
  }, { width, height })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'copy.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeEnabled()
  if (!keepWechat) await page.getByRole('checkbox', { name: '适配微信表情' }).uncheck()
}

async function inspectCopy(page, native = false) {
  return page.evaluate(async native => {
    const blob = native ? await (await navigator.clipboard.read())[0].getType('image/png') : window.__copied
    const bitmap = await createImageBitmap(blob)
    try {
      const c = new OffscreenCanvas(bitmap.width, bitmap.height)
      const x = c.getContext('2d'); x.drawImage(bitmap, 0, 0)
      const first = [...x.getImageData(0, 0, 1, 1).data]
      const last = [...x.getImageData(bitmap.width - 1, 0, 1, 1).data]
      return { type: blob.type, width: bitmap.width, height: bitmap.height, first, last }
    } finally { bitmap.close() }
  }, native)
}

async function settleFeedback(page) {
  await page.locator('.export-overlay').evaluate(async node => {
    const motions = node.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity)
    await Promise.all(motions.map(animation => animation.finished.catch(() => {})))
  })
}

test('copy shows full-screen real progress, writes a transparent composite, and never downloads', async ({ page }, testInfo) => {
  await prepare(page, { delay: 1200 })
  await upload(page)
  let downloads = 0; page.on('download', () => downloads++)
  await page.getByRole('button', { name: '复制', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '正在复制图片' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('progressbar')).toBeVisible()
  const box = await page.locator('.export-overlay').boundingBox()
  expect(box).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
  expect(await page.locator('.maker-app').evaluate(node => node.inert)).toBe(true)
  await settleFeedback(page)
  await page.screenshot({ path: testInfo.outputPath('copy-progress.png') })
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  expect(await page.evaluate(() => window.__activeAtCopy)).toBe(true)
  const image = await inspectCopy(page)
  expect(image).toMatchObject({ type: 'image/png', width: 480, height: 240 })
  expect(image.first[3]).toBe(255); expect(image.last[3]).toBe(0)
  expect(downloads).toBe(0)
  await expect(page.locator('.export-check')).toBeVisible()
  await settleFeedback(page)
  await page.screenshot({ path: testInfo.outputPath('copy-success.png') })
  await page.getByRole('button', { name: '知道了' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.locator('.maker-app').evaluate(node => node.inert)).toBe(false)
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeFocused()
})

test('native copy restores original dimensions and includes added text', async ({ page }) => {
  await prepare(page)
  await upload(page, 2400, 1200)
  await page.getByRole('button', { name: '添加文字' }).click()
  await page.locator('.free-line input').first().fill('A')
  await page.locator('.free-line input').first().blur()
  await page.getByRole('checkbox', { name: '适配微信表情' }).uncheck()
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  expect(await inspectCopy(page)).toMatchObject({ width: 2400, height: 1200, type: 'image/png' })
  const bright = await page.evaluate(async () => {
    const b = await createImageBitmap(window.__copied)
    const c = new OffscreenCanvas(b.width, b.height); const x = c.getContext('2d'); x.drawImage(b, 0, 0); b.close()
    const d = x.getImageData(1000, 450, 400, 300).data
    let count = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 220 && d[i + 2] > 220 && d[i + 3] > 0) count++
    return count
  })
  expect(bright).toBeGreaterThan(20)
})

test('permission denial animates an error, stops the worker and allows retry', async ({ page }, testInfo) => {
  await prepare(page)
  await upload(page)
  await page.evaluate(() => { window.__copyDenied = true })
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '复制失败' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('允许剪贴板访问')
  await expect(page.locator('.export-dialog.is-error')).toBeVisible()
  await settleFeedback(page)
  await page.screenshot({ path: testInfo.outputPath('copy-error.png') })
  expect(await page.evaluate(() => window.__terminatedExports)).toBeGreaterThan(0)
  await page.getByRole('button', { name: '知道了' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.evaluate(() => { window.__copyDenied = false })
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
})

test('cancel prevents a late clipboard payload and download uses the same full-screen progress', async ({ page }) => {
  await prepare(page, { hold: true })
  await upload(page)
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('progressbar')).toBeVisible()
  // Worker 的 postMessage 被 gate 扣住：取消前不可能出现进度或完成结果。
  expect(await page.evaluate(() => ({ started: window.__exportGate.started, posted: window.__exportGate.posted })))
    .toEqual({ started: 1, posted: 0 })
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已取消', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.__copyPayloads)).toBe(0)
  // 取消后仍尝试释放旧 gate：不得投递给已 terminate 的 Worker，也不得留下 rejection。
  const late = await page.evaluate(async () => {
    window.__releaseExportGate({ keepHolding: true })
    return window.__exportGateSettled
  })
  expect(late).toEqual({ attempted: 1, posted: 0, blocked: 1, unhandled: [] })
  expect(await page.evaluate(() => window.__terminatedExports)).toBe(1)
  expect(await page.evaluate(() => window.__exportGate.posted)).toBe(0)
  expect(await page.evaluate(() => window.__copyPayloads)).toBe(0)
  await page.getByRole('button', { name: '知道了' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('checkbox', { name: '适配微信表情' }).check()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '正在生成下载图片' }).getByRole('progressbar')).toBeVisible()
  // 下载分支同样先挂起：全屏进度确认可见后再放行，慢机器上也不会提前收尾。
  expect(await page.evaluate(() => window.__exportGate.started)).toBe(2)
  const closed = await page.evaluate(async () => {
    window.__releaseExportGate()
    return window.__exportGateSettled
  })
  expect(closed).toEqual({ attempted: 1, posted: 1, blocked: 0, unhandled: [] })
  const download = await downloaded
  expect(download.suggestedFilename()).toBe('edited-copy.gif')
  await expect(page.getByRole('dialog', { name: '图片已下载' })).toBeVisible()
  expect(await page.evaluate(() => window.__terminatedExports)).toBe(2)
  expect(await page.evaluate(() => window.__copyPayloads)).toBe(0)
  expect(await page.evaluate(() => window.__unhandledRejections)).toEqual([])
})

test('an unavailable clipboard shows actionable failure without an automatic download', async ({ page }) => {
  await prepare(page)
  await upload(page)
  let downloads = 0; page.on('download', () => downloads++)
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined }) })
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '复制失败' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('不支持复制图片')
  expect(downloads).toBe(0)
})

test('copying a GIF uses the selected frame rather than the first frame', async ({ page }) => {
  await prepare(page)
  const gif = GIFEncoder()
  const width = 480, height = 240, palette = [[232, 53, 42], [20, 80, 230]]
  gif.writeFrame(new Uint8Array(width * height), width, height, { palette, delay: 100 })
  gif.writeFrame(new Uint8Array(width * height).fill(1), width, height, { palette, delay: 250 })
  gif.finish()
  await page.locator('input[type=file]').first().setInputFiles({ name: 'two.gif', mimeType: 'image/gif', buffer: Buffer.from(gif.bytes()) })
  const frame = page.getByRole('slider', { name: 'GIF 当前帧' })
  await expect(frame).toBeVisible()
  await frame.focus()
  await page.keyboard.press('End')
  await page.getByRole('checkbox', { name: '适配微信表情' }).uncheck()
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  const image = await inspectCopy(page)
  expect(image.first[2]).toBeGreaterThan(180)
  expect(image.first[0]).toBeLessThan(80)
})

test('a real browser clipboard contains the composited PNG after copying', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native permission grants are Chromium-specific; mocked lifecycle cases cover both engines.')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await prepare(page, { mock: false, delay: 0 })
  await upload(page)
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  expect(await inspectCopy(page, true)).toMatchObject({ type: 'image/png', width: 480, height: 240 })
})

function animatedGif() {
  const gif = GIFEncoder()
  const width = 480, height = 240, palette = [[232, 53, 42], [20, 80, 230]]
  gif.writeFrame(new Uint8Array(width * height), width, height, { palette, delay: 100 })
  gif.writeFrame(new Uint8Array(width * height).fill(1), width, height, { palette, delay: 250 })
  gif.finish()
  return Buffer.from(gif.bytes())
}

function decodeCopiedGif(bytes) {
  const data = Uint8Array.from(bytes)
  const parsed = parseGIF(data.buffer)
  const frames = decompressFrames(parsed, true)
  return { data, width: parsed.lsd.width, height: parsed.lsd.height, delays: frames.map(frame => frame.delay) }
}

async function uploadAnimatedGif(page) {
  await page.locator('input[type=file]').first().setInputFiles({ name: 'animated.gif', mimeType: 'image/gif', buffer: animatedGif() })
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: '适配微信表情' })).toBeChecked()
  // 定位到末帧，确认复制的是整段动画，而不是时间轴当前帧。
  await page.getByRole('slider', { name: 'GIF 当前帧' }).focus()
  await page.keyboard.press('End')
}

test('checked mode copies animated GIF as HTML rich text even when native image/gif support is false', async ({ page }) => {
  await prepare(page, { gifSupport: false })
  await uploadAnimatedGif(page)
  expect(await page.evaluate(() => ClipboardItem.supports('image/gif'))).toBe(false)
  let downloads = 0; page.on('download', () => downloads++)
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  const copied = await page.evaluate(async () => {
    const html = await window.__copied.text()
    const match = /data:image\/gif;base64,([A-Za-z0-9+/=]+)/.exec(html)
    return { type: window.__copied.type, types: window.__copiedTypes, htmlLength: html.length,
      bytes: match ? [...Uint8Array.from(atob(match[1]), character => character.charCodeAt(0))] : [] }
  })
  expect(copied.type).toBe('text/html')
  expect(copied.types).toEqual(['text/html'])
  expect(copied.bytes.length).toBeGreaterThan(0)
  const gif = decodeCopiedGif(copied.bytes)
  expect(Buffer.from(gif.data.subarray(0, 6)).toString('ascii')).toBe('GIF89a')
  expect([gif.width, gif.height]).toEqual([240, 120])
  expect(gif.delays).toEqual([100, 250])
  // 上限检查针对内嵌 GIF 字节，而不是 base64 之后的 HTML 体积。
  expect(gif.data.length).toBeLessThan(500_000)
  expect(copied.htmlLength).toBeGreaterThan(gif.data.length)
  expect(await page.evaluate(() => ({ calls: window.__copyCalls, payloads: window.__copyPayloads, workers: window.__exportGate.started })))
    .toEqual({ calls: 1, payloads: 1, workers: 1 })
  expect(downloads).toBe(0)
})

test('a real browser clipboard reads back the copied GIF as HTML with animation', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native permission grants are Chromium-specific; mocked cases cover both engines.')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await prepare(page, { mock: false, delay: 0 })
  await uploadAnimatedGif(page)
  await page.getByRole('button', { name: '复制', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '已复制到剪贴板' })).toBeVisible()
  const copied = await page.evaluate(async () => {
    const items = await navigator.clipboard.read()
    const item = items.find(entry => entry.types.includes('text/html'))
    if (!item) return { types: items.map(entry => entry.types), htmlLength: 0, bytes: [] }
    const html = await (await item.getType('text/html')).text()
    const match = /data:image\/gif;base64,([A-Za-z0-9+/=]+)/.exec(html)
    return { types: item.types, htmlLength: html.length,
      bytes: match ? [...Uint8Array.from(atob(match[1]), character => character.charCodeAt(0))] : [] }
  })
  expect(copied.types).toContain('text/html')
  const gif = decodeCopiedGif(copied.bytes)
  expect([gif.width, gif.height]).toEqual([240, 120])
  expect(gif.delays).toEqual([100, 250])
  expect(gif.data.length).toBeLessThan(500_000)
  expect(copied.htmlLength).toBeGreaterThan(gif.data.length)
})
