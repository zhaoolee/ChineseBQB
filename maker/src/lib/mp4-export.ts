import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import { createEditableGifFrames } from './gif'
import { scaleEditsForSource, type GifExportOptions, type Mp4ExportInput } from './gif-export'
import { sniffImage } from './image'
import { paintComposite } from './paint'
import { collectPatches } from './plan'
import { editsAtFrame, type TimedEdits } from './timeline'

// The core runs inside the disposable export worker. No nested worker, CDN,
// SharedArrayBuffer or cross-origin isolation is required on GitHub Pages.
type FFmpegCore = {
  FS: {
    writeFile(path: string, bytes: Uint8Array): void
    readFile(path: string): Uint8Array
    unlink(path: string): void
  }
  exec(...args: string[]): number
  setLogger(handler: (entry: { message: string }) => void): void
}

export function mp4Timing(delays: number[]) {
  if (!delays.length || delays.some(delay => !Number.isSafeInteger(delay) || delay <= 0 || delay % 10 !== 0)) {
    throw new Error('GIF 帧时序无效，无法无损导出。')
  }
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a
  const tickMs = delays.reduce(gcd)
  const durationMs = delays.reduce((a, b) => a + b, 0)
  return { tickMs, durationMs, samples: durationMs / tickMs, rate: `1000/${tickMs}` }
}

/** Repeat identical lossless samples on a common clock: every GIF boundary and
 * the final hold remain exact, including 10ms frames and unequal delays. This
 * avoids concat/VFR's otherwise shortened final sample. Never interpolate. */
export function mp4Manifest(delays: number[]): string {
  const { tickMs, rate } = mp4Timing(delays)
  const lines = ['ffconcat version 1.0']
  delays.forEach((delay, index) => {
    for (let tick = 0; tick < delay / tickMs; tick++) {
      lines.push(`file frame-${index}.png`, `option framerate ${rate}`)
    }
  })
  return `${lines.join('\n')}\n`
}

/** Operate on the composed frame, before encoding. Alpha is never silently lost. */
export function mp4OpaquePixels(pixels: ImageData, flatten: boolean): ImageData {
  let result: ImageData | undefined
  for (let i = 0; i < pixels.data.length; i += 4) {
    const alpha = pixels.data[i + 3]
    if (alpha === 255) continue
    if (!flatten) throw new Error('这张 GIF 含透明区域，MP4 无法保留透明度。请在「下载设置」中勾选「透明区域铺白」后重试，或下载 GIF 保留透明度。')
    result ??= new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)
    for (let c = 0; c < 3; c++) result.data[i + c] = Math.round((pixels.data[i + c] * alpha + 255 * (255 - alpha)) / 255)
    result.data[i + 3] = 255
  }
  return result ?? pixels
}

/** RGB lossless is opt-in: software decoders reproduce it exactly, but native
 * phone/social decoders may interpret RGB planes as YUV and display magenta.
 * Default to 8-bit H.264 High / YUV420 with explicit BT.709 limited-range tags.
 * Pad odd dimensions by at most one pixel; never resize or crop source content. */
export function mp4EncodingArgs(tickMs: number, lossless = false): string[] {
  const clock = `settb=expr=1/1000,setpts=N*${tickMs}`
  return lossless ? [
    '-vf', clock, '-c:v', 'libx264rgb', '-crf', '0', '-preset', 'ultrafast', '-pix_fmt', 'rgb24',
  ] : [
    '-vf', `${clock},pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=white,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '12', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-bf', '0', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  ]
}

export async function exportMp4(input: Mp4ExportInput, edits: TimedEdits, options: GifExportOptions): Promise<Blob> {
  const report = options.onProgress
  report?.({ stage: 'prepare', completed: 0, total: 0 })
  const bytes = new Uint8Array(await input.source.arrayBuffer())
  if (sniffImage(bytes, input.source.type).mime !== 'image/gif') throw new Error('MP4 导出仅支持 GIF。')
  const { frames, width, height } = createEditableGifFrames(bytes)
  const delays = frames.map(frame => frame.delayMs)
  const timing = mp4Timing(delays)
  // Refuse excessive work instead of silently resizing, dropping frames or
  // reducing quality. PNG staging is additionally bounded below.
  if (timing.durationMs > 600_000 || timing.samples * width * height > 500_000_000) {
    throw new Error('这张 GIF 超出浏览器视频处理预算，请先缩短动画；没有自动缩图或抽帧。')
  }
  const scaled = scaleEditsForSource(edits, input.editWidth, input.editHeight, width, height)
  report?.({ stage: 'load', completed: 0, total: 0 })
  let core: FFmpegCore
  try {
    const module = await import(/* @vite-ignore */ coreURL)
    core = await module.default({
      mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL }))}`,
    })
  } catch {
    throw new Error('视频编码器加载失败，请检查网络或稍后重试。')
  }
  const files: string[] = []
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('浏览器不能创建画布，无法导出 MP4。')
  let stagedBytes = 0
  try {
    report?.({ stage: 'prepare', completed: 0, total: frames.length })
    for (let index = 0; index < frames.length; index++) {
      const pixels = frames[index].imageData
      const current = editsAtFrame(scaled, index)
      const patches = collectPatches(current.blocks, pixels)
      paintComposite(pixels, patches, current.freeTexts, canvas as unknown as HTMLCanvasElement)
      const composed = context.getImageData(0, 0, width, height)
      const opaque = mp4OpaquePixels(composed, input.flattenTransparency)
      if (opaque !== composed) context.putImageData(opaque, 0, 0)
      const png = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer())
      stagedBytes += png.byteLength
      if (stagedBytes > 96_000_000) throw new Error('帧数据超过浏览器内存预算，请先缩短动画；没有自动缩图或抽帧。')
      const name = `frame-${index}.png`
      core.FS.writeFile(name, png)
      files.push(name)
      report?.({ stage: 'prepare', completed: index + 1, total: frames.length })
    }
    core.FS.writeFile('frames.txt', new TextEncoder().encode(mp4Manifest(delays)))
    files.push('frames.txt', 'output.mp4')
    report?.({ stage: 'encode', completed: 0, total: timing.samples })
    core.setLogger(({ message }) => {
      const match = /frame=\s*(\d+)/.exec(message)
      if (match) report?.({ stage: 'encode', completed: Math.min(timing.samples, Number(match[1])), total: timing.samples })
    })
    const result = core.exec(
      '-f', 'concat', '-safe', '0', '-i', 'frames.txt', '-an',
      ...mp4EncodingArgs(timing.tickMs, input.lossless),
      '-r', timing.rate, '-enc_time_base', '1:1000', '-fps_mode', 'passthrough',
      '-video_track_timescale', '1000', '-movflags', '+faststart', 'output.mp4',
    )
    if (result !== 0) throw new Error('MP4 编码失败，请重试或缩短动画；没有自动更改所选编码模式。')
    const output = core.FS.readFile('output.mp4')
    if (!output.byteLength) throw new Error('MP4 编码未生成文件，请重试。')
    report?.({ stage: 'encode', completed: timing.samples, total: timing.samples })
    return new Blob([new Uint8Array(output)], { type: 'video/mp4' })
  } finally {
    canvas.width = canvas.height = 0
    for (const file of files) {
      try { core.FS.unlink(file) } catch { /* Encoding can fail before output exists. */ }
    }
    // The owner terminates this worker on success, failure, timeout and cancel,
    // releasing the entire WebAssembly heap, not just its virtual files.
  }
}
