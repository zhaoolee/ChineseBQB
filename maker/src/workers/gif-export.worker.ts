import { createEditableGifFrames } from '../lib/gif'
import { exportWechatSegmentedGif } from '../lib/gif-export'
import type { TimedEdits } from '../lib/timeline'

self.onmessage = async (event: MessageEvent<{ source: Blob; edits: TimedEdits }>) => {
  try {
    const { source, edits } = event.data
    const { frames } = createEditableGifFrames(new Uint8Array(await source.arrayBuffer()))
    const blob = await exportWechatSegmentedGif(frames, edits, {
      onProgress: progress => self.postMessage({ progress }),
    }, () => new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement)
    self.postMessage({ blob })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'GIF 导出失败' })
  }
}
