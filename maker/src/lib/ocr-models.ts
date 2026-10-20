export const OCR_MODEL_FILES = {
  det: 'PP-OCRv5_mobile_det_onnx_infer.tar',
  rec: 'PP-OCRv5_mobile_rec_onnx_infer.tar',
} as const

export function ocrModelUrl(file: string, base = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}models/${file}`
}
