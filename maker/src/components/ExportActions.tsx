import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportGifInWorker } from '../lib/gif-export-worker'
import type { EditableExportInput, GifExportProgress } from '../lib/gif-export'
import { downloadBlob, editedDownloadName, extensionForMime } from '../lib/paint'
import { editor, setGifPlaying, skipOcr, type EditorSnapshot } from '../state/editor-store'
import { useEditor } from './use-editor'

export function ExportActions() {
  const state = useEditor()
  const [message, setMessage] = useState('')
  const [wechatFit, setWechatFit] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<GifExportProgress | null>(null)
  const exportLock = useRef(false)
  // controller 既作为 GIF 的取消信号，也作为任务身份：旧任务的 finally 不会解开新任务的锁。
  const abortRef = useRef<AbortController | null>(null)
  const successTimer = useRef<number | null>(null)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const editable = Boolean(state.image?.imageData)
  const sourceIdentity = state.image?.frames ?? state.image?.imageData
  const busy = exporting
  const clearSuccessTimer = () => {
    if (successTimer.current !== null) window.clearTimeout(successTimer.current)
    successTimer.current = null
  }
  function releaseExport() {
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
    exportLock.current = false
    setExporting(false)
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

  const animated = Boolean(state.image?.frames && state.image.frames.length > 1)

  async function buildExport(snapshot: EditorSnapshot, controller: AbortController, fitWechat: boolean): Promise<Blob> {
    const image = snapshot.image
    if (!image?.imageData) throw new Error('当前没有可导出的图片。')
    let input: EditableExportInput
    if (!fitWechat) {
      if (!image.blob) throw new Error('缺少原始文件，无法导出。')
      // 未勾选时以原始压缩文件为准：静图缩到 1600 的只是编辑预览，
      // 动态 GIF 仍由 Worker 按原尺寸懒解码。
      input = { mode: 'native', source: image.blob, editWidth: image.imageData.width, editHeight: image.imageData.height }
    } else if (image.frames && image.frames.length > 1) {
      if (!image.blob) throw new Error('缺少原始文件，无法导出 GIF。')
      // 动画继续使用压缩原文件，Worker 内按原尺寸懒解码，保留原时序与压缩策略。
      input = { source: image.blob }
    } else {
      // 静图（含单帧 GIF）直接使用编辑画布像素，避免重新解码出与画布不同的尺寸。
      input = { imageData: image.imageData }
    }
    return exportGifInWorker(input, snapshot.history.present, {
      signal: controller.signal,
      onProgress: (next) => {
        if (abortRef.current !== controller || controller.signal.aborted) return
        setProgress({ stage: next.stage, completed: next.completed, total: next.total })
      },
    })
  }

  function startExport() {
    if (exportLock.current) return
    // 锁定选择：导出期间禁用复选框，本次任务只使用开始时的模式。
    const fitWechat = wechatFit
    exportLock.current = true
    clearSuccessTimer()
    setMessage('')
    setProgress(null)
    skipOcr()
    setGifPlaying(false)
    setExporting(true)
    const controller = new AbortController()
    // 只有当前 controller 仍持有导出权时，才允许旧任务改状态。
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
    const current = () => abortRef.current === controller
    const task = buildExport(snapshot, controller, fitWechat).then((blob) => ({
      blob,
      filename: editedDownloadName(
        imageAtStart?.source.name || 'chinesebqb',
        fitWechat ? 'gif' : extensionForMime(blob.type),
      ),
      label: `已下载 · ${Math.max(1, Math.round(blob.size / 1000))} KB`,
    }))
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
      setExporting(false)
      setProgress(null)
    })
  }

  function cancelExport() {
    // 不在这里清空 abortRef：交给 finally 按 controller 身份解锁，避免旧任务提前释放新任务。
    abortRef.current?.abort()
  }

  const progressLabel = progress
    ? `${progress.stage === 'prepare' ? '处理画面' : progress.stage === 'motion' ? '优化流畅度' : '压缩中'} ${progress.completed}/${progress.total}`
    : ''
  const exportLabel = !busy ? '下载' : (progressLabel || '导出中…')
  const fitWechatToggle = (
    <label className="export-fit">
      <input
        type="checkbox"
        checked={wechatFit}
        disabled={busy}
        onChange={(event) => setWechatFit(event.target.checked)}
      />
      <span>适配微信表情</span>
    </label>
  )
  const exportButton = (
    <button
      type="button"
      className="primary"
      disabled={!editable || busy}
      onClick={startExport}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {exportLabel}
    </button>
  )
  const cancelButton = busy
    ? (
      <button type="button" className="export-cancel" onClick={cancelExport}>
        取消导出
      </button>
    )
    : null
  const frameNotice = state.image?.source.animated && state.image.imageData && !animated
    ? '动图仅导出当前帧。'
    : ''

  return (
    <>
      {previewPane && (state.image || state.imageLoading) && createPortal(
        <div className="preview-export">{fitWechatToggle}{exportButton}{cancelButton}</div>,
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
