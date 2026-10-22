import { validateGif } from '../lib/gif'

// Validate metadata and limits only, then hand the compressed bytes back to the
// page. Frames are decoded lazily on the main thread, so the worker never holds
// RGBA buffers and stays short-lived.
self.onmessage = (event: MessageEvent<Uint8Array>) => {
  const sourceBytes = event.data instanceof Uint8Array ? event.data : new Uint8Array(event.data as ArrayBuffer)
  try {
    validateGif(sourceBytes)
    ;(self as unknown as { postMessage(data: unknown, transfer: Transferable[]): void }).postMessage({ ok: true, sourceBytes }, [sourceBytes.buffer as ArrayBuffer])
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'GIF 解码失败' })
  }
}
