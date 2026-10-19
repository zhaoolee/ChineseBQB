import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportGif } from '../lib/gif-export'
import { collectPatches } from '../lib/plan'
import { canvasToImage, downloadBlob, editedDownloadName, inheritedStillExport, paintComposite } from '../lib/paint'
import { editor } from '../state/editor-store'
import { useEditor } from './use-editor'

export function ExportActions() {
  const state = useEditor()
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const exportLock = useRef(false)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const editable = Boolean(state.image?.imageData)
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
    const patches = collectPatches(latest.history.present.blocks, image.imageData)
    return exportGif(frames, patches, latest.history.present.freeTexts)
  }

  const exportButton = (
    <button
      type="button"
      className="primary"
      disabled={!editable || exporting || state.ocrStatus === 'loading'}
      onClick={() => {
        if (exportLock.current) return
        exportLock.current = true
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
          setMessage(gifExport ? '已开始下载，每一帧都带上了改字。' : '已开始下载。')
        }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : '导出失败')).finally(() => {
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
    ? '这是动图，导出只有当前这一帧。'
    : ''

  return (
    <>
      {previewPane && (state.image || state.imageLoading) && createPortal(<div className="preview-export">{exportButton}</div>, previewPane)}
      {(frameNotice || message) && (
        <div className="export-actions">
          {frameNotice && <p className="warn">{frameNotice}</p>}
          {message && <p className="status" role="status">{message}</p>}
        </div>
      )}
    </>
  )
}
