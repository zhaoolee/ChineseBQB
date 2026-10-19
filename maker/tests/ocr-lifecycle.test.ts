import { expect, it, vi } from 'vitest'
const sdk = vi.hoisted(() => ({ create:vi.fn(), predict:vi.fn(), dispose:vi.fn() }))
vi.mock('@paddleocr/paddleocr-js', () => ({PaddleOCR:{create:sdk.create}}))
import { recognize } from '../src/lib/ocr'

it('serializes inference, skips stale requests, and awaits disposal before a new engine', async () => {
  const events:string[]=[]
  let finishPrediction: (()=>void)|undefined
  let finishDisposal: (()=>void)|undefined
  sdk.create.mockImplementation(async()=>{
    events.push('create')
    return {predict:sdk.predict,dispose:sdk.dispose}
  })
  sdk.predict.mockImplementationOnce(()=>new Promise(resolve=>{
    events.push('predict')
    finishPrediction=()=>resolve([{items:[]}])
  })).mockImplementation(async()=>{events.push('predict');return [{items:[]}]})
  sdk.dispose.mockImplementationOnce(()=>new Promise<void>(resolve=>{
    events.push('dispose-start')
    finishDisposal=()=>{events.push('dispose-end');resolve()}
  })).mockImplementation(async()=>{events.push('dispose')})
  const first=recognize(new Blob(['first']))
  let current=true
  const stale=recognize(new Blob(['stale']),()=>current)
  const last=recognize(new Blob(['last']))
  await vi.waitFor(()=>expect(sdk.predict).toHaveBeenCalledTimes(1))
  current=false
  finishPrediction!()
  await vi.waitFor(()=>expect(events).toContain('dispose-start'))
  expect(sdk.create).toHaveBeenCalledTimes(1)
  finishDisposal!()
  await Promise.all([first,stale,last])
  expect(sdk.create).toHaveBeenCalledTimes(2)
  expect(sdk.predict).toHaveBeenCalledTimes(2)
  expect(sdk.dispose).toHaveBeenCalledTimes(2)
  expect(events).toEqual(['create','predict','dispose-start','dispose-end','create','predict','dispose'])
})

it('disposes failed predictions and lets the following request recover',async()=>{
  sdk.create.mockClear();sdk.dispose.mockClear()
  sdk.predict.mockRejectedValueOnce(new Error('inference failed')).mockResolvedValue([{items:[]}])
  await expect(recognize(new Blob())).rejects.toThrow('inference failed')
  await expect(recognize(new Blob())).resolves.toEqual([])
  expect(sdk.dispose).toHaveBeenCalledTimes(2)
})
