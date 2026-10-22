import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ decode: vi.fn(), cancelDecode: vi.fn(), recognize: vi.fn(), cancelOcr: vi.fn() }))
vi.mock('../src/lib/gif-decode', () => ({ decodeGifInWorker: mocks.decode, cancelGifDecode: mocks.cancelDecode }))
vi.mock('../src/lib/ocr', () => ({ recognize: mocks.recognize, cancelOcrRecognition: mocks.cancelOcr, scaleOcrBlocks: (items: unknown) => items }))
vi.mock('../src/lib/ocr-input', () => ({ prepareOcrInput: async () => ({blob:new Blob(),scaleX:1,scaleY:1}) }))
class Pixels { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} }
beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('ImageData', Pixels)
  vi.stubGlobal('location', { href: 'https://example.test/ChineseBQB/maker/', origin: 'https://example.test' })
  vi.stubGlobal('history', { replaceState: vi.fn() })
  vi.stubGlobal('window', { confirm: () => true })
  mocks.decode.mockResolvedValue({width:40,height:20,limited:false,frames:[80,100,250].map(delayMs=>({imageData:new ImageData(new Uint8ClampedArray(40*20*4).fill(255),40,20),delayMs}))})
  mocks.recognize.mockImplementation(async () => [{id:'ocr',originalText:'甲',targetText:'甲',score:1,layout:'horizontal',enabled:true,applyLocal:false,lineRedraw:false,polygon:[{x:2,y:2},{x:38,y:2},{x:38,y:18},{x:2,y:18}],textStyle:{fontFamily:'sans-serif',fontSize:12,fill:'#111'}}])
})
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
async function loaded() {
  const store = await import('../src/state/editor-store')
  await store.openLocalFile(Object.assign(new Blob(['GIF89a'],{type:'image/gif'}),{name:'timeline.gif'}) as File)
  await vi.waitFor(() => expect(store.editor.getState().ocrStatus).toBe('ready'))
  return store
}

const catalogImage = (id: string) => ({ name: `${id}.gif`, src: `media/${id}.gif`, thumb: `thumbs/${id}.webp`, label: id, animated: true })

it('publishes a thumbnail immediately, keeps it through decoding, and only then starts OCR', async () => {
  const s = await import('../src/state/editor-store')
  let download!: (response: Response) => void
  let decode!: (value: unknown) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { download = resolve })))
  const decoded = await mocks.decode()
  mocks.decode.mockImplementationOnce(() => new Promise(resolve => { decode = resolve }))
  const pending = s.openCatalogImage(catalogImage('first'))
  expect(s.editor.getState()).toMatchObject({ image: null, imageLoading: true, loadingPreview: { src: expect.stringContaining('/thumbs/first.webp'), phase: 'download' } })
  expect(mocks.recognize).not.toHaveBeenCalled()
  download(new Response(new Blob(['GIF89a'], {type: 'image/gif'})))
  await vi.waitFor(() => expect(decode).toBeTypeOf('function'))
  expect(s.editor.getState().loadingPreview?.phase).toBe('decode')
  expect(mocks.recognize).not.toHaveBeenCalled()
  decode(decoded)
  await pending
  expect(s.editor.getState()).toMatchObject({ imageLoading: false, loadingPreview: null, image: { source: {id: 'media/first.gif'} } })
  await vi.waitFor(() => expect(mocks.recognize).toHaveBeenCalledOnce())
})

it('aborts the previous original download and ignores even a late successful response', async () => {
  const s = await import('../src/state/editor-store')
  const requests: { signal: AbortSignal; finish: (response: Response) => void }[] = []
  vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise(resolve => { requests.push({signal: options.signal, finish: resolve}) })))
  const first = s.openCatalogImage(catalogImage('first'))
  const second = s.openCatalogImage(catalogImage('second'))
  expect(requests[0].signal.aborted).toBe(true)
  expect(s.editor.getState().loadingPreview?.src).toContain('/thumbs/second.webp')
  const oldResponse = new Response('GIF89a')
  const oldBody = vi.spyOn(oldResponse, 'blob')
  requests[0].finish(oldResponse)
  await first
  expect(oldBody).not.toHaveBeenCalled()
  expect(s.editor.getState().loadingPreview?.src).toContain('/thumbs/second.webp')
  requests[1].finish(new Response('GIF89a'))
  await second
  expect(s.editor.getState().image?.source.id).toBe('media/second.gif')
  expect(mocks.decode).toHaveBeenCalledOnce()
})

