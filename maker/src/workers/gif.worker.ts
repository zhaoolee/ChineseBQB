import { decodeGifFrames } from '../lib/gif'

self.onmessage = (event: MessageEvent<Uint8Array>) => {
  try {
    const result = decodeGifFrames(event.data)
    const transfer = result.frames.map(frame => frame.imageData.data.buffer as ArrayBuffer)
    ;(self as unknown as { postMessage(data: unknown, transfer: Transferable[]): void }).postMessage({ ok: true, result }, transfer)
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'GIF 解码失败' })
  }
}
