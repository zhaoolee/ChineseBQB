import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import gifenc from 'gifenc'
import gifuct from 'gifuct-js'
import { test, expect } from '@playwright/test'

// Independent native decoder: the browser uses the bundled WASM encoder.
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe'
const { GIFEncoder } = gifenc
const palette = [[13, 101, 209], [246, 28, 87], [1, 255, 53], [239, 181, 7]]
function fixture({ width = 17, height = 13, delays = [10, 70, 130], transparent = false } = {}) {
  const gif = GIFEncoder()
  const frames = delays.map((delay, frame) => {
    const indexed = Uint8Array.from({ length: width * height }, (_, i) => (i + frame) % palette.length)
    gif.writeFrame(indexed, width, height, { palette, delay, dispose: 2, transparent, transparentIndex: 0 })
    return Buffer.from([...indexed].flatMap(index => transparent && index === 0 ? [255, 255, 255] : palette[index]))
  })
  gif.finish()
  return { bytes: Buffer.from(gif.bytes()), frames, delays, width, height }
}
async function upload(page, source) {
  await page.goto('./')
  await page.locator('input[type=file]').first().setInputFiles({ name: 'exact.gif', mimeType: 'image/gif', buffer: source.bytes })
  await expect(page.getByRole('button', { name: '无损 MP4', exact: true })).toBeEnabled()
}
async function downloadMp4(page, testInfo) {
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: '无损 MP4', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('edited-exact.mp4')
  const path = testInfo.outputPath('exact.mp4')
  await download.saveAs(path)
  expect(readFileSync(path).subarray(4, 8).toString()).toBe('ftyp')
  const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_frames', '-of', 'json', path], { encoding: 'utf8', maxBuffer: 10_000_000 }))
  const raw = execFileSync(ffmpeg, ['-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-fps_mode', 'passthrough', 'pipe:1'], { maxBuffer: 10_000_000 })
  return { probe, raw }
}
function verifyPixels(source, result) {
  const { streams, frames } = result.probe
  const gcd = (a, b) => b ? gcd(b, a % b) : a
  const tick = source.delays.reduce(gcd)
  const samples = source.delays.reduce((a, b) => a + b, 0) / tick
  expect(streams[0]).toMatchObject({ width: source.width, height: source.height, codec_name: 'h264', pix_fmt: 'gbrp' })
  expect(Number(streams[0].duration)).toBeCloseTo(source.delays.reduce((a, b) => a + b, 0) / 1000, 6)
  expect(frames).toHaveLength(samples)
  const frameSize = source.width * source.height * 3
  expect(result.raw.length).toBe(samples * frameSize)
  let sample = 0
  source.frames.forEach((expected, index) => {
    for (let n = 0; n < source.delays[index] / tick; n++, sample++) {
      expect(Number(frames[sample].best_effort_timestamp_time)).toBeCloseTo(sample * tick / 1000, 6)
      expect(result.raw.subarray(sample * frameSize, (sample + 1) * frameSize).equals(expected), `source frame ${index}, sample ${sample}: RGB must match exactly`).toBe(true)
    }
  })
}
test.beforeEach(async ({ page }) => {
  await page.route('**/catalog/**', route => route.fulfill({ json: [] }))
  // OCR is unrelated to the codec and must not download models in these tests.
  await page.route('**/*.onnx*', route => route.abort())
})

