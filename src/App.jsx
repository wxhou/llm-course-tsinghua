import { useEffect, useState } from 'react'
import { Overview, HW1, HW2 } from './content/part1.jsx'
import { HW3, HW4, Final, Plan } from './content/part2.jsx'
import { ProgressBox, useGlobalProgress } from './components/Progress.jsx'
import Palette from './components/Palette.jsx'

const NAV = [
  ['#overview', '00', '总览 · 课程阶梯', '看懂这门课在练什么，先玩三个演示'],
  ['#hw1', '01', 'Tokenizer 与 Transformer', '从字符到 token，从矩阵到对话，亲手训一个 0.1B'],
  ['#hw2', '02', 'Triton Attention 内核', '同一公式，为什么手写版本快 10 倍'],
  ['#hw3', '03', '数据与 Scaling Law', '预算有限时，钱该堆参数还是堆数据'],
  ['#hw4', '04', 'SFT / DPO / RLVR', '模型听话的三条路，统一视角对比'],
  ['#final', '05', '期末 · 长程 Agent', '造考场、造手脚、造裁判，再训练它'],
  ['#plan', '06', '八周学习计划', '每周 8–10 小时的路线图'],
]

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('llm-theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('llm-theme', dark ? 'dark' : 'light')
    window.dispatchEvent(new Event('llm-theme'))
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

/* 顶栏阅读进度：rAF 节流的滚动百分比 */
function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0)
      })
    }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    on()
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])
  return p
}

function TopBar({ dark, toggleTheme, onMenu, progress, onPalette }) {
  const study = useGlobalProgress()
  const pct = study.total ? Math.round((study.done / study.total) * 100) : 0
  return (
    <div className="topbar">
      <button className="menu-btn" onClick={onMenu} aria-label="打开目录">☰ 目录</button>
      <span className="course-code">ADV-ML 2026</span>
      <span className="course-name">从零训练大模型 · 自学阶梯</span>
      <span className="term">作业 40% + 期末 60% · 60–80 学时</span>
      <span className="spacer" />
      <span className="study-progress" title={`全站学习进度 ${study.done}/${study.total} 项`}>
        已学 {pct}% · {study.done}/{study.total} 项
      </span>
      <button className="theme-btn pal-btn" onClick={onPalette} title="快速跳转 (⌘K)">跳转 <b className="kbd">⌘K</b></button>
      <button className="theme-btn" onClick={toggleTheme}>{dark ? '☀ 浅色' : '☾ 深色'}</button>
      <div className="scroll-progress" aria-hidden="true">
        <div style={{ width: progress + '%' }} />
      </div>
      <div className="study-progress-bar" aria-hidden="true">
        <div style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

/* checklist id 前缀 → 导航项（用于章节完成 ✓） */
const PREFIX = { '#hw1': 'hw1', '#hw2': 'hw2', '#hw3': 'hw3', '#hw4': 'hw4', '#final': 'fin' }
const LABEL = Object.fromEntries(NAV.map(([href, , label]) => [href, label]))

function Sidebar({ open, onNavigate }) {
  const [active, setActive] = useState('#overview')
  const [done, setDone] = useState({})

  useEffect(() => {
    const io = new IntersectionObserver(
      es => es.forEach(e => {
        if (!e.isIntersecting) return
        const href = '#' + e.target.id
        setActive(href)
        /* 跳过总览：避免每次开页都覆盖真实续读记录 */
        if (href !== '#overview' && LABEL[href]) {
          localStorage.setItem('llm-last', JSON.stringify({ href, label: LABEL[href], ts: Date.now() }))
        }
      }),
      { rootMargin: '-20% 0px -70% 0px' },
    )
    NAV.forEach(([href]) => {
      const el = document.querySelector(href)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  /* 按章节统计 checklist 完成情况 → 导航 ✓ */
  useEffect(() => {
    const refresh = () => {
      const m = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith('llmcourse-')) continue
        const pre = k.slice(10).replace(/-.*$/, '')
        m[pre] = m[pre] || { d: 0, t: 0 }
        m[pre].t++
        if (localStorage.getItem(k) === '1') m[pre].d++
      }
      setDone(m)
    }
    refresh()
    window.addEventListener('llmcourse-progress', refresh)
    window.addEventListener('change', refresh)
    return () => {
      window.removeEventListener('llmcourse-progress', refresh)
      window.removeEventListener('change', refresh)
    }
  }, [])

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">从零训练大模型</div>
      <div className="brand-sub">基于清华 KEG《高级机器学习》作业阶梯重建的自学课程</div>
      {NAV.map(([href, no, label, preview]) => {
        const pre = PREFIX[href]
        const p = pre && done[pre]
        const isDone = p && p.t > 0 && p.d === p.t
        return (
          <a key={href} href={href} className={`nav-item ${active === href ? 'active' : ''} ${isDone ? 'done' : ''}`} onClick={onNavigate}>
            <span className="no">{no}</span>
            <span className="lb">
              {label}
              {preview && <span className="nav-preview">{preview}</span>}
            </span>
            {isDone ? <span className="ok" title="本章清单全部完成">✓</span> : <span className="leader" aria-hidden="true" />}
          </a>
        )
      })}
      <ProgressBox />
    </nav>
  )
}

export default function App() {
  const [dark, toggleTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [palOpen, setPalOpen] = useState(false)
  const progress = useScrollProgress()

  /* 抽屉打开时锁正文滚动 */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  /* 全局 ⌘K / Ctrl+K 唤起跳转面板 */
  useEffect(() => {
    const on = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalOpen(o => !o)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  return (
    <>
      <TopBar dark={dark} toggleTheme={toggleTheme} onMenu={() => setMenuOpen(true)} progress={progress} onPalette={() => setPalOpen(true)} />
      <div className="layout">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main>
          <Overview />
          <HW1 />
          <HW2 />
          <HW3 />
          <HW4 />
          <Final />
          <Plan />
        </main>
      </div>
      <div className={`scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <Palette open={palOpen} onClose={() => setPalOpen(false)} />
    </>
  )
}
