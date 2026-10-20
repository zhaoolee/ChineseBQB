export const OCR_STAGES = ['prepare', 'resources', 'initialize', 'recognize', 'finish'] as const
export type OcrStage = typeof OCR_STAGES[number]
export type OcrProgress = { stage: OcrStage }
export type OcrProgressListener = (progress: OcrProgress) => void

export function isOcrProgress(value: unknown): value is OcrProgress {
  return Boolean(value && typeof value === 'object' && 'stage' in value
    && OCR_STAGES.includes((value as OcrProgress).stage))
}
