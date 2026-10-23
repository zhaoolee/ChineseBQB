import { readFileSync } from 'node:fs'
import gifenc from 'gifenc'
import { test, expect } from '@playwright/test'

const { GIFEncoder, quantize, applyPalette } = gifenc
const SIZE = 240
// Fixture frame count is authoritative when the local GIF (and its count) is supplied.
const FRAME_COUNT = Number(process.env.OCR_GIF_FRAMES || 8)
// Strongly different corner colours *and* block sizes keep every encoded frame a real
// pixel change even after per-frame GIF palette quantisation.
const CORNERS = [
  [214, 32, 28], [240, 150, 20], [246, 214, 26], [36, 170, 74],
  [20, 150, 214], [40, 70, 180], [128, 54, 168], [32, 32, 32],
]

async function picture(page, text) {
  const url = await page.evaluate(({ size, text }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#111'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(text, size / 2, 140)
    return canvas.toDataURL('image/png')
  }, { size: SIZE, text })
  return Buffer.from(url.split(',')[1], 'base64')
}

/** Take one canvas RGBA from the page so the GIF subtitles use exactly the same pixels. */
async function canvasPixels(page) {
  const base64 = await page.evaluate(({ size, text }) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#ddd'; ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#111'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(text, size / 2, 140)
    const data = ctx.getImageData(0, 0, size, size).data
    let binary = ''
    for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000))
    return btoa(binary)
  }, { size: SIZE, text: 'HELLO' })
  const pixels = Buffer.from(base64, 'base64')
  if (pixels.length !== SIZE * SIZE * 4) throw new Error(`unexpected canvas bytes: ${pixels.length}`)
  return pixels
}

function synthesizeGif(base, frameCount = FRAME_COUNT) {
  const encoder = GIFEncoder()
  for (let frame = 0; frame < frameCount; frame += 1) {
    const rgba = new Uint8ClampedArray(base)
    const color = CORNERS[frame % CORNERS.length]
    const block = 12 + (frame % 3) * 4
    const x = frame % 2 ? SIZE - block - 4 : 4
    const y = frame % 4 < 2 ? 4 : SIZE - block - 4
    for (let row = 0; row < block; row += 1) {
      for (let column = 0; column < block; column += 1) {
        const offset = ((y + row) * SIZE + x + column) * 4
        rgba[offset] = color[0]; rgba[offset + 1] = color[1]; rgba[offset + 2] = color[2]
      }
    }
    const palette = quantize(rgba, 256, { format: 'rgb565' })
    encoder.writeFrame(applyPalette(rgba, palette, 'rgb565'), SIZE, SIZE, { palette, delay: 100 })
  }
  encoder.finish()
  return Buffer.from(encoder.bytes())
}

async function upload(page, name, mimeType, buffer) {
  await page.locator('input[type=file]').first().setInputFiles({ name, mimeType, buffer })
}

async function cells(page) {
  return page.locator('.block-list .bang-cell').evaluateAll(inputs => inputs.map(input => input.value).join(''))
}

async function recognized(page, text) {
  await expect.poll(() => cells(page)).toContain(text)
  await expect(page.locator('.ocr-retry')).toHaveCount(0)
}

/** Record the subtitle progress bar through every React commit; a 100ms poll can miss the
 * final completed=total render that is immediately followed by the ready state. */
async function watchSubtitleProgress(page) {
  await page.evaluate(() => {
    const log = window.__subtitleWatch = { values: [], max: 0, error: false, seen: false }
    const read = () => {
      const track = document.querySelector('.subtitle-progress-track')
      if (track) {
        log.seen = true
        const now = Number(track.getAttribute('aria-valuenow') ?? 0)
        if (log.values.at(-1) !== now) log.values.push(now)
        log.max = Math.max(log.max, now)
      }
      if (document.querySelector('.subtitle-error')) log.error = true
    }
    log.observer = new MutationObserver(read)
    log.observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true })
    read()
  })
}

async function subtitleProgress(page) {
  return page.evaluate(() => {
    const log = window.__subtitleWatch
    log?.observer?.disconnect()
    return { values: log.values, max: log.max, error: log.error, seen: log.seen }
  })
}

async function workerAudit(page) {
  return page.evaluate(() => window.__ocrWorkerAudit)
}

test.beforeEach(async ({ page }) => {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
})

