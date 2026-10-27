import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

// Public gallery image reported at maker/?src=media/f9a7acf793dfcbc9de43cbab099b320c4d6cac71900cf482a601552147215114.jpg.
// Upscaling this 193×181 JPEG to 480px made the real model skip 老 and 行.
const fixture = fileURLToPath(new URL('../fixtures/ocr-low-resolution-caption.jpg', import.meta.url))
const caption = '你他妈老实点行不'

test('recognizes every character in a low resolution edge caption, including on repeat', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.__captionOcrRuns = 0
    const NativeWorker = Worker
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args)
        if (String(args[0]).includes('ocr.worker-')) {
          this.addEventListener('message', event => { if (event.data.ok) window.__captionOcrRuns++ })
        }
      }
    }
  })
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
  await page.goto('./')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  const cells = page.locator('.block-list .bang-cell')
  await expect.poll(() => cells.evaluateAll(inputs => inputs.map(input => input.value).join(''))).toBe(caption)
  await expect(cells).toHaveCount(8)
  await expect(page.locator('.ocr-retry')).toHaveCount(0)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '还原原图', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__captionOcrRuns)).toBe(2)
  await expect.poll(() => cells.evaluateAll(inputs => inputs.map(input => input.value).join(''))).toBe(caption)
  await expect(page.locator('.ocr-retry')).toHaveCount(0)
  expect(errors).toEqual([])
})
