import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
})

test('a still PNG downloads a real transparent GIF through the export worker', async ({ page }) => {
  await page.goto('./')
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 240
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#e8352a'
    context.fillRect(0, 0, 240, 240)
    return canvas.toDataURL('image/png')
  })
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'transparent-still.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
  })

  const exportButton = page.getByRole('button', { name: '下载', exact: true })
  await expect(exportButton).toBeEnabled()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ])
  expect(download.suggestedFilename()).toBe('edited-transparent-still.gif')
  const bytes = readFileSync(await download.path())
  expect(bytes.subarray(0, 6).toString('latin1')).toMatch(/^GIF8[79]a$/)
  expect(bytes.byteLength).toBeLessThan(500_000)

  const decoded = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/gif' }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    return {
      width: bitmap.width,
      height: bitmap.height,
      leftAlpha: pixels[3],
      rightAlpha: pixels[(canvas.width - 1) * 4 + 3],
    }
  }, bytes.toString('base64'))
  expect(decoded).toEqual({ width: 240, height: 120, leftAlpha: 255, rightAlpha: 0 })
})
