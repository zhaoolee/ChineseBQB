import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportGifInWorker } from '../lib/gif-export-worker'
import type { EditableExportInput, GifExportProgress } from '../lib/gif-export'
import { downloadBlob, editedDownloadName, extensionForMime } from '../lib/paint'
import { clipboardErrorMessage, writeClipboardImage } from '../lib/clipboard-write'
import { editor, setGifPlaying, skipOcr, type EditorSnapshot } from '../state/editor-store'
import { useEditor } from './use-editor'
import { ExportFeedback, type ExportAction, type ExportResult } from './ExportFeedback'

export function ExportActions() {
  const state = useEditor()
  const [result, setResult] = useState<ExportResult | null>(null)
  const [closing, setClosing] = useState(false)
  const [wechatFit, setWechatFit] = useState(true)
  const [action, setAction] = useState<ExportAction | null>(null)
  const [delivering, setDelivering] = useState(false)
  const [progress, setProgress] = useState<GifExportProgress | null>(null)
  const exportLock = useRef(false)
  // controller 既作为 GIF 的取消信号，也作为任务身份：旧任务的 finally 不会解开新任务的锁。
  const abortRef = useRef<AbortController | null>(null)
  const successTimer = useRef<number | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null)
  const editable = Boolean(state.image?.imageData)
  const sourceIdentity = state.image?.frames ?? state.image?.imageData
  const busy = action !== null
  const clearSuccessTimer = () => {
    if (successTimer.current !== null) window.clearTimeout(successTimer.current)
    successTimer.current = null
  }
  function releaseExport() {
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
    exportLock.current = false
    setAction(null)
    setDelivering(false)
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
    setResult(null)
    setClosing(false)
    releaseExport()
    // 换源即丢弃旧任务：旧进度/成功被忽略，锁交还给新图。
  }, [sourceIdentity])
  useEffect(() => {
    setPreviewPane(document.getElementById('preview-pane'))
  }, [])

  const animated = Boolean(state.image?.frames && state.image.frames.length > 1)

  function closeFeedback() {
    clearSuccessTimer()
    setClosing(true)
    successTimer.current = window.setTimeout(() => {
      successTimer.current = null
      setResult(null)
      setClosing(false)
    }, 180)
  }

  function showResult(next: ExportResult) {
    clearSuccessTimer()
    setClosing(false)
    setResult(next)
    if (next.tone !== 'error') successTimer.current = window.setTimeout(closeFeedback, 2400)
  }

  async function buildExport(snapshot: EditorSnapshot, controller: AbortController, fitWechat: boolean, kind: ExportAction): Promise<Blob> {
    const image = snapshot.image
    if (!image?.imageData) throw new Error('当前没有可导出的图片。')
    let input: EditableExportInput
    if (kind === 'copy' && !fitWechat) {
      const source = image.blob ? { source: image.blob } : { imageData: image.imageData }
      input = { ...source, mode: 'clipboard', fitWechat, frameIndex: snapshot.gifFrameIndex,
        editWidth: image.imageData.width, editHeight: image.imageData.height }
    } else if (!fitWechat) {
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

  function startExport(kind: ExportAction, trigger: HTMLElement) {
    if (exportLock.current || !editor.getState().image?.imageData) return
    triggerRef.current = trigger
    // 锁定选择：导出期间禁用复选框，本次任务只使用开始时的模式。
    const fitWechat = wechatFit
    exportLock.current = true
    clearSuccessTimer()
    setResult(null)
    setClosing(false)
    setProgress(null)
    skipOcr()
    setGifPlaying(false)
    setAction(kind)
    setDelivering(false)
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
    const checkCurrent = () => {
      if (!current() || stale() || controller.signal.aborted) throw new DOMException('已取消操作', 'AbortError')
    }
    let size = 0
    const createImage = () => buildExport(snapshot, controller, fitWechat, kind).then(blob => {
      checkCurrent()
      size = blob.size
      setDelivering(true)
      return blob
    })
    // Call write() synchronously in this click handler. The ClipboardItem waits
    // for the worker's image promise, preserving Safari's transient activation.
    const task = kind === 'copy'
      ? writeClipboardImage(createImage, controller.signal, fitWechat ? 'image/gif' : 'image/png')
      : createImage().then(blob => {
        checkCurrent()
        downloadBlob(blob, editedDownloadName(imageAtStart?.source.name || 'chinesebqb',
          fitWechat ? 'gif' : extensionForMime(blob.type)))
      })
    void task.then(() => {
      if (!current() || stale() || controller.signal.aborted) return
      showResult({ tone: 'success', title: kind === 'copy' ? '已复制到剪贴板' : '图片已下载',
        detail: kind === 'copy'
          ? (fitWechat ? '已复制 GIF 图片，可粘贴到支持 GIF 的应用。'
            : animated ? '已复制当前帧（PNG 静态图），可以粘贴到聊天或其他应用。' : '已复制 PNG 图片，可以粘贴到聊天或其他应用。')
          : `下载文件已生成 · ${Math.max(1, Math.round(size / 1000))} KB` })
    }).catch((error: unknown) => {
      if (!current() || stale()) return
      const cancelled = controller.signal.aborted || error instanceof DOMException && error.name === 'AbortError'
      // Permission denial may arrive while the worker is still encoding.
      controller.abort()
      if (cancelled) {
        showResult({ tone: 'cancelled', title: '已取消', detail: '修改已保留，可以随时重试。' })
        return
      }
      showResult({ tone: 'error', title: kind === 'copy' ? '复制失败' : '下载失败',
        detail: kind === 'copy' ? clipboardErrorMessage(error) : error instanceof Error ? error.message : '请重试。' })
    }).finally(() => {
      if (!current()) return
      abortRef.current = null
      exportLock.current = false
      setAction(null)
      setDelivering(false)
      setProgress(null)
    })
  }

  function cancelExport() {
    // 不在这里清空 abortRef：交给 finally 按 controller 身份解锁，避免旧任务提前释放新任务。
    abortRef.current?.abort()
  }

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
      onClick={event => startExport('download', event.currentTarget)}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      下载
    </button>
  )
  const copyButton = (
    <button type="button" className="export-copy" disabled={!editable || busy} onClick={event => startExport('copy', event.currentTarget)} title={wechatFit ? '复制 GIF 表情（需浏览器支持）' : '复制 PNG 静态图，动图复制当前帧'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </svg>
      复制
    </button>
  )
  const frameNotice = state.image?.source.animated && state.image.imageData && !animated
    ? '动图仅导出当前帧。'
    : ''

  return (
    <>
      {previewPane && (state.image || state.imageLoading) && createPortal(
        <div className="preview-export">{fitWechatToggle}{copyButton}{exportButton}</div>,
        previewPane,
      )}
      {frameNotice && <div className="export-actions"><p className="warn">{frameNotice}</p></div>}
      <ExportFeedback action={action} progress={progress} delivering={delivering} result={result} closing={closing}
        onCancel={cancelExport} onClose={closeFeedback} restoreFocus={triggerRef} />
    </>
  )
}
