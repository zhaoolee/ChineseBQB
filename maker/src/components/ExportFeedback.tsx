import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { GifExportProgress } from '../lib/gif-export'
import type { FileShareSupport } from '../lib/file-share'

export type ExportAction = 'copy' | 'download'
export type ExportResult = { tone: 'success' | 'error' | 'cancelled'; title: string; detail: string }
export type ExportShareNotice = { tone: 'success' | 'error' | 'cancelled'; detail: string }

type ExportShare = {
  file: File
  support: FileShareSupport
  pending: boolean
  notice: ExportShareNotice | null
}

type Props = {
  action: ExportAction | null
  progress: GifExportProgress | null
  delivering: boolean
  result: ExportResult | null
  closing: boolean
  share: ExportShare | null
  onShare: () => void
  onCancel: () => void
  onClose: () => void
  restoreFocus: RefObject<HTMLElement | null>
}

function useModalFocus(ref: RefObject<HTMLElement | null>, open: boolean, restoreFocus: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const previous = restoreFocus.current ?? document.activeElement as HTMLElement | null
    const app = document.querySelector<HTMLElement>('.maker-app')
    const wasInert = app?.inert ?? false
    const overflow = document.body.style.overflow
    if (app) app.inert = true
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      if (app) app.inert = wasInert
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open, ref, restoreFocus])
}

export function ExportFeedback({ action, progress, delivering, result, closing, share, onShare, onCancel, onClose, restoreFocus }: Props) {
  const ref = useRef<HTMLElement>(null)
  const open = action !== null || result !== null
  const sharing = Boolean(share?.pending)
  useModalFocus(ref, open, restoreFocus)
  // Both actions become disabled while the native sheet is open; keep keyboard focus in the dialog.
  useEffect(() => { if (sharing) ref.current?.focus() }, [sharing])
  if (!open) return null
  const working = action !== null
  const shareStatus = sharing
    ? { tone: 'pending', detail: '正在等待系统分享，请选择目标应用。' }
    : share && !share.support.ok
      ? { tone: 'unavailable', detail: share.support.message }
      : share?.notice
  const stage = delivering ? (action === 'copy' ? '正在写入剪贴板' : '正在准备下载')
    : progress?.stage === 'encode' ? '正在编码图片'
      : progress?.stage === 'motion' ? '正在优化动画流畅度' : '正在合成画面'
  const fraction = progress && progress.total > 0 && !delivering
    ? Math.max(0, Math.min(1, progress.completed / progress.total)) : null
  const title = working ? (action === 'copy' ? '正在复制图片' : '正在生成下载图片') : result!.title
  const detail = working ? stage : result!.detail
  const tone = working ? 'working' : result!.tone

  return createPortal(
    <div className={`export-overlay ${closing ? 'is-closing' : ''}`}>
      <section
        ref={ref}
        className={`export-dialog is-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-feedback-title"
        aria-describedby={`export-feedback-detail${shareStatus ? ' export-share-status' : ''}`}
        aria-busy={working || sharing}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            if (working && !delivering) onCancel()
            else if (!working && !sharing) onClose()
          }
          if (event.key === 'Tab') {
            // Cycle through every enabled action instead of trapping focus on the first one.
            event.preventDefault()
            const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
            if (!buttons.length) { ref.current?.focus(); return }
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            const next = event.shiftKey
              ? (index <= 0 ? buttons.length - 1 : index - 1)
              : (index === -1 || index === buttons.length - 1 ? 0 : index + 1)
            buttons[next].focus()
          }
        }}
      >
        <div className="export-feedback-icon" key={tone} aria-hidden="true">
          {working ? <span className="export-orbit" /> : (
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="32" cy="32" r="27" />
              {tone === 'success' ? <path className="export-check" d="m19 32 9 9 18-19" />
                : tone === 'error' ? <><path d="m24 24 16 16M40 24 24 40" /></>
                  : <path d="M22 32h20" />}
            </svg>
          )}
        </div>
        <p className="export-feedback-eyebrow">{working ? '正在处理，请稍候' : tone === 'success' ? '已完成' : tone === 'error' ? '请再试一次' : '操作已停止'}</p>
        <h2 id="export-feedback-title">{title}</h2>
        <p id="export-feedback-detail" role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">{detail}</p>
        {shareStatus && (
          <p
            id="export-share-status"
            className={`export-share-status is-${shareStatus.tone}`}
            role={shareStatus.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >{shareStatus.detail}</p>
        )}
        {working && (
          <div className="export-meter">
            <div
              className={`export-meter-track ${fraction === null ? 'is-indeterminate' : ''}`}
              role="progressbar"
              aria-label={stage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fraction === null ? undefined : Math.round(fraction * 100)}
              aria-valuetext={fraction === null ? stage : `${stage} ${progress!.completed}/${progress!.total}`}
            ><span style={fraction === null ? undefined : { width: `${fraction * 100}%` }} /></div>
            <span className="export-meter-caption" aria-hidden="true">{fraction === null ? '处理中…' : `${progress!.completed} / ${progress!.total}`}</span>
          </div>
        )}
        {working ? (
          <button type="button" className="export-dialog-action" disabled={delivering} onClick={onCancel}>
            {delivering ? '即将完成…' : '取消'}
          </button>
        ) : (
          <div className="export-dialog-actions">
            {share && (
              <button
                type="button"
                className="export-dialog-action export-dialog-share"
                disabled={sharing || closing || !share.support.ok}
                onClick={onShare}
              >{sharing ? '分享中…' : '分享'}</button>
            )}
            <button type="button" className="export-dialog-action" disabled={sharing || closing} onClick={onClose}>知道了</button>
          </div>
        )}
      </section>
    </div>, document.body,
  )
}