test('real model survives repeated reloads and scans every changed GIF frame on one reused worker', async ({ page }) => {
  test.setTimeout(180_000)
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  // Audit only OCR workers: lifecycle, recognize requests, successful replies and errors.
  // Deliberately never retains blobs, prompts, or recognized text.
  await page.addInitScript(() => {
    const audit = window.__ocrWorkerAudit = { workers: 0, recognize: 0, ok: 0, errors: 0, lastError: '' }
    const NativeWorker = Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        this.__isOcrWorker = String(args[0]).includes('ocr.worker-')
        if (!this.__isOcrWorker) return
        audit.workers += 1
        this.addEventListener('message', (event) => {
          const data = event.data
          if (data && data.ok === true) audit.ok += 1
          else if (data && data.error) { audit.errors += 1; audit.lastError = String(data.error.name || 'Error') }
        })
        this.addEventListener('error', (event) => { audit.errors += 1; audit.lastError = event.message })
      }
      postMessage(data, ...rest) {
        if (this.__isOcrWorker && data && data.kind === 'recognize') audit.recognize += 1
        return super.postMessage(data, ...rest)
      }
    }
  })

  await page.goto('./')
  const still = await picture(page, 'HELLO')
  for (let round = 1; round <= 5; round += 1) {
    await page.reload()
    await upload(page, 'hello.png', 'image/png', still)
    await recognized(page, 'HELLO')
    const cold = await workerAudit(page)
    expect(cold.errors).toBe(0)
    expect(cold.workers).toBe(1)
    expect(cold.recognize).toBe(1)
    expect(cold.ok).toBe(1)
  }

  // The fifth reload is still the current document, so the GIF and the trailing small
  // image must share its single OCR worker.
  const gif = process.env.OCR_GIF_FIXTURE
    ? readFileSync(process.env.OCR_GIF_FIXTURE)
    : synthesizeGif(await canvasPixels(page))
  await watchSubtitleProgress(page)
  await upload(page, 'subtitles.gif', 'image/gif', gif)

  await expect.poll(() => page.evaluate(() => window.__subtitleWatch.seen)).toBe(true)
  await expect(page.locator('.timeline-scrubber')).toHaveAttribute('max', String(FRAME_COUNT - 1))
  await expect(page.locator('.subtitle-progress')).toHaveCount(0)
  await expect(page.locator('.subtitle-error')).toHaveCount(0)
  const expectedCaption = process.env.OCR_GIF_FIXTURE ? process.env.OCR_GIF_TEXT : 'HELLO'
  if (expectedCaption) {
    await expect.poll(async () => page.locator('.subtitle-text')
      .evaluateAll(nodes => nodes.map(node => String(node.value).toUpperCase()).join(' ')))
      .toContain(expectedCaption.toUpperCase())
  }

  const scan = await subtitleProgress(page)
  expect(scan.seen).toBe(true)
  expect(scan.max).toBe(FRAME_COUNT)
  expect(scan.error).toBe(false)

  const gifAudit = await workerAudit(page)
  expect(gifAudit.workers).toBe(1)
  expect(gifAudit.errors).toBe(0)
  // One recognize for the fifth-round still image, then one per changed decoded frame.
  expect(gifAudit.recognize - 1).toBeGreaterThanOrEqual(FRAME_COUNT)
  expect(gifAudit.ok - 1).toBeGreaterThanOrEqual(FRAME_COUNT)

  await upload(page, 'hello.png', 'image/png', still)
  await recognized(page, 'HELLO')

  const finalAudit = await workerAudit(page)
  expect(finalAudit.workers).toBe(1)
  expect(finalAudit.errors).toBe(0)
  expect(finalAudit.recognize - 2).toBeGreaterThanOrEqual(FRAME_COUNT)
  expect(finalAudit.ok - 2).toBeGreaterThanOrEqual(FRAME_COUNT)
  expect(pageErrors).toEqual([])
})

// Inject visibility lifecycle signals only: the real GIF decoder, OCR model and
// worker remain untouched. This desktop regression is not iPhone validation.
test('real GIF OCR pauses engine allocation while hidden and resumes across two visibility cycles', async ({ page }) => {
  await page.addInitScript(() => {
    const audit = window.__visibilityAudit = {workers:0, terminated:0, recognize:0, ok:0, errors:0, pauseNext:false, hidden:false}
    Object.defineProperty(document, 'visibilityState', {configurable:true, get:() => audit.hidden ? 'hidden' : 'visible'})
    const NativeWorker = Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        this.__ocr = String(args[0]).includes('ocr.worker-')
        if (!this.__ocr) return
        audit.workers += 1
        this.addEventListener('message', ({data}) => {
          if (data?.ok === true) {
            audit.ok += 1
            if (audit.pauseNext) {
              audit.pauseNext = false
              audit.hidden = true
              document.dispatchEvent(new Event('visibilitychange'))
            }
          } else if (data?.error) audit.errors += 1
        })
        this.addEventListener('error', () => { audit.errors += 1 })
      }
      postMessage(data, ...rest) {
        if (this.__ocr && data?.kind === 'recognize') audit.recognize += 1
        return super.postMessage(data, ...rest)
      }
      terminate() {
        if (this.__ocr) audit.terminated += 1
        return super.terminate()
      }
    }
  })
  await page.goto('./')
  // Always use the small synthetic fixture for these controlled lifecycle cycles.
  const frameCount = 8
  const gif = synthesizeGif(await canvasPixels(page), frameCount)
  for (let cycle = 1; cycle <= 2; cycle += 1) {
    await watchSubtitleProgress(page)
    await page.evaluate(() => { window.__visibilityAudit.pauseNext = true })
    await upload(page, `visibility-${cycle}.gif`, 'image/gif', gif)
    await expect.poll(() => page.evaluate(() => window.__visibilityAudit.hidden)).toBe(true)
    await expect.poll(() => page.evaluate(() => window.__visibilityAudit.terminated)).toBe(cycle)
    const paused = await page.evaluate(() => ({...window.__visibilityAudit}))
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => ({...window.__visibilityAudit}))).toEqual(paused)
    expect(paused.workers).toBe(cycle)
    expect(paused.errors).toBe(0)
    await page.evaluate(() => {
      window.__visibilityAudit.hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('.subtitle-progress')).toHaveCount(0)
    await expect(page.locator('.subtitle-error')).toHaveCount(0)
    expect((await subtitleProgress(page)).max).toBe(frameCount)
    const resumed = await page.evaluate(() => ({...window.__visibilityAudit}))
    expect(resumed.workers).toBe(cycle + 1)
    expect(resumed.recognize).toBe(cycle * frameCount)
    expect(resumed.ok).toBe(cycle * frameCount)
    expect(resumed.errors).toBe(0)
  }
})
