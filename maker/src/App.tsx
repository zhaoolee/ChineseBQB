import { useEffect, useState } from 'react'
import { AssetPicker } from './components/AssetPicker'
import { EditorCanvas } from './components/EditorCanvas'
import { ExportActions } from './components/ExportActions'
import { ImageToolbar } from './components/ImageToolbar'
import { TextBlocksPanel } from './components/TextBlocksPanel'
import { imageFileFromClipboard } from './lib/clipboard'
import { useEditor } from './components/use-editor'
import { boot, dismissNotice, editor, openLocalFile, redo, siteHome, undo } from './state/editor-store'

export function App() {
  const state = useEditor()
  const [pendingPaste, setPendingPaste] = useState<File | null>(null)
  useEffect(() => { void boot() }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
          <span>Maker</span>
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
            {state.imageLoading && <p className="loading">正在打开原图…</p>}
            <EditorCanvas />
          </div>
        </section>
        <section className="dock" aria-label="选图和改字">
          <AssetPicker />
          <div className="editor">
            <TextBlocksPanel />
          </div>
          <ExportActions />
        </section>
      </main>
    </div>
  )
}
