import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

const KEY_STEP = 1
const KEY_STEP_LARGE = 10

/**
 * 编辑前后的拖动对比层。作为绝对定位 overlay 嵌在 .sheet 里：
 * 左侧用内部 canvas 画原图，右侧直接透出父组件已绘制的编辑后 canvas。
 * 只负责分界位置，不改编辑状态、不触发下载。
 */
export function BeforeAfter({ imageData }: { imageData: ImageData }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragging = useRef(false)
  const [position, setPosition] = useState(50)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // 尺寸只在变化时设置，GIF 换帧时不重置 canvas 尺寸。
    if (canvas.width !== imageData.width) canvas.width = imageData.width
    if (canvas.height !== imageData.height) canvas.height = imageData.height
    const context = canvas.getContext('2d')
    if (!context) return
    context.putImageData(imageData, 0, 0)
  }, [imageData])

  function clampPosition(value: number) {
    return Math.min(100, Math.max(0, value))
  }

  function moveTo(clientX: number) {
    const overlay = overlayRef.current
    if (!overlay) return
    const bounds = overlay.getBoundingClientRect()
    if (bounds.width < 1) return
    setPosition(clampPosition(((clientX - bounds.left) / bounds.width) * 100))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // 阻止冒泡，避免父级 .sheet 把这次按下当成编辑选框的拖动。
    event.stopPropagation()
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    event.currentTarget.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true })
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    moveTo(event.clientX)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    event.stopPropagation()
    moveTo(event.clientX)
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    event.stopPropagation()
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = position - step
        break
      case 'ArrowRight':
        next = position + step
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = 100
        break
      default:
        return
    }
    event.preventDefault()
    event.stopPropagation()
    setPosition(clampPosition(next))
  }

  return (
    <div
      ref={overlayRef}
      className="compare-overlay"
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={() => { dragging.current = false }}
      onDragStart={(event) => event.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="compare-original"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      />
      <span className="compare-label before">修改前</span>
      <span className="compare-label after">修改后</span>
      <div className="compare-divider" style={{ left: `${position}%` }}>
        <div
          className="compare-handle"
          role="slider"
          tabIndex={0}
          aria-label="修改前后分界"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(position)}%`}
          onKeyDown={handleKeyDown}
        >
          ↔
        </div>
      </div>
    </div>
  )
}
