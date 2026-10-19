import { canvasToPng } from './paint'

/** Always recognize editor pixels, never the original (possibly huge) file. */
export async function prepareOcrInput(image: ImageData): Promise<{ blob: Blob; scaleX: number; scaleY: number }> {
  const edge = Math.max(image.width, image.height)
  const scale = Math.min(640, Math.max(480, edge)) / edge
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const source = document.createElement('canvas')
  const canvas = document.createElement('canvas')
  try {
    source.width = image.width
    source.height = image.height
    const sourceContext = source.getContext('2d')
    if (!sourceContext) throw new Error('浏览器不能读取这张图片的像素。')
    sourceContext.putImageData(image, 0, 0)
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器不能读取这张图片的像素。')
    context.drawImage(source, 0, 0, width, height)
    return { blob: await canvasToPng(canvas), scaleX: width / image.width, scaleY: height / image.height }
  } finally {
    source.width = source.height = 0
    canvas.width = canvas.height = 0
  }
}
