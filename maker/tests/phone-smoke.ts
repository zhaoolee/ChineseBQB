// Optional real-browser smoke test. Run from the iPhone's Web Inspector console:
// import('/ChineseBQB/maker/tests/phone-smoke.ts').then(m => m.runPhoneSmoke())
// Uses synthetic images only; never uploads pictures or reads personal photos.
import { editor, openLocalFile, runOcr, setTargetText, addFreeText, setFreeText } from '../src/state/editor-store'
import { encodeGif, decodeGifFrames } from '../src/lib/gif'
import { exportGif } from '../src/lib/gif-export'
import { collectPatches } from '../src/lib/plan'
import { canvasToPng, paintComposite } from '../src/lib/paint'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function waitOcr() {
  return new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => { stop(); reject(new Error('OCR timeout after 90 seconds')) },90_000)
    const check = () => {
      const state=editor.getState()
      if (state.ocrStatus === 'loading') return
      stop(); clearTimeout(deadline)
      if (state.ocrMessage.startsWith('识别失败')) reject(new Error(state.ocrMessage))
      else resolve()
    }
    const stop=editor.subscribe(check)
    check()
  })
}
async function textFile(width: number,height: number,name: string) {
  const canvas=document.createElement('canvas')
  canvas.width=width;canvas.height=height
  try {
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height)
    ctx.fillStyle='#111';ctx.font=`bold ${Math.round(width/10)}px sans-serif`
    ctx.textAlign='center';ctx.textBaseline='middle'
    ctx.fillText('今天不上班',width/2,height/2,width*0.9)
    return new File([await canvasToPng(canvas)],name,{type:'image/png'})
  } finally {canvas.width=canvas.height=0}
}

export async function runPhoneSmoke() {
  const results: unknown[]=[]
  const log=(result:unknown)=>{results.push(result);console.log('PHONE_TEST '+JSON.stringify(result))}
  let last=performance.now(),maxGap=0
  const pulse=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now},100)
  log({stage:'start',userAgent:navigator.userAgent,url:location.href})
  try {
    const large=await textFile(4000,3000,'synthetic-4000x3000.png')
    await openLocalFile(large)
    await waitOcr()
    let state=editor.getState()
    assert(state.image?.naturalWidth===1600 && state.image.naturalHeight===1200,'editor must downsample')
    assert(state.history.present.blocks.some(b=>b.originalText.includes('今天')),'real OCR must recognize Chinese caption')
    assert(state.history.present.blocks.every(b=>b.polygon.every(p=>p.x>=0&&p.x<=1600&&p.y>=0&&p.y<=1200)),'OCR boxes must fit editor')
    log({stage:'large-image-ocr',status:'pass',text:state.history.present.blocks.map(b=>b.originalText),size:[1600,1200]})
    const block=state.history.present.blocks[0]
    setTargetText(block.id,block.targetText.replace('不','要'))
    state=editor.getState()
    const canvas=document.createElement('canvas')
    try {
      paintComposite(state.image!.imageData!,collectPatches(state.history.present.blocks,state.image!.imageData!),state.history.present.freeTexts,canvas)
      const blob=await canvasToPng(canvas)
      const bitmap=await createImageBitmap(blob)
      assert(bitmap.width===1600&&bitmap.height===1200,'PNG export size')
      bitmap.close()
      log({stage:'edit-and-png-export',status:'pass',bytes:blob.size})
    } finally {canvas.width=canvas.height=0}
    await Promise.all([runOcr(),runOcr(),runOcr()])
    assert(editor.getState().ocrStatus==='ready','repeated OCR must recover')
    log({stage:'rapid-ocr-requests',status:'pass'})
    const tiny=await textFile(480,320,'synthetic-small.png')
    await openLocalFile(tiny);await waitOcr()
    const still=editor.getState().image!.imageData!
    const frames=[80,100,250].map(delayMs=>({imageData:still,delayMs}))
    await openLocalFile(new File([new Uint8Array(encodeGif(frames))],'synthetic-animation.gif',{type:'image/gif'}))
    await waitOcr()
    addFreeText()
    state=editor.getState()
    setFreeText(state.history.present.freeTexts[0].id,'测试')
    state=editor.getState()
    const exported=await exportGif(state.image!.frames!,[],state.history.present.freeTexts)
    const roundtrip=decodeGifFrames(new Uint8Array(await exported.arrayBuffer()))
    assert(JSON.stringify(roundtrip.frames.map(f=>f.delayMs))==='[80,100,250]','GIF timing must roundtrip exactly')
    log({stage:'gif-edit-export',status:'pass',frames:roundtrip.frames.length,delays:roundtrip.frames.map(f=>f.delayMs),bytes:exported.size})
    const pixel=new ImageData(new Uint8ClampedArray([0,0,0,255]),1,1)
    const over=encodeGif(Array.from({length:25},()=>({imageData:pixel,delayMs:100}))).slice()
    over[6]=0;over[7]=4;over[8]=0;over[9]=4
    await openLocalFile(new File([new Uint8Array(over)],'synthetic-over-budget.gif',{type:'image/gif'}))
    await waitOcr()
    assert(editor.getState().image?.frames?.length===25,'over-budget GIF must preserve all 25 frames without sampling')
    assert(editor.getState().image?.naturalWidth===1024&&editor.getState().image?.naturalHeight===1024,'GIF preview must stay at native 1024x1024')
    assert(!editor.getState().notice?.includes('调整'),'no downsample notice when no frames are sampled')
    log({stage:'gif-native-size-preview',status:'pass',compressedBytes:over.length})
    await openLocalFile(tiny);await waitOcr()
    log({stage:'complete',status:'pass',maxMainThreadGapMs:Math.round(maxGap)})
    return results
  } catch(error) {
    log({stage:'failed',error:error instanceof Error?error.message:String(error)})
    throw error
  } finally {clearInterval(pulse)}
}
