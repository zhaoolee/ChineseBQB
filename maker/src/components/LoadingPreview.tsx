import { useState } from 'react'

type LoadingPhase = 'download' | 'decode'

type Props = {
  src?: string
  name?: string
  phase: LoadingPhase
  /** Overrides the status line, e.g. while the asset index is still loading. */
  label?: string
}

const PHASE_TEXT: Record<LoadingPhase, string> = {
  download: '正在载入原图…',
  decode: '正在准备编辑…',
}

/**
 * 打开图片期间的纯展示预览：先显示父组件已缓存的原图/缩略图，底部浮层只报告阶段。
 * 不请求任何额外资源，不接管点击；加载失败时隐藏破图但保留状态文字。
 */
export function LoadingPreview({ src, name, phase, label }: Props) {
  const [failed, setFailed] = useState<{ src: string; name?: string } | null>(null)
  // src/name 变化即视为新的加载，失败状态在本次渲染中直接失效，无需副作用。
  const broken = failed !== null && failed.src === src && failed.name === name
  const status = label ?? (src ? PHASE_TEXT[phase] : '正在打开图片…')
  const alt = name ? `${name}预览` : '预览'

  return (
    <div className="stage loading-preview" aria-busy="true">
      {src && !broken && (
        <img
          className="loading-preview-image"
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setFailed({ src, name })}
        />
      )}
      <div className={src ? 'loading-preview-status' : 'loading-preview-status is-centered'} role="status" aria-live="polite">
        <span className="loading-preview-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="loading-preview-text">{status}</span>
      </div>
    </div>
  )
}
