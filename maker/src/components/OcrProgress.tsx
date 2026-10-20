import { useEffect, useState } from 'react'
import { OCR_STAGES, type OcrProgress, type OcrStage } from '../lib/ocr-progress'

const STAGE_LABELS: Record<OcrStage, string> = {
  prepare: '准备图片',
  resources: '加载识别引擎',
  initialize: '加载并初始化模型',
  recognize: '正在识别文本',
  finish: '整理识别结果',
}

const MODEL_HINT_STAGES: OcrStage[] = ['resources', 'initialize']
const TOTAL_STEPS = OCR_STAGES.length

type Props = {
  progress: OcrProgress | null
  animated: boolean
  frameIndex: number
  frameCount: number
}

/**
 * OCR 进度：只反映真实阶段（5 步），不按时间伪造百分比。
 * 计时器每秒更新，单独放在 live 区域外，避免读屏重复播报。
 */
export function OcrProgressIndicator({ progress, animated, frameIndex, frameCount }: Props) {
  const running = progress !== null
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!running) {
      setElapsedSeconds(0)
      return
    }
    const startedAt = Date.now()
    setElapsedSeconds(0)
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running])

  if (!progress) return null

  const stageIndex = Math.max(0, OCR_STAGES.indexOf(progress.stage))
  const stageLabel = STAGE_LABELS[progress.stage] ?? STAGE_LABELS.prepare
  const stepText = `步骤 ${stageIndex + 1}/${TOTAL_STEPS}`
  const activeStep = 100 / TOTAL_STEPS
  const frameText = frameCount > 1
    ? `仅识别当前帧 ${Math.min(frameIndex + 1, frameCount)}/${frameCount}`
    : '正在识别图片'

  return (
    <div className={animated ? 'ocr-progress is-animated' : 'ocr-progress'} role="group" aria-label="识别进度">
      <div className="ocr-progress-head">
        <span className="ocr-progress-stage" role="status" aria-live="polite">
          <b>{stepText}</b>
          {stageLabel}
        </span>
        <span className="ocr-progress-elapsed" aria-live="off">已用时 {elapsedSeconds} 秒</span>
      </div>
      <div
        className="ocr-progress-track"
        role="progressbar"
        aria-label="识别步骤"
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={stageIndex}
        aria-valuetext={`${stepText}，${stageLabel}`}
      >
        <span className="ocr-progress-done" style={{ width: `${(stageIndex / TOTAL_STEPS) * 100}%` }} />
        <span className="ocr-progress-current" style={{ width: `${activeStep}%` }} />
      </div>
      <p className="ocr-progress-meta">
        <span>{frameText}</span>
        {MODEL_HINT_STAGES.includes(progress.stage) && <span>识别模型正在准备中，请稍候</span>}
      </p>
    </div>
  )
}
