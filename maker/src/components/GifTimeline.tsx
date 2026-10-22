import { useEffect, useMemo, useRef } from 'react'
import { frameTimes, MAX_SEGMENTS, segmentAtFrame } from '../lib/timeline'
import { editor, setGifFrame, setGifPlaying, splitGifAtPlayhead } from '../state/editor-store'
import { useEditor } from './use-editor'

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`

export function GifTimeline() {
  const state = useEditor()
  const frames = state.image?.frames
  const index = state.gifFrameIndex
  const timing = useMemo(() => frameTimes(frames ?? []), [frames])
  const segments = state.history.present.segments ?? []
  const active = segmentAtFrame(segments, index)
  const more = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!state.gifPlaying || !frames?.length) return
    const timer = window.setTimeout(() => setGifFrame((index + 1) % frames.length, true), frames[index].delayMs)
    return () => window.clearTimeout(timer)
  }, [state.gifPlaying, frames, index])
  useEffect(() => {
    const pause = () => { if (editor.getState().gifPlaying) setGifPlaying(false) }
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('pagehide', pause)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('pagehide', pause); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  if (!frames || frames.length < 2) return null
  const closeMore = () => { if (more.current) more.current.open = false }
  const goTo = (next: number) => { setGifFrame(next); closeMore() }
  return (
    <section className="gif-timeline" aria-label="GIF 时间轴">
      <div className="timeline-row">
        <button
          type="button"
          className="timeline-play"
          onClick={() => setGifPlaying(!state.gifPlaying)}
          aria-label={state.gifPlaying ? '暂停 GIF' : '播放 GIF'}
          title={state.gifPlaying ? '暂停' : '播放'}
        >
          {state.gifPlaying ? (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
              <rect x="7" y="5" width="4" height="14" rx="1" />
              <rect x="13" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          )}
        </button>
        <input
          className="timeline-scrubber"
          type="range"
          min={0}
          max={frames.length - 1}
          step={1}
          value={index}
          onChange={event => setGifFrame(Number(event.target.value))}
          aria-label="GIF 当前帧"
          aria-valuetext={`第 ${index + 1} 帧，${seconds(timing.starts[index])}`}
        />
        <output className="timeline-time" aria-live="off">{seconds(timing.starts[index])} / {seconds(timing.total)}</output>
        <details className="timeline-more" ref={more}>
          <summary aria-label="更多时间轴操作" title="更多时间轴操作">…</summary>
          <div className="timeline-more-body">
            <div className="timeline-more-row">
              <button type="button" aria-label="上一帧" disabled={index === 0} onClick={() => goTo(index - 1)}>上一帧</button>
              <button type="button" aria-label="下一帧" disabled={index === frames.length - 1} onClick={() => goTo(index + 1)}>下一帧</button>
              <button
                type="button"
                disabled={!active || index === active.start || segments.length >= MAX_SEGMENTS}
                title="从当前帧开始建立新片段，之后的改字只作用于该片段"
                onClick={() => { splitGifAtPlayhead(); closeMore() }}
              >
                在此分段
              </button>
            </div>
            {segments.length > 1 && (
              <div className="timeline-segments" aria-label="GIF 片段">
                {segments.map((segment, i) => {
                  const start = timing.starts[segment.start]
                  const end = timing.starts[segment.end] ?? timing.total
                  return (
                    <button
                      type="button"
                      key={segment.id}
                      aria-label={`片段 ${i + 1}，${seconds(start)} 到 ${seconds(end)}`}
                      aria-pressed={active?.id === segment.id}
                      onClick={() => goTo(segment.start)}
                    >
                      片段 {i + 1}<small>{seconds(start)}–{seconds(end)}</small>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </details>
      </div>
    </section>
  )
}
