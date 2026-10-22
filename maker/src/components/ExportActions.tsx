import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportGifInWorker } from '../lib/gif-export-worker'
import { collectPatches } from '../lib/plan'
import { canvasToImage, downloadBlob, editedDownloadName, inheritedStillExport, paintComposite } from '../lib/paint'
import { editor, setGifPlaying, skipOcr, type EditorSnapshot } from '../state/editor-store'
import { useEditor } from './use-editor'

type ExportKind = 'still' | 'gif'
type ExportProgress = { stage: 'prepare' | 'encode'; completed: number; total: number }

export function ExportActions() {
  const state = useEditor()
  const [message, setMessage] = useState('')
  const [exporting, setExporting] = useState<ExportKind | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const exportLock = useRef(false)
  // controller 既作为 GIF 的取消信号，也作为任务身份：旧任务的 finally 不会解开新任务的锁。
  const abortRef = useRef<AbortController | null>(null)
  const successTimer = useRef<number | null>(null)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const editable = Boolean(state.image?.imageData)
  const sourceIdentity = state.image?.frames ?? state.image?.imageData
  const busy = exporting !== null
  const clearSuccessTimer = () => {
    if (successTimer.current !== null) window.clearTimeout(successTimer.current)
    successTimer.current = null
  }
  function releaseExport() {
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
    exportLock.current = false
    setExporting(null)
    setProgress(null)
  }
  useEffect(() => () => {
    clearSuccessTimer()
    // 卸载时先撤掉身份再 abort，旧任务的回调不会再碰状态。
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
  }, [])
  useEffect(() => {
    clearSuccessTimer()
    setMessage('')
    releaseExport()
    // 换源即丢弃旧任务：旧进度/成功被忽略，锁交还给新图。
  }, [sourceIdentity])
  useEffect(() => {
    setPreviewPane(document.getElementById('preview-pane'))
  }, [])

  const gifExport = Boolean(state.image?.frames && state.image.frames.length > 1)

  async function paintStill(snapshot: EditorSnapshot) {
    const image = snapshot.image
    if (!image?.imageData) throw new Error('当前没有可导出的图片。')
    const canvas = document.createElement('canvas')
    paintComposite(
      image.imageData,
      collectPatches(snapshot.history.present.blocks, image.imageData),
      snapshot.history.present.freeTexts,
      canvas,
    )
    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      throw new Error('导出尺寸与原图不一致。')
    }
    return canvas
  }

  async function buildGif(snapshot: EditorSnapshot, controller: AbortController): Promise<Blob> {
    const image = snapshot.image
    const frames = image?.frames
    if (!image?.imageData || !frames || frames.length < 2) throw new Error('当前没有可导出的 GIF。')
    const source = image.blob
    if (!source) throw new Error('缺少原始文件，无法导出 GIF。')
    return exportGifInWorker(source, snapshot.history.present, {
      signal: controller.signal,
      onProgress: (next) => {
        if (abortRef.current !== controller || controller.signal.aborted) return
        setProgress({ stage: next.stage, completed: next.completed, total: next.total })
      },
    })
  }

  function startExport(kind: ExportKind) {
    if (exportLock.current) return
    exportLock.current = true
    clearSuccessTimer()
    setMessage('')
    setProgress(null)
    skipOcr()
    setGifPlaying(false)
    setExporting(kind)
    const controller = new AbortController()
    // 静图也占用同一个 controller 作为任务身份，只有 GIF 会把 signal 传进 worker。
    abortRef.current = controller
    // 只在开始时取一次快照：中途换图/改字不会把旧结果下载到新图名下。
    const snapshot = editor.getState()
    const imageAtStart = snapshot.image
    // 用帧数组（GIF）或像素数据（静图）的身份判断源是否已换，而不是只看文件名。
    const framesAtStart = imageAtStart?.frames ?? null
    const imageDataAtStart = imageAtStart?.imageData ?? null
    const stale = () => {
      const image = editor.getState().image
      return framesAtStart
        ? (image?.frames ?? null) !== framesAtStart
        : (image?.imageData ?? null) !== imageDataAtStart
    }
    // 只有当前 controller 仍持有导出权时，才允许旧任务改状态。
    const current = () => abortRef.current === controller
    const task = kind === 'gif'
      ? buildGif(snapshot, controller).then((blob) => ({
        blob,
        filename: editedDownloadName(imageAtStart?.source.name || 'chinesebqb', 'gif'),
        label: `已下载 · ${Math.max(1, Math.round(blob.size / 1000))} KB`,
      }))
      : paintStill(snapshot).then(async (canvas) => {
        const image = imageAtStart
        const still = inheritedStillExport(image?.blob?.type ?? '', image?.source.id ?? '', image?.source.name ?? '')
        try {
          const blob = await canvasToImage(canvas, still.mime)
          return { blob, filename: editedDownloadName(image?.source.name || 'chinesebqb', still.extension), label: '已下载' }
        } finally {
          canvas.width = canvas.height = 0
        }
      })
    void task.then(({ blob, filename, label }) => {
      if (!current() || stale()) return
      downloadBlob(blob, filename)
      // 成功只留两三秒短句；错误信息常驻。
      clearSuccessTimer()
      setMessage(label)
      successTimer.current = window.setTimeout(() => {
        successTimer.current = null
        setMessage('')
      }, 2500)
    }).catch((error: unknown) => {
      if (!current() || stale()) return
      clearSuccessTimer()
      // 主动取消不是失败，只给一句可恢复的提示。
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('已取消导出')
        return
      }
      setMessage(error instanceof Error ? error.message : '导出失败')
    }).finally(() => {
      if (!current()) return
      abortRef.current = null
      exportLock.current = false
      setExporting(null)
      setProgress(null)
    })
  }

  function cancelExport() {
    // 不在这里清空 abortRef：交给 finally 按 controller 身份解锁，避免旧任务提前释放新任务。
    abortRef.current?.abort()
  }

  const progressLabel = progress
    ? `${progress.stage === 'prepare' ? '处理画面' : '压缩中'} ${progress.completed}/${progress.total}`
    : ''
  const exportLabel = !busy
    ? '导出'
    : exporting === 'gif'
      ? (progressLabel || '压缩中…')
      : '导出中…'
  const exportButton = (
    <button
      type="button"
      className="primary"
      disabled={!editable || busy}
      onClick={() => startExport(gifExport ? 'gif' : 'still')}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {exportLabel}
    </button>
  )
  const cancelButton = exporting === 'gif'
    ? (
      <button type="button" className="export-cancel" onClick={cancelExport}>
        取消导出
      </button>
    )
    : null
  const frameNotice = state.image?.source.animated && state.image.imageData && !gifExport
    ? '动图仅导出当前帧。'
    : ''

  return (
    <>
      {previewPane && (state.image || state.imageLoading) && createPortal(
        <div className="preview-export">{exportButton}{cancelButton}</div>,
        previewPane,
      )}
      {(frameNotice || message || (busy && progressLabel)) && (
        <div className="export-actions">
          {frameNotice && <p className="warn">{frameNotice}</p>}
          {busy && progressLabel && (
            <p className="status export-progress" role="status" aria-live="polite">{progressLabel}</p>
          )}
          {message && <p className="status export-toast" role="status">{message}</p>}
        </div>
      )}
    </>
  )
}
