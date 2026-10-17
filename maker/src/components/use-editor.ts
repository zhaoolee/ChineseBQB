import { useSyncExternalStore } from 'react'
import { editor } from '../state/editor-store'

export function useEditor() {
  return useSyncExternalStore(editor.subscribe, editor.getState, editor.getState)
}
