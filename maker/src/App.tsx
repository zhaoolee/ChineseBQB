import { useEffect, useState } from 'react'
import { AssetPicker } from './components/AssetPicker'
import { EditorCanvas } from './components/EditorCanvas'
import { ExportActions } from './components/ExportActions'
import { ImageToolbar } from './components/ImageToolbar'
import { GifTimeline } from './components/GifTimeline'
import { TextBlocksPanel } from './components/TextBlocksPanel'
import { afterFirstPaint } from './lib/after-first-paint'
import { imageFileFromClipboard } from './lib/clipboard'
import { scheduleOcrWarmup } from './lib/ocr-worker-client'
import { useEditor } from './components/use-editor'
import { boot, dismissNotice, editor, makerHome, openLocalFile, redo, siteHome, undo } from './state/editor-store'

export function App() {
  const state = useEditor()
  const [pendingPaste, setPendingPaste] = useState<File | null>(null)
  useEffect(() => {
    let stopped = false
    let stopWarmup: (() => void) | null = null
    const cancelBoot = afterFirstPaint(() => {
      if (stopped) return
      void (async () => {
        try {
          await boot()
        } catch {
          // Failures are already surfaced through the catalog/image state.
        }
        if (stopped) return
        // Browsing alone should not download OCR weights alongside thumbnails.
        // Opening an image starts OCR directly; other interactions can prewarm it.
        stopWarmup = scheduleOcrWarmup({ afterInteraction: true })
      })()
    })
    return () => {
      stopped = true
      cancelBoot()
      stopWarmup?.()
    }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'Escape' && pendingPaste) {
        setPendingPaste(null)
        return
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingPaste])
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFileFromClipboard(event.clipboardData)
      if (!file) return
      event.preventDefault()
      const current = editor.getState()
      if (current.image || current.imageLoading) {
        setPendingPaste(file)
        return
      }
      void openLocalFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  return (
    <div className="maker-app">
      <header className="topbar">
        <div className="brand">
          <a href={siteHome()}>ChineseBQB</a>
          <a className="brand-maker" href={makerHome()}>Maker</a>
        </div>
        <div id="header-actions" className="header-actions" />
      </header>
      {state.notice && <div className="banner"><span>{state.notice}</span><button type="button" onClick={dismissNotice}>知道了</button></div>}
      {pendingPaste && (
        <div className="paste-confirm" role="presentation" onClick={() => setPendingPaste(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="paste-confirm-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="paste-confirm-title">要放弃当前这张图吗？</h2>
            <p>剪贴板里有一张新图片。放弃后会改去编辑新的；不放弃就继续编辑现在这张。</p>
            <div className="row">
              <button type="button" onClick={() => setPendingPaste(null)}>不放弃</button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const file = pendingPaste
                  setPendingPaste(null)
                  void openLocalFile(file)
                }}
              >
                放弃
              </button>
            </div>
          </section>
        </div>
      )}
      {state.imageError && <div className="banner warn">{state.imageError}</div>}
      <main className="workspace">
        <section className="canvas-pane">
          <ImageToolbar />
          <div className="preview-frame" id="preview-pane">
            <EditorCanvas />
          </div>
        </section>
        <section className="dock" aria-label="选图和改字">
          <AssetPicker />
          <GifTimeline />
          <div className="editor">
            <TextBlocksPanel />
          </div>
          <ExportActions />
        </section>
      </main>
    </div>
  )
}
