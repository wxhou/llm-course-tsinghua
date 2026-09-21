import { useEffect, useState } from 'react'
import { ALL_ITEMS } from '../content/registry.jsx'

const KEY = id => 'llmcourse-' + id
const EVT = 'llmcourse-progress'

export function ProgressProvider({ children }) {
  // 全局进度通过 window 事件广播，ProgressBox 订阅
  return <>{children}</>
}

export function ProgressBox() {
  const { done, total } = useGlobalProgress()
  const pct = total ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total
  return (
    <div className="progress-box">
      学习进度
      <div className="progress-bar"><div style={{ width: pct + '%' }} /></div>
      <span>{done} / {total} 项完成</span>
      {allDone && <span className="progress-cheer">全部完成 —— 四格作业已通关，去期末造你的考场吧</span>}
    </div>
  )
}

/* 全站 Checklist 完成度：静态注册表 × localStorage（不依赖当前页 DOM，分页下跨页一致） */
export function useGlobalProgress() {
  const [counts, setCounts] = useState({ done: 0, total: ALL_ITEMS.length })
  useEffect(() => {
    const refresh = () => {
      const done = ALL_ITEMS.filter(it => localStorage.getItem(KEY(it.id)) === '1').length
      setCounts({ done, total: ALL_ITEMS.length })
    }
    refresh()
    window.addEventListener(EVT, refresh)
    window.addEventListener('change', refresh)
    return () => { window.removeEventListener(EVT, refresh); window.removeEventListener('change', refresh) }
  }, [])
  return counts
}

export function Checklist({ items }) {
  const [state, setState] = useState(() => items.map(it => localStorage.getItem(KEY(it.id)) === '1'))
  const toggle = i => {
    const next = [...state]
    next[i] = !next[i]
    setState(next)
    localStorage.setItem(KEY(items[i].id), next[i] ? '1' : '0')
    window.dispatchEvent(new Event(EVT))
  }
  return (
    <ul className="check">
      {items.map((it, i) => (
        <li key={it.id}>
          <input type="checkbox" checked={state[i]} onChange={() => toggle(i)} />
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function Quiz({ items }) {
  return (
    <>
      {items.map((q, i) => (
        <details key={i}>
          <summary>{q.q}</summary>
          <p>{q.a}</p>
        </details>
      ))}
    </>
  )
}

export function Resources({ items }) {
  return (
    <div className="res-grid">
      {items.map((r, i) => (
        <div className="res" key={i}>
          <b>{r.href ? <a href={r.href} target="_blank" rel="noreferrer">{r.name}</a> : r.name}</b>
          <span className="why">{r.why}</span>
          <span className="meta">{r.meta}</span>
        </div>
      ))}
    </div>
  )
}