test('MP4 is pixel-exact at odd native dimensions and preserves every frame hold', async ({ page }, testInfo) => {
  const source = fixture()
  const assets = []
  page.on('request', request => { if (/ffmpeg-core/.test(request.url())) assets.push(request.url()) })
  await upload(page, source)
  expect(assets).toHaveLength(0)
  await expect(page.getByRole('checkbox', { name: '适配微信表情' })).toBeChecked()
  await page.locator('.mp4-export-note summary').click()
  await page.screenshot({ path: testInfo.outputPath('mp4-controls.png'), fullPage: true })
  verifyPixels(source, await downloadMp4(page, testInfo))
  expect(assets.some(url => url.endsWith('.wasm'))).toBe(true)
  expect(assets.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
})

test('editor and MP4 retain all 201 original frames', async ({ page }, testInfo) => {
  const source = fixture({ width: 3, height: 3, delays: Array(201).fill(30) })
  await upload(page, source)
  await expect(page.getByRole('slider', { name: 'GIF 当前帧' })).toHaveAttribute('max', '200')
  verifyPixels(source, await downloadMp4(page, testInfo))
})

test('unchecking WeChat exports all 201 GIF frames at native dimensions and delays', async ({ page }) => {
  const source = fixture({ width: 17, height: 13, delays: Array.from({ length: 201 }, (_, i) => i % 2 ? 70 : 10) })
  await upload(page, source)
  await expect(page.getByRole('slider', { name: 'GIF 当前帧' })).toHaveAttribute('max', '200')
  await page.getByRole('checkbox', { name: '适配微信表情' }).uncheck()
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: '下载', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('edited-exact.gif')
  const bytes = readFileSync(await download.path())
  const parsed = gifuct.parseGIF(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  expect(parsed.lsd).toMatchObject({ width: source.width, height: source.height })
  expect(parsed.frames.filter(frame => frame.image).map(frame => frame.gce.delay * 10)).toEqual(source.delays)
})

test('a single-frame GIF also exports a lossless MP4 with its full hold', async ({ page }, testInfo) => {
  const source = fixture({ delays: [170] })
  await upload(page, source)
  verifyPixels(source, await downloadMp4(page, testInfo))
})

test('MP4 pixels include edits only in their timeline segment', async ({ page }, testInfo) => {
  // Use the same CPU canvas rasterizer as the export worker. Chrome's GPU
  // preview can round antialiased glyph blends by 1–2 levels before it switches
  // to CPU after repeated getImageData calls; that is unrelated to the codec.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(this, type, type === '2d' ? { ...options, willReadFrequently: true } : options)
    }
  })
  const source = fixture({ width: 101, height: 65, delays: [80, 120, 200] })
  await upload(page, source)
  const slider = page.getByRole('slider', { name: 'GIF 当前帧' })
  await slider.focus()
  await slider.press('ArrowRight')
  await expect(slider).toHaveValue('1')
  await page.getByLabel('更多时间轴操作').click()
  await page.getByRole('button', { name: '在此分段', exact: true }).click()
  await page.getByLabel('更多字幕操作').click()
  await page.getByRole('button', { name: '添加文字', exact: true }).click()
  const input = page.locator('.free-line input').first()
  const beforeText = await readCanvas()
  await input.fill('A')
  await input.blur()
  // Read the actual composed editor canvas; it excludes selection handles.
  async function readCanvas() {
    return Buffer.from(await page.locator('.canvas-editor canvas').evaluate(canvas => {
      const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      return [...rgba].filter((_, i) => i % 4 !== 3)
    }))
  }
  await expect.poll(async () => (await readCanvas()).equals(beforeText)).toBe(false)
  source.frames[1] = await readCanvas()
  await slider.focus()
  await slider.press('ArrowRight')
  await expect(slider).toHaveValue('2')
  await expect.poll(async () => (await readCanvas()).equals(source.frames[1])).toBe(false)
  source.frames[2] = await readCanvas()
  writeFileSync(testInfo.outputPath('expected.rgb'), Buffer.concat(source.frames))
  // Frame zero remains unedited; independently decoded video must equal all
  // three expected frames, including the canvas's antialiased text pixels.
  verifyPixels(source, await downloadMp4(page, testInfo))
})

test('transparent GIF requires explicit matting and remains exact after matting', async ({ page }, testInfo) => {
  const source = fixture({ transparent: true })
  await upload(page, source)
  await page.getByRole('button', { name: '无损 MP4', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('含透明区域')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.mp4-export-note summary').click()
  await page.getByRole('checkbox', { name: '透明区域铺白（移除透明度）' }).check()
  verifyPixels(source, await downloadMp4(page, testInfo))
})

test('cancel during codec loading stops export and a subsequent download succeeds', async ({ page }, testInfo) => {
  const source = fixture()
  await page.route('**/ffmpeg-core*.wasm', async route => {
    await new Promise(resolve => page.once('close', resolve))
    await route.abort().catch(() => {})
  })
  await upload(page, source)
  await page.getByRole('button', { name: '无损 MP4', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('正在加载')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('已取消')
  await page.unroute('**/ffmpeg-core*.wasm')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  verifyPixels(source, await downloadMp4(page, testInfo))
})

test('codec loading failure is actionable and retry uses a fresh worker', async ({ page }, testInfo) => {
  const source = fixture()
  await page.route('**/ffmpeg-core*.wasm', route => route.abort())
  await upload(page, source)
  await page.getByRole('button', { name: '无损 MP4', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('无损视频编码器加载失败')
  await page.getByRole('button', { name: '知道了', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.unroute('**/ffmpeg-core*.wasm')
  verifyPixels(source, await downloadMp4(page, testInfo))
})
