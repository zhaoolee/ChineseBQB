import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/maker.css'

const root = document.querySelector('#root')
if (!root) throw new Error('缺少应用根节点')
createRoot(root).render(<StrictMode><App /></StrictMode>)
