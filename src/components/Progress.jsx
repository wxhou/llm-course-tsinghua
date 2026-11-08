import { useEffect, useRef, useState } from 'react'
import { CHECKS } from '../content/registry.jsx'
import { PHASE_BY_ID, PUBLISHED_PHASES, NAV_PHASES } from '../content/phases/index.js'

const KEY = id => 'llmcourse-' + id
const EVT = 'llmcourse-progress'
const EVT_CONVERGED = 'llm-converged'
const EVT_FIRST_CHECK = 'llm-first-ritual'

export function ProgressProvider({ children }) {
  // 全局进度通过 window 事件广播，ProgressBox 订阅
  return <>{children}</>
}

const lessonItems = lesson =>
  (lesson.acceptancePrefix && CHECKS[lesson.acceptancePrefix]) || []

/* 课级进度：由注册表 × localStorage 派生，不写第二份真源 */
export function lessonStats(lesson) {
  const items = lessonItems(lesson)
  return {
    done: items.filter(it => localStorage.getItem(KEY(it.id)) === '1').length,
    total: items.length,
  }
}

/* phase 级进度 = 其下各课之和（App/Sidebar/PhasePage/翻页器共用） */
export function phaseStats(phaseId) {
  const phase = PHASE_BY_ID[phaseId]
  if (!phase) return { done: 0, total: 0 }
  return phase.lessons.reduce((acc, l) => {
    const s = lessonStats(l)
    return { done: acc.done + s.done, total: acc.total + s.total }
  }, { done: 0, total: 0 })
}

/* 单向存档判定：持久标记 llm-ckpt-phase-{id} 一经写入不移除（design 决策 5） */
export function isArchived(phaseId) {
  if (!phaseId) return false
  return !!localStorage.getItem('llm-ckpt-phase-' + phaseId)
}

/* phase 是否已全部验收：不带验收项的课不参与判定 */
export function phaseComplete(phase) {
  const scored = phase.lessons.filter(l => lessonItems(l).length > 0)
  if (!scored.length) return false
  return scored.every(l => {
    const s = lessonStats(l)
    return s.done === s.total
  })
}

/* 每 phase 状态（含存档态）：App/Sidebar/PhasePage/PhaseStrip 共用，事件驱动重渲染 */
export function usePhaseStates() {
  const [states, setStates] = useState({})
  useEffect(() => {
    const refresh = () => {
      const m = {}
      for (const phase of PUBLISHED_PHASES) {
        m[phase.id] = { ...phaseStats(phase.id), archived: isArchived(phase.id) }
      }
      setStates(m)
    }
    refresh()
    window.addEventListener(EVT, refresh)
    window.addEventListener('change', refresh)
    return () => { window.removeEventListener(EVT, refresh); window.removeEventListener('change', refresh) }
  }, [])
  return states
}

export function ProgressBox() {
  const { done, total } = useGlobalProgress()
  const pct = total ? Math.round((done / total) * 100) : 0
  const converged = !!localStorage.getItem('llm-converged-at')
  return (
    <div className="progress-box">
      <RunMonitor done={done} total={total} pct={pct} converged={converged} />
      <FirstCheckRitual />
      {converged && <span className="progress-cheer">run 收敛 —— 训练档案卡已生成，回总览可查收</span>}
    </div>
  )
}

/* 全站完成度：已发布 phase 的验收项之和（不依赖当前页 DOM）。
   收敛与存档检测的单一落点（design 决策 8）。 */
