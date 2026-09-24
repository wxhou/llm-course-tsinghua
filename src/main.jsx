import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { Agentation } from 'agentation'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* 开发期视觉反馈工具条：仅 dev bundle 包含（import.meta.env.DEV 为 Vite 惯用法，构建时树摇掉） */}
    {import.meta.env.DEV && <Agentation />}
  </React.StrictMode>,
)
