import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

async function picture(page, text) {
  if (process.env.OCR_FIXTURE && text === 'HELLO') return readFileSync(process.env.OCR_FIXTURE)
  const url = await page.evaluate(text => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 240
    const ctx = canvas.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,240,240)
    ctx.fillStyle='#111';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(text,120,140)
    return canvas.toDataURL('image/png')
  },text)
  return Buffer.from(url.split(',')[1],'base64')
}
async function open(page, text) {
  await page.locator('input[type=file]').first().setInputFiles({name:`${text}.png`,mimeType:'image/png',buffer:await picture(page,text)})
}
async function recognized(page, text) {
  await expect.poll(()=>page.locator('.block-list .bang-cell').evaluateAll(inputs=>inputs.map(input=>input.value).join(''))).toContain(text)
  await expect(page.locator('.ocr-retry')).toHaveCount(0)
}
test.beforeEach(async ({page}) => {
  await page.route('**/catalog/**',route=>route.fulfill({json:[]}))
})

test('real model recognizes a small image, repeats, and keeps the last picture after rapid changes',async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('./')
  const text=process.env.OCR_FIXTURE_TEXT || 'HELLO'
  await open(page,'HELLO');await recognized(page,text)
  await page.getByRole('button',{name:'还原原图',exact:true}).click()
  await recognized(page,text)
  await open(page,'FIRST');await open(page,'SECOND');await recognized(page,'SECOND')
  expect(errors).toEqual([])
})

test('an allocation failure terminates the worker and automatically recovers with real bounded inference',async ({page})=>{
  await page.addInitScript(()=>{
    window.__ocrAudit=[];window.__injectedMemoryFailure=false
    const NativeWorker=Worker
    window.Worker=class extends NativeWorker{
      constructor(...args){super(...args);this.isOcr=String(args[0]).includes('ocr.worker-');if(this.isOcr){this.audit={terminated:false};window.__ocrAudit.push(this.audit)}}
      postMessage(data,...args){
        if(this.isOcr){this.audit.lowMemory=data.lowMemory
          if(data.kind==='recognize'&&!window.__injectedMemoryFailure){window.__injectedMemoryFailure=true;queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:{ok:false,error:{name:'RangeError',message:'Out of memory'}}})));return}
        }
        return super.postMessage(data,...args)
      }
      terminate(){if(this.audit)this.audit.terminated=true;return super.terminate()}
    }
  })
  await page.goto('./');await open(page,'HELLO')
  await recognized(page,process.env.OCR_FIXTURE_TEXT || 'HELLO')
  const audit=await page.evaluate(()=>window.__ocrAudit)
  expect(audit).toHaveLength(2)
  expect(audit[0].terminated).toBe(true)
  expect(audit[1].lowMemory).toBe(true)
})