export function useGlobalProgress() {
  const [counts, setCounts] = useState({ done: 0, total: 0 })
  useEffect(() => {
    const refresh = () => {
      const done = PUBLISHED_PHASES.reduce((n, p) => n + phaseStats(p.id).done, 0)
      const total = PUBLISHED_PHASES.reduce((n, p) => n + phaseStats(p.id).total, 0)
      setCounts({ done, total })

      // 新完成的 phase → 持久存档标记（写入后不移除 = 单向）
      for (const phase of PUBLISHED_PHASES) {
        if (phaseComplete(phase) && !localStorage.getItem('llm-ckpt-phase-' + phase.id)) {
          localStorage.setItem('llm-ckpt-phase-' + phase.id, new Date().toISOString())
        }
      }

      // 收敛：全部已发布 phase 均存档；时间戳单向，新增 phase 不重置
      const converged = PUBLISHED_PHASES.length > 0 && PUBLISHED_PHASES.every(phaseComplete)
      if (converged && !localStorage.getItem('llm-converged-at')) {
        localStorage.setItem('llm-converged-at', new Date().toISOString())
        window.dispatchEvent(new Event(EVT_CONVERGED))
      }
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
    // 第一公里仪式：全站首次勾选（design 决策 4）
    if (next[i] && !localStorage.getItem('llm-first-check')) {
      localStorage.setItem('llm-first-check', new Date().toISOString())
      localStorage.setItem('llm-first-step-at', new Date().toISOString())
      window.dispatchEvent(new Event(EVT_FIRST_CHECK))
    }
    window.dispatchEvent(new Event(EVT))
  }
  return (
    <ul className="check">
      {items.map((it, i) => (
        <li key={it.id}>
          <label>
            <input type="checkbox" checked={state[i]} onChange={() => toggle(i)} />
            <span>{it.text}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}

/* ---------- 叙事层：训练监控面板 + 首勾仪式（R1/R2/R6） ---------- */

const FATE_PATH = 'M4 10 C 10 13, 14 20, 24 23 S 34 24, 40 27 S 50 26, 58 30 S 70 29, 78 35 S 92 36, 102 40 S 118 41, 128 45 S 148 47, 160 51 S 182 55, 196 58'
/* phase 刻度 x：path 横跨 4..196，按各 phase 验收项累计占比定位（不再写死 28 项） */
function buildTicks() {
  const totals = NAV_PHASES.map(p => ({ id: p.id, n: phaseStats(p.id).total }))
  const sum = totals.reduce((a, t) => a + t.n, 0)
  let acc = 0
  return totals.map(t => {
    acc += t.n
    return { pre: t.id, at: sum ? acc / sum : 0 }
  })
}

function RunMonitor({ done, total, pct, converged }) {
  const pathRef = useRef(null)
  const dotRef = useRef(null)
  const [playSeq, setPlaySeq] = useState(false)
  useEffect(() => {
    // 前锋点定位：getPointAtLength 按真实用户空间长度取点（pathLength 属性只影响 dash）
    const path = pathRef.current
    if (path && dotRef.current) {
      const p = path.getPointAtLength(path.getTotalLength() * (total ? done / total : 0))
      dotRef.current.setAttribute('cx', p.x)
      dotRef.current.setAttribute('cy', p.y)
    }
  }, [done, total])
  useEffect(() => {
    // 收敛序列一次性播放：持久状态决定常驻终态，sessionStorage 决定是否播动画
    const on = () => {
      if (sessionStorage.getItem('llm-converged-played')) return
      sessionStorage.setItem('llm-converged-played', '1')
      setPlaySeq(true)
      setTimeout(() => setPlaySeq(false), 3000)
    }
    window.addEventListener(EVT_CONVERGED, on)
    return () => window.removeEventListener(EVT_CONVERGED, on)
  }, [])
  const status = converged ? '已收敛 · converged' : done === 0 ? 'awaiting init · 随机初始化完成' : 'training…'
  return (
    <div className={`run-monitor${converged ? ' converged' : ''}${playSeq ? ' play-seq' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 200 72" width="100%">
        <line x1="4" y1="14" x2="196" y2="14" className="rm-grid" />
        <line x1="4" y1="36" x2="196" y2="36" className="rm-grid" />
        <line x1="4" y1="58" x2="196" y2="58" className="rm-grid" />
        <text x="4" y="9" className="rm-axis">loss</text>
        <text x="196" y="69" textAnchor="end" className="rm-axis">steps →</text>
        <path d={FATE_PATH} className="rm-fate" fill="none" />
        <path d={FATE_PATH} ref={pathRef} className="rm-progress" fill="none"
          pathLength="100" style={{ strokeDashoffset: 100 - pct }} />
        {buildTicks().map(t => {
          const x = 4 + 192 * t.at
          return isArchived(t.pre)
            ? <line key={t.pre} x1={x} y1="10" x2={x} y2="62" className="rm-tick done" />
            : <line key={t.pre} x1={x} y1="10" x2={x} y2="62" className="rm-tick" />
        })}
        <circle ref={dotRef} className="rm-dot" r="3" />
        {converged && (
          <g className="rm-stamp">
            <text x="128" y="30" className="rm-stamp-text">已收敛</text>
          </g>
        )}
      </svg>
      <div className="rm-caption">
        <span>run #001 · step {done}/{total}</span>
        <span className="rm-status">{status}</span>
      </div>
    </div>
  )
}

/* 第一公里仪式：监听首勾事件，短暂展示后自动收起（仅一次，持久标记在 Checklist toggle 内写入） */
function FirstCheckRitual() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => {
      setShow(true)
      setTimeout(() => setShow(false), 6000)
    }
    window.addEventListener(EVT_FIRST_CHECK, on)
    return () => window.removeEventListener(EVT_FIRST_CHECK, on)
  }, [])
  if (!show) return null
  return (
    <div className="first-ritual">
      <span className="ritual-stamp">实验开始</span>
      <span className="ritual-copy">第一条记录落笔。最难的从来不是后面 27 项，是你刚跨过的环境配置。</span>
    </div>
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