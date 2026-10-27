import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { GifExportProgress } from '../lib/gif-export'

export type ExportAction = 'copy' | 'download'
export type ExportResult = { tone: 'success' | 'error' | 'cancelled'; title: string; detail: string }

type Props = {
  action: ExportAction | null
  progress: GifExportProgress | null
  delivering: boolean
  result: ExportResult | null
  closing: boolean
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

export function ExportFeedback({ action, progress, delivering, result, closing, onCancel, onClose, restoreFocus }: Props) {
  const ref = useRef<HTMLElement>(null)
  const open = action !== null || result !== null
  useModalFocus(ref, open, restoreFocus)
  if (!open) return null
  const working = action !== null
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
        aria-describedby="export-feedback-detail"
        aria-busy={working}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault()
            if (!working) onClose()
            else if (!delivering) onCancel()
          }
          if (event.key === 'Tab') {
            // The dialog has one action; keep keyboard interaction within it.
            event.preventDefault()
            const button = ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
            if (button) button.focus()
            else ref.current?.focus()
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
        ) : <button type="button" className="export-dialog-action" onClick={onClose}>知道了</button>}
      </section>
    </div>, document.body,
  )
}
