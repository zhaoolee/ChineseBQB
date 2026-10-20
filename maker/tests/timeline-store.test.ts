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
