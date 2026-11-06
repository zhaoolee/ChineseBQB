import { expect } from '@playwright/test'

export async function openDownloadSettings(page) {
  const button = page.getByRole('button', { name: '下载设置', exact: true })
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click()
  return page.getByRole('dialog', { name: '下载设置', exact: true })
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
export async function setMp4Mode(page) {
  const panel = await openDownloadSettings(page)
  await panel.getByRole('radio', { name: 'MP4 视频' }).check()
  await panel.getByRole('button', { name: '关闭下载设置' }).click()
}
