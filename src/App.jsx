import { useEffect, useRef, useState } from 'react'
import { Overview, HW1, HW2 } from './content/part1.jsx'
import { HW3, HW4, Final, Plan } from './content/part2.jsx'
import { ProgressBox, useGlobalProgress, useChapterStates, isArchived } from './components/Progress.jsx'
import Palette from './components/Palette.jsx'
import { PrevNext } from './lib/ui.jsx'
import { NAV, parseHash, consumePendingAnchor, scrollBehavior } from './routes.js'
import { NarrativeContext } from './lib/narrative.jsx'

/* 单一路由表：侧栏/⌘K/翻页器共用（routes.js 导出，此处 re-export 便于既有引用） */
export { NAV }

const SECTIONS = { overview: Overview, hw1: HW1, hw2: HW2, hw3: HW3, hw4: HW4, final: Final, plan: Plan }

/* hash 路由：hashchange 驱动；URL 规范化（默认态/未知/旧格式/纯格式变化）一律 replaceState，不推历史栈 */
function useHashRoute() {
  const [slug, setSlug] = useState(parseHash)
  useEffect(() => {
    const normalize = () => {
      const s = parseHash()
      setSlug(s)
      const want = '#/' + s
      if (location.hash !== want) history.replaceState(null, '', want)
    }
    normalize()
    window.addEventListener('hashchange', normalize)
    return () => window.removeEventListener('hashchange', normalize)
  }, [])
  return slug
}

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('llm-theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('llm-theme', dark ? 'dark' : 'light')
    window.dispatchEvent(new Event('llm-theme'))
    // 主题切换瞬移：全页 transition 停一帧，避免几十处颜色同时补间成"糊变"
    const snap = document.createElement('style')
    snap.textContent = '*,*::before,*::after{transition:none!important}'
    document.head.appendChild(snap)
    void document.body.offsetHeight
    requestAnimationFrame(() => snap.remove())
  }, [dark])
  return [dark, () => setDark(d => !d)]
}

/* 顶栏阅读进度：rAF 节流的滚动百分比（页内语义） */
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

/* 章节完成度/存档态：Progress.jsx 的 useChapterStates（注册表 × localStorage，事件驱动） */

function Sidebar({ open, onNavigate, slug }) {
  const states = useChapterStates()

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">从零训练大模型</div>
      <div className="brand-sub">基于清华 KEG《高级机器学习》作业阶梯重建的自学课程</div>
      {NAV.map(n => {
        const p = n.prefix && states[n.prefix]
        const isDone = p && p.total > 0 && p.done === p.total
        return (
          <a key={n.slug} href={'#/' + n.slug} className={`nav-item ${slug === n.slug ? 'active' : ''} ${isDone ? 'done' : ''}`} onClick={onNavigate}>
            <span className="no">{n.no}</span>
            <span className="lb">
              {n.label}
              <span className="nav-preview">{n.preview}</span>
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
  const slug = useHashRoute()
  const nav = NAV.find(n => n.slug === slug)

  /* 抽屉打开时锁正文滚动；背景（顶栏/正文）退出 tab 序与读屏树；关闭时焦点归还触发按钮 */
  const wasOpen = useRef(false)
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    document.body.classList.toggle('drawer-open', menuOpen)
    if (wasOpen.current && !menuOpen) document.querySelector('.menu-btn')?.focus()
    wasOpen.current = menuOpen
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('drawer-open')
    }
  }, [menuOpen])

  /* Esc 关闭抽屉 */
  useEffect(() => {
    if (!menuOpen) return
    const on = e => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
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

  /* 续读记录：路由驱动写入；skip-overview 守卫——总览停留不覆盖真实续读记录 */
  useEffect(() => {
    if (slug === 'overview') return
    localStorage.setItem('llm-last', JSON.stringify({ href: '#/' + slug, label: nav.label, ts: Date.now() }))
  }, [slug, nav])

  /* 路由渲染完成后：消费跨页 pending anchor，否则回顶 */
  useEffect(() => {
    const anchor = consumePendingAnchor()
    const el = anchor && document.querySelector(anchor)
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1900)
    } else {
      window.scrollTo(0, 0)
    }
  }, [slug])

  const Section = SECTIONS[slug]
  const states = useChapterStates()
  const stats = states[nav.prefix] || { done: 0, total: 0 }
  /* 阶段签注入：{slug, phaseStates}（slug 键 → {archived}），ChapterHead/PhaseStrip 经 Context 消费 */
  const narrative = {
    slug,
    phaseStates: Object.fromEntries(NAV.map(n => [n.slug, { archived: n.prefix ? isArchived(n.prefix) : false }])),
  }

  return (
    <>
      <a className="skip-link" href="#main">跳到正文</a>
      <TopBar dark={dark} toggleTheme={toggleTheme} onMenu={() => setMenuOpen(true)} progress={progress} onPalette={() => setPalOpen(true)} />
      <NarrativeContext.Provider value={narrative}>
        <div className="layout">
          <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} slug={slug} />
          <main id="main" tabIndex={-1}>
            <div className={nav.prefix && isArchived(nav.prefix) ? 'chap-complete' : ''}>
              <Section />
              <PrevNext slug={slug} done={stats.done} total={stats.total} />
            </div>
          </main>
        </div>
      </NarrativeContext.Provider>
      <div className={`scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <Palette open={palOpen} onClose={() => setPalOpen(false)} slug={slug} />
    </>
  )
}
