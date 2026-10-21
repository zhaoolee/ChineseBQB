import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { waitForAppStyles } from './lib/app-styles'
import './styles/maker.css'

const root = document.querySelector('#root')
if (!root) throw new Error('缺少应用根节点')

// Production extracts maker.css into an async stylesheet. Keep the inline boot
// skeleton until those rules are applied so React never paints unstyled. In dev
// the marker is absent and this settles immediately.
void waitForAppStyles().then(() => {
  createRoot(root).render(<StrictMode><App /></StrictMode>)
})
