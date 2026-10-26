import { exportEditableSource, type EditableExportInput } from '../lib/gif-export'
import type { TimedEdits } from '../lib/timeline'

self.onmessage = async (event: MessageEvent<{ input: EditableExportInput; edits: TimedEdits }>) => {
  try {
    const { input, edits } = event.data
    const blob = await exportEditableSource(input, edits, {
      onProgress: progress => self.postMessage({ progress }),
    }, () => new OffscreenCanvas(1, 1) as unknown as HTMLCanvasElement)
    self.postMessage({ blob })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'GIF 导出失败' })
  }
}