it('does not start a stale GIF decoder after a slow blob read, or replace the newer image', async () => {
  const s = await import('../src/state/editor-store')
  let readOld!: (bytes: ArrayBuffer) => void
  const oldBlob = new Blob(['GIF89a'])
  vi.spyOn(oldBlob, 'arrayBuffer').mockImplementationOnce(() => new Promise(resolve => { readOld = resolve }))
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ok: true, blob: async () => oldBlob})
    .mockResolvedValueOnce(new Response('GIF89a')))
  const first = s.openCatalogImage(catalogImage('first'))
  await vi.waitFor(() => expect(readOld).toBeTypeOf('function'))
  await s.openCatalogImage(catalogImage('second'))
  readOld(new TextEncoder().encode('GIF89a').buffer as ArrayBuffer)
  await first
  expect(mocks.decode).toHaveBeenCalledOnce()
  expect(s.editor.getState()).toMatchObject({ imageLoading: false, loadingPreview: null, image: {source: {id: 'media/second.gif'}} })
})

it.each(['download', 'decode'])('clears the thumbnail when %s fails', async phase => {
  const s = await import('../src/state/editor-store')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('GIF89a', {status: phase === 'download' ? 503 : 200})))
  if (phase === 'decode') mocks.decode.mockRejectedValueOnce(new Error('Invalid GIF'))
  await s.openCatalogImage(catalogImage('broken'))
  expect(s.editor.getState()).toMatchObject({imageLoading: false, loadingPreview: null, image: null, imageError: expect.any(String)})
  expect(mocks.recognize).not.toHaveBeenCalled()
})

it('keeps segment text independent across seeking, undo and redo', async () => {
  const s = await loaded()
  s.addFreeText()
  s.setFreeText(s.visibleEdits().freeTexts[0].id, '前段')
  s.setGifFrame(1)
  s.splitGifAtPlayhead()
  expect(s.editor.getState().history.present.segments).toHaveLength(2)
  s.setFreeText(s.visibleEdits().freeTexts[0].id, '后段')
  s.setGifFrame(0)
  expect(s.visibleEdits().freeTexts[0].text).toBe('前段')
  s.setGifFrame(2)
  expect(s.visibleEdits().freeTexts[0].text).toBe('后段')
  s.undo()
  expect(s.visibleEdits().freeTexts[0].text).toBe('前段')
  s.redo()
  expect(s.visibleEdits().freeTexts[0].text).toBe('后段')
  expect(JSON.stringify(s.editor.getState().history)).not.toContain('imageData')
})

it('recognizes only the current segment without erasing other segment edits', async () => {
  const s = await loaded()
  const id = s.visibleEdits().blocks[0].id
  s.setTargetText(id,'前')
  s.setGifFrame(1)
  s.splitGifAtPlayhead()
  await s.runOcr()
  expect(s.visibleEdits().blocks[0].targetText).toBe('甲')
  s.setGifFrame(0)
  expect(s.visibleEdits().blocks[0].targetText).toBe('前')
})

it('invalidates pending OCR when seeking so a late result cannot replace another frame', async () => {
  const s = await loaded()
  let finish!: (items: unknown[]) => void
  mocks.recognize.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const pending = s.runOcr()
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  s.setGifFrame(2)
  finish([])
  await pending
  expect(s.visibleEdits().blocks).toHaveLength(1)
  expect(s.editor.getState().gifFrameIndex).toBe(2)
  expect(s.editor.getState().ocrStatus).toBe('ready')
})

it('clears progress after failure or seeking and rejects late progress from the old frame', async () => {
  const s = await loaded()
  let report!: (value: { stage: 'recognize' }) => void
  let fail!: (error: Error) => void
  mocks.recognize.mockImplementationOnce((_blob, _current, onProgress) => new Promise((_resolve, reject) => {
    report = onProgress
    fail = reject
  }))
  const failed = s.runOcr()
  expect(s.editor.getState().ocrProgress).toEqual({stage: 'prepare'})
  await vi.waitFor(() => expect(report).toBeTypeOf('function'))
  report({stage: 'recognize'})
  expect(s.editor.getState().ocrProgress).toEqual({stage: 'recognize'})
  fail(new Error('Failed'))
  await failed
  expect(s.editor.getState().ocrStatus).toBe('error')
  expect(s.editor.getState().ocrProgress).toBeNull()
  mocks.recognize.mockImplementationOnce((_blob, _current, onProgress) => new Promise((_resolve, reject) => {
    report = onProgress
    fail = reject
  }))
  const pending = s.runOcr()
  await vi.waitFor(() => expect(mocks.recognize).toHaveBeenCalledTimes(3))
  s.setGifFrame(2)
  report({stage: 'recognize'})
  fail(new Error('Cancelled'))
  await pending
  expect(s.editor.getState().ocrProgress).toBeNull()
  expect(s.editor.getState().ocrStatus).toBe('ready')
})


