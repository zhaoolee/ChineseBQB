import { expect, it, vi } from 'vitest'
import { OCR_IMPORT_FACTORY } from '../build/ocr-import-retry'

type Importer = (url: string) => Promise<unknown>
const factory = new Function(`return (${OCR_IMPORT_FACTORY})`)() as (
  base: string, importer: Importer, pause: (ms: number) => Promise<void>,
) => Importer
const base = 'https://example.test/ChineseBQB/maker/assets/app.js'
const pause = async () => undefined

it('bypasses a cached Safari import failure and shares the recovered module', async () => {
  const module = { PaddleOCR: {}, env: {} }
  const network = vi.fn<Importer>().mockRejectedValueOnce(new TypeError('Importing a module script failed.')).mockResolvedValue(module)
  const load = factory(base, network, pause)
  const [sdk, runtime] = await Promise.all([load('./ocr.js'), load('./ocr.js')])
  expect(sdk).toBe(module)
  expect(runtime).toBe(module)
  expect(network).toHaveBeenCalledTimes(2)
  expect(network.mock.calls[0][0]).toBe(new URL('./ocr.js', base).href)
  expect(new URL(network.mock.calls[1][0]).searchParams.has('ocr_retry')).toBe(true)
  expect(await load('./ocr.js')).toBe(module)
  expect(network).toHaveBeenCalledTimes(2)
})

it('allows a user retry after all network attempts fail, with fresh module URLs', async () => {
  const failedUrls = new Set<string>()
  let offline = true
  const network = vi.fn<Importer>(async (url) => {
    if (offline || failedUrls.has(url)) {
      failedUrls.add(url)
      throw new TypeError('Failed to fetch dynamically imported module: ' + url)
    }
    return { ready: true }
  })
  const load = factory(base, network, pause)
  await expect(load('./ocr.js')).rejects.toMatchObject({ name: 'OcrModuleLoadError' })
  expect(network).toHaveBeenCalledTimes(3)
  offline = false
  await expect(load('./ocr.js')).resolves.toEqual({ ready: true })
  expect(network).toHaveBeenCalledTimes(5)
})

it('reports module execution errors without retrying them as a download failure', async () => {
  const error = new Error('incompatible runtime')
  const network = vi.fn<Importer>().mockRejectedValue(error)
  await expect(factory(base, network, pause)('./ocr.js')).rejects.toBe(error)
  expect(network).toHaveBeenCalledOnce()
})
