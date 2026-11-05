import { expect } from '@playwright/test'

export async function openDownloadSettings(page) {
  const button = page.getByRole('button', { name: '下载设置', exact: true })
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click()
  return page.getByRole('dialog', { name: '下载设置', exact: true })
}
export async function setNativeDownload(page) {
  await openDownloadSettings(page)
  await page.getByRole('button', { name: '恢复原格式', exact: true }).click()
}
export async function expectWechatMode(page) {
  const panel = await openDownloadSettings(page)
  await expect(panel.getByRole('radio', { name: '适配微信表情' })).toBeChecked()
  await panel.getByRole('button', { name: '关闭下载设置' }).click()
}
export async function setWechatMode(page) {
  const panel = await openDownloadSettings(page)
  await panel.getByRole('radio', { name: '适配微信表情' }).check()
  await panel.getByRole('button', { name: '关闭下载设置' }).click()
}
export async function setMp4Mode(page, { lossless = false, flatten = false } = {}) {
  const panel = await openDownloadSettings(page)
  await panel.getByRole('radio', { name: 'MP4 视频' }).check()
  await panel.getByRole('checkbox', { name: '透明区域铺白（移除透明度）' }).setChecked(flatten)
  const advanced = panel.locator('details')
  if (await advanced.getAttribute('open') === null) await advanced.locator('summary').click()
  await panel.getByRole('checkbox', { name: '逐像素无损 MP4', exact: true }).setChecked(lossless)
  await panel.getByRole('button', { name: '关闭下载设置' }).click()
}
