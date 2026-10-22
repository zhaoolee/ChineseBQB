import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportWechatSegmentedGif } from '../lib/gif-export'
import { collectPatches } from '../lib/plan'
import { canvasToImage, downloadBlob, editedDownloadName, inheritedStillExport, paintComposite } from '../lib/paint'
import { editor, setGifPlaying, skipOcr } from '../state/editor-store'
import { useEditor } from './use-editor'

export function ExportActions() {
  const state = useEditor()
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const exportLock = useRef(false)
  const successTimer = useRef<number | null>(null)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const editable = Boolean(state.image?.imageData)
  const clearSuccessTimer = () => {
    if (successTimer.current !== null) window.clearTimeout(successTimer.current)
    successTimer.current = null
  }
  useEffect(() => () => clearSuccessTimer(), [])
  useEffect(() => {
    clearSuccessTimer()
    setMessage('')
  }, [state.image?.source.id])
  useEffect(() => {
    setPreviewPane(document.getElementById('preview-pane'))
  }, [])

  const gifExport = Boolean(state.image?.frames && state.image.frames.length > 1)

  async function paintStill() {
    const latest = editor.getState()
    const image = latest.image
    if (!image?.imageData) throw new Error('当前没有可导出的图片。')
    const canvas = document.createElement('canvas')
    paintComposite(
      image.imageData,
      collectPatches(latest.history.present.blocks, image.imageData),
      latest.history.present.freeTexts,
      canvas,
    )
    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      throw new Error('导出尺寸与原图不一致。')
    }
    return canvas
  }

  async function buildGif(): Promise<Blob> {
    const latest = editor.getState()
    const image = latest.image
    const frames = image?.frames
    if (!image?.imageData || !frames || frames.length < 2) throw new Error('当前没有可导出的 GIF。')
    return exportWechatSegmentedGif(frames, latest.history.present)
  }

  const exportButton = (
    <button
      type="button"
      className="primary"
      disabled={!editable || exporting}
      onClick={() => {
        if (exportLock.current) return
        exportLock.current = true
        skipOcr()
        setGifPlaying(false)
        setExporting(true)
        const imageAtStart = editor.getState().image
        const task = gifExport
          ? buildGif().then((blob) => ({ blob, filename: editedDownloadName(imageAtStart?.source.name || 'chinesebqb', 'gif') }))
          : paintStill().then(async (canvas) => {
            const image = imageAtStart
            const still = inheritedStillExport(image?.blob?.type ?? '', image?.source.id ?? '', image?.source.name ?? '')
            try {
              return { blob: await canvasToImage(canvas, still.mime), filename: editedDownloadName(image?.source.name || 'chinesebqb', still.extension) }
            } finally {
              canvas.width = canvas.height = 0
            }
          })
        void task.then(({ blob, filename }) => {
          downloadBlob(blob, filename)
          // 成功只留两三秒短句；错误信息常驻。
          clearSuccessTimer()
          setMessage('已下载')
          successTimer.current = window.setTimeout(() => {
            successTimer.current = null
            setMessage('')
          }, 2500)
        }).catch((error: unknown) => {
          clearSuccessTimer()
          setMessage(error instanceof Error ? error.message : '导出失败')
        }).finally(() => {
          exportLock.current = false
          setExporting(false)
        })
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {exporting ? '导出中…' : '导出'}
    </button>
  )
  const frameNotice = state.image?.source.animated && state.image.imageData && !gifExport
    ? '动图仅导出当前帧。'
    : ''

  return (
    <>
      {previewPane && (state.image || state.imageLoading) && createPortal(<div className="preview-export">{exportButton}</div>, previewPane)}
      {(frameNotice || message) && (
        <div className="export-actions">
          {frameNotice && <p className="warn">{frameNotice}</p>}
          {message && <p className="status export-toast" role="status">{message}</p>}
        </div>
      )}
    </>
  )
}
