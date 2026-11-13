import { useEffect, useRef, useState } from 'react'
import { Overview } from './content/part1.jsx'
import { Plan } from './content/part2.jsx'
import { ProgressBox, useGlobalProgress, usePhaseStates, isArchived, lessonStats } from './components/Progress.jsx'
import PhasePage from './components/PhasePage.jsx'
import MapPage from './components/MapPage.jsx'
import Palette from './components/Palette.jsx'
import { PrevNext } from './lib/ui.jsx'
import { NAV, parseRoute, consumePendingAnchor, scrollBehavior } from './routes.js'
import { NarrativeContext } from './lib/narrative.jsx'
import { PHASE_BY_ID, LESSON_BY_ID } from './content/phases/index.js'
import { SITE } from './site.js'

/* 元页面（非 phase）：总览、课程地图与学习计划 */
const META_SECTIONS = { overview: Overview, map: MapPage, plan: Plan }

/* hash 路由：hashchange 驱动；URL 规范化（默认态/未知/旧格式/纯格式变化）一律 replaceState，不推历史栈 */
function useHashRoute() {
  const [route, setRoute] = useState(parseRoute)
  useEffect(() => {
    const normalize = () => {
      const r = parseRoute()
      setRoute(r)
      const want = r.explicitSection ? `#/${r.key}/${r.sectionId}` : '#/' + r.key
      if (location.hash !== want) history.replaceState(null, '', want)
    }
    normalize()
    window.addEventListener('hashchange', normalize)
    return () => window.removeEventListener('hashchange', normalize)
  }, [])
  return route
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
      <span className="course-code">FULL STACK</span>
      <span className="course-name">{SITE.name}</span>
      <span className="spacer" />
      <span className="study-progress" title={`全站学习进度 ${study.done}/${study.total} 项`}>
        已学 {pct}% · {study.done}/{study.total} 项
      </span>
      <button className="theme-btn pal-btn" onClick={onPalette} title="快速跳转 (⌘K)">跳转 <b className="kbd">⌘K</b></button>
      <button className="theme-btn" onClick={toggleTheme} aria-label={dark ? '切换到浅色' : '切换到深色'}>
        {dark ? '☀' : '☾'}<span className="btn-label">{dark ? ' 浅色' : ' 深色'}</span>
      </button>
      <div className="scroll-progress" aria-hidden="true">
        <div style={{ width: progress + '%' }} />
      </div>
      <div className="study-progress-bar" aria-hidden="true">
        <div style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function Sidebar({ open, onNavigate, route }) {
  const states = usePhaseStates()

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">{SITE.name}</div>
      <div className="brand-sub">{SITE.tagline}</div>
      {NAV.map(n => {
        const p = n.kind === 'phase' ? states[n.slug] : null
        const isDone = p && p.total > 0 && p.done === p.total
        const active = n.kind === 'phase' ? route.phaseId === n.slug : route.meta === n.slug
        return (
          <a key={n.slug} href={'#/' + n.slug} className={`nav-item ${active ? 'active' : ''} ${isDone ? 'done' : ''}`} onClick={onNavigate}>
            <span className="no">{n.no}</span>
            <span className="lb">
              {n.label}
              <span className="nav-preview">{n.preview}</span>
            </span>
            {isDone ? <span className="ok" title="本阶段验收全部完成">✓</span> : <span className="leader" aria-hidden="true" />}
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
  const route = useHashRoute()

  /* 进度变化时刷新叙事层：阶段签的存档态需随勾选即时更新，不能等路由切换 */
  const [, setProgressTick] = useState(0)
  useEffect(() => {
    const on = () => setProgressTick(t => t + 1)
    window.addEventListener('llmcourse-progress', on)
    window.addEventListener('change', on)
    return () => {
      window.removeEventListener('llmcourse-progress', on)
      window.removeEventListener('change', on)
    }
  }, [])

  const nav = NAV.find(n => (n.kind === 'phase' ? n.slug === route.phaseId : n.slug === route.meta)) || NAV[0]
  const phase = route.phaseId ? PHASE_BY_ID[route.phaseId] : null
  const lesson = route.lessonId ? LESSON_BY_ID[route.lessonId] : null
  const MetaSection = route.meta ? META_SECTIONS[route.meta] : null
  const stats = lesson ? lessonStats(lesson) : { done: 0, total: 0 }
  const archived = route.phaseId ? isArchived(route.phaseId) : false

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
    if (route.meta === 'overview') return
    localStorage.setItem('llm-last', JSON.stringify({ href: '#/' + route.key, label: nav.label, ts: Date.now() }))
  }, [route.key, route.meta, nav])

  /* 路由渲染完成后：消费跨页 pending anchor；URL 点名了某一节就滚到该节，否则回顶（章头即课的锚点） */
  useEffect(() => {
    const anchor = consumePendingAnchor()
    // 用 getElementById 而非拼选择器：id 由数据给出，别假设它能安全进 CSS 选择器
    const el = anchor
      ? document.querySelector(anchor)
      : (route.explicitSection ? document.getElementById(route.sectionId) : null)
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1900)
    } else {
      window.scrollTo(0, 0)
    }
  }, [route.key, route.sectionId, route.explicitSection])

  /* 章节头需要知道当前 phase，用于色带与图示 */
  const narrative = { phaseId: route.phaseId }

  return (
    <>
      <a className="skip-link" href="#main">跳到正文</a>
      <TopBar dark={dark} toggleTheme={toggleTheme} onMenu={() => setMenuOpen(true)} progress={progress} onPalette={() => setPalOpen(true)} />
      <NarrativeContext.Provider value={narrative}>
        <div className="layout">
          <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} route={route} />
          <main id="main" tabIndex={-1}>
            <div className={archived ? 'chap-complete' : ''}>
              {MetaSection
                ? <MetaSection />
                : <PhasePage phase={phase} lesson={lesson} />}
              <PrevNext routeKey={route.meta || route.sectionId} done={stats.done} total={stats.total} />
            </div>
          </main>
        </div>
      </NarrativeContext.Provider>
      <div className={`scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <Palette open={palOpen} onClose={() => setPalOpen(false)} />
    </>
  )
}
