import { useEffect, useRef, useState } from 'react'

export type DownloadMode = 'wechat' | 'mp4' | 'native'
type Props = {
  mode: DownloadMode
  onMode: (mode: DownloadMode) => void
  lossless: boolean
  onLossless: (lossless: boolean) => void
  flatten: boolean
  onFlatten: (flatten: boolean) => void
  gif: boolean
  disabled: boolean
}

export function DownloadSettings({ mode, onMode, lossless, onLossless, flatten, onFlatten, gif, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => {
    if (!open) return
    const initial = panel.current?.querySelector<HTMLInputElement>('input:checked:not(:disabled)')
      ?? panel.current?.querySelector<HTMLInputElement>('input:not(:disabled)')
    initial?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div className="download-settings" ref={root} onKeyDown={event => {
    if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <button ref={trigger} type="button" className="download-settings-trigger" aria-label="下载设置" title="下载设置"
      aria-expanded={open} aria-controls="download-settings-panel" aria-haspopup="dialog" disabled={disabled}
      onClick={() => setOpen(value => !value)}>
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9.5 3-.6 2.3-2 .9-2.2-.7-2.5 4.3 1.7 1.6v2.3L2.2 15l2.5 4.3 2.2-.7 2 .9.6 2.3h5l.6-2.3 2-.9 2.2.7 2.5-4.3-1.7-1.6v-2.3l1.7-1.6-2.5-4.3-2.2.7-2-.9L14.5 3z" />
        <circle cx="12" cy="12.4" r="3.2" />
      </svg>
    </button>
    {open && <div ref={panel} id="download-settings-panel" className="download-settings-panel" role="dialog" aria-label="下载设置">
      <div className="download-settings-heading"><strong>下载设置</strong><button type="button" aria-label="关闭下载设置" onClick={close}>×</button></div>
      <div role="radiogroup" aria-label="下载格式" className="download-mode-options">
        <label className="download-mode-option">
          <input type="radio" name="download-mode" value="wechat" checked={mode === 'wechat'} onChange={() => onMode('wechat')} />
          <span><strong>适配微信表情</strong><small>GIF · 自动适配大小与体积</small></span>
        </label>
        <label className={`download-mode-option ${!gif ? 'is-disabled' : ''}`}>
          <input type="radio" name="download-mode" value="mp4" checked={mode === 'mp4'} disabled={!gif} onChange={() => onMode('mp4')} />
          <span><strong>MP4 视频</strong><small>{gif ? '默认高画质兼容 · 可选无损' : '选择 GIF 后可用'}</small></span>
        </label>
      </div>
      {mode === 'mp4' && <div className="download-mp4-options">
        <p>{lossless
          ? '保留原尺寸、完整动画和 RGB 像素，不缩图、不抽帧。'
          : '保留完整动画，不缩图、不抽帧。兼容编码有轻微色彩损失；奇数边长会补 1 像素白边。'}</p>
        <label><input type="checkbox" checked={flatten} onChange={event => onFlatten(event.target.checked)} />透明区域铺白（移除透明度）</label>
        <details>
          <summary>高级选项</summary>
          <label><input type="checkbox" checked={lossless} onChange={event => onLossless(event.target.checked)} />逐像素无损 MP4</label>
        </details>
        {lossless && <p className="warn" role="status">无损模式使用 RGB 编码，iPhone、X 等可能偏色或无法播放。用于手机或社交分享时，请关闭此项。</p>}
      </div>}
      <div className="download-settings-footer">
        <button type="button" className="download-native" onClick={() => { onMode('native'); close() }}>恢复原格式</button>
        <span>{mode === 'native' ? '原尺寸 · 全部帧' : mode === 'wechat' ? '已选：微信 GIF' : lossless ? '已选：无损 MP4' : '已选：兼容 MP4'}</span>
      </div>
    </div>}
  </div>
}
