import { useEffect, useMemo } from 'react'
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
  return (
    <section className="gif-timeline" aria-label="GIF 时间轴">
      <div className="timeline-controls">
        <button type="button" onClick={() => setGifPlaying(!state.gifPlaying)} aria-label={state.gifPlaying ? '暂停 GIF' : '播放 GIF'}>{state.gifPlaying ? '暂停' : '播放'}</button>
        <button type="button" aria-label="上一帧" disabled={index === 0} onClick={() => setGifFrame(index - 1)}>‹</button>
        <button type="button" aria-label="下一帧" disabled={index === frames.length - 1} onClick={() => setGifFrame(index + 1)}>›</button>
        <output aria-live="off">{seconds(timing.starts[index])} / {seconds(timing.total)} · {index + 1}/{frames.length} 帧</output>
        <button type="button" disabled={!active || index === active.start || segments.length >= MAX_SEGMENTS} onClick={splitGifAtPlayhead} title="从当前帧开始建立新片段，之后的改字只作用于该片段">在此分段</button>
      </div>
      <input className="timeline-scrubber" type="range" min={0} max={frames.length - 1} step={1} value={index} onChange={event => setGifFrame(Number(event.target.value))} aria-label="GIF 当前帧" aria-valuetext={`第 ${index + 1} 帧，${seconds(timing.starts[index])}`} />
      <div className="timeline-segments" aria-label="GIF 片段">
        {segments.map((segment, i) => {
          const start = timing.starts[segment.start]
          const end = timing.starts[segment.end] ?? timing.total
          return <button type="button" key={segment.id} aria-label={`片段 ${i + 1}，${seconds(start)} 到 ${seconds(end)}`} aria-pressed={active?.id === segment.id} style={{ flexGrow: end - start }} onClick={() => setGifFrame(segment.start)} title={`${seconds(start)}–${seconds(end)}，改字仅作用于本片段`}>片段 {i + 1}<small>{seconds(start)}–{seconds(end)}</small></button>
        })}
      </div>
    </section>
  )
}