it.each(['skip', 'edit', 'gesture'] as const)('protects manual edits from late OCR after %s', async action => {
  const s = await loaded()
  s.addFreeText()
  const id = s.visibleEdits().freeTexts[0].id
  s.setFreeText(id, '保留手工文字')
  let finish!: (items: unknown[]) => void
  let report!: (value: {stage: 'recognize'}) => void
  mocks.recognize.mockImplementationOnce((_blob, _current, onProgress) => new Promise(resolve => {
    finish = resolve
    report = onProgress
  }))
  const pending = s.runOcr()
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  if (action === 'skip') s.skipOcr()
  else if (action === 'edit') s.setFreeText(id, '识别中修改')
  else { s.beginGesture(); s.moveFreeText(id, 10, 12); s.endGesture() }
  expect(s.editor.getState()).toMatchObject({ocrStatus: 'idle', ocrProgress: null})
  const edits = s.editor.getState().history.present
  report({stage: 'recognize'})
  finish([])
  await pending
  expect(s.editor.getState()).toMatchObject({ocrStatus: 'idle', ocrProgress: null})
  expect(s.editor.getState().history.present).toBe(edits)
  expect(s.visibleEdits().freeTexts[0].text).toBe(action === 'edit' ? '识别中修改' : '保留手工文字')
  await s.runOcr()
  expect(s.editor.getState().ocrStatus).toBe('ready')
})

it('offers no comparison for an untouched OCR result, selection or view change', async () => {
  const s = await loaded()
  const id = s.visibleEdits().blocks[0].id
  expect(s.canCompare()).toBe(false)
  s.select(id)
  s.setView({ scale: 2, panX: 8 })
  expect(s.canCompare()).toBe(false)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(false)
})

it('shows comparison only after a real edit and hides it again when the original text returns', async () => {
  const s = await loaded()
  const id = s.visibleEdits().blocks[0].id
  s.setTargetText(id, '乙')
  expect(s.canCompare()).toBe(true)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(true)
  s.setTargetText(id, '甲')
  expect(s.canCompare()).toBe(false)
  expect(s.editor.getState().comparing).toBe(false)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(false)
})

it('leaves comparison through undo, redo and reset without re-entering it', async () => {
  const s = await loaded()
  const id = s.visibleEdits().blocks[0].id
  s.setTargetText(id, '乙')
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(true)
  s.undo()
  expect(s.canCompare()).toBe(false)
  expect(s.editor.getState().comparing).toBe(false)
  s.redo()
  expect(s.canCompare()).toBe(true)
  expect(s.editor.getState().comparing).toBe(false)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(true)
  s.resetDocument()
  await vi.waitFor(() => expect(s.editor.getState().ocrStatus).toBe('ready'))
  expect(s.canCompare()).toBe(false)
  expect(s.editor.getState().comparing).toBe(false)
})

it('ignores blank free text and exits comparison when the GIF segment has no edits', async () => {
  const s = await loaded()
  s.setGifFrame(1)
  s.splitGifAtPlayhead()
  s.setGifFrame(0)
  s.addFreeText()
  const id = s.visibleEdits().freeTexts[0].id
  s.setFreeText(id, '   ')
  expect(s.canCompare()).toBe(false)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(false)
  s.setFreeText(id, '前')
  expect(s.canCompare()).toBe(true)
  s.toggleComparison()
  expect(s.editor.getState().comparing).toBe(true)
  s.setGifFrame(2)
  expect(s.canCompare()).toBe(false)
  expect(s.editor.getState().comparing).toBe(false)
  s.setGifFrame(0)
  expect(s.canCompare()).toBe(true)
  expect(s.editor.getState().comparing).toBe(false)
})

it('keeps canvas text, eight-handle geometry and panel values on one undoable layer', async () => {
  const s = await loaded()
  const { freeTextBox } = await import('../src/lib/free-text-box')
  s.addFreeText()
  const id = s.visibleEdits().freeTexts[0].id
  s.focusCell(id, 0, ['新', '文', '字'])
  s.select(id, { clearCellFocus: true })
  expect(s.editor.getState().cellFocus).toBeNull()
  s.setFreeText(id, '画布和格子同步')
  const before = s.visibleEdits().freeTexts[0]
  s.beginGesture()
  s.moveFreeText(id, 25, 15)
  s.endGesture()
  s.beginGesture()
  s.resizeFreeText(id, before.textStyle.fontSize * 2)
  s.endGesture()
  const after = s.visibleEdits().freeTexts[0]
  expect(after).toMatchObject({ text: '画布和格子同步', x: 25, y: 15 })
  expect(freeTextBox(after).width).toBeGreaterThan(freeTextBox(before).width)
  s.undo()
  expect(s.visibleEdits().freeTexts[0].textStyle.fontSize).toBe(before.textStyle.fontSize)
  s.undo()
  expect(s.visibleEdits().freeTexts[0]).toEqual(before)
  s.setFreeText(id, '格子反向修改')
  expect(s.visibleEdits().freeTexts[0].text).toBe('格子反向修改')
})
