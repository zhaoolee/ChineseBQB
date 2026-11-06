import { expectWechatMode } from './download-settings.mjs'
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
})

test('WeChat mode exports a >1600 still as a small GIF with its edit', async ({ page }) => {
  await page.goto('./')
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 1200
    const context = canvas.getContext('2d')
    context.fillStyle = '#c81e1e'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#00ff00'
    context.fillRect(canvas.width - 1, 0, 1, canvas.height)
    return canvas.toDataURL('image/png')
  })
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'native-large.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
  })

  await expect(page.getByRole('button', { name: '下载', exact: true })).toBeEnabled()
  await expectWechatMode(page)

  await page.getByRole('button', { name: '添加文字' }).click()
  const cell = page.locator('.free-line input').first()
  await cell.fill('测')
  await cell.blur()
  await expect(cell).toHaveValue('测')

  const exportButton = page.getByRole('button', { name: '下载', exact: true })
  await expect(exportButton).toBeEnabled()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ])
  expect(download.suggestedFilename()).toBe('edited-native-large.gif')
  const bytes = readFileSync(await download.path())
  expect(bytes.subarray(0, 3).toString('latin1')).toBe('GIF')

  const decoded = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/gif' }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')
    context.drawImage(bitmap, 0, 0)
    const center = context.getImageData(
      Math.max(0, Math.floor(bitmap.width / 2) - 24),
      Math.max(0, Math.floor(bitmap.height / 2) - 14),
      48,
      28,
    ).data
    let bright = 0
    for (let index = 0; index < center.length; index += 4) {
      if (center[index] > 220 && center[index + 1] > 220 && center[index + 2] > 220) bright += 1
    }
    const right = context.getImageData(bitmap.width - 1, Math.floor(bitmap.height / 2), 1, 1).data
    return { width: bitmap.width, height: bitmap.height, bright, right: [right[0], right[1], right[2]] }
  }, bytes.toString('base64'))

  expect(decoded).toMatchObject({ width: 240, height: 120 })
  expect(decoded.bright).toBeGreaterThan(2)
})
