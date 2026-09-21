import { useEffect, useState } from 'react'
import { Overview, HW1, HW2 } from './content/part1.jsx'
import { HW3, HW4, Final, Plan } from './content/part2.jsx'
import { ProgressBox, useGlobalProgress } from './components/Progress.jsx'
import Palette from './components/Palette.jsx'
import { PrevNext } from './lib/ui.jsx'
import { NAV, parseHash, consumePendingAnchor } from './routes.js'
import { CHECKS } from './content/registry.jsx'

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

/* 章节完成度：注册表 × localStorage（skip-overview 的续读写入守卫在路由 effect 中） */
function chapterStats(prefix) {
  const items = CHECKS[prefix]
  if (!items) return { done: 0, total: 0 }
  return {
    done: items.filter(it => localStorage.getItem('llmcourse-' + it.id) === '1').length,
    total: items.length,
  }
}

function Sidebar({ open, onNavigate, slug }) {
  const [done, setDone] = useState({})

  /* 按注册表统计每章 checklist 完成情况 → 导航 ✓（跨页一致） */
  useEffect(() => {
    const refresh = () => {
      const m = {}
      for (const [pre, items] of Object.entries(CHECKS)) {
        m[pre] = {
          d: items.filter(it => localStorage.getItem('llmcourse-' + it.id) === '1').length,
          t: items.length,
        }
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
      {NAV.map(n => {
        const p = n.prefix && done[n.prefix]
        const isDone = p && p.t > 0 && p.d === p.t
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
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1900)
    } else {
      window.scrollTo(0, 0)
    }
  }, [slug])

  const Section = SECTIONS[slug]
  const stats = chapterStats(nav.prefix)

  return (
    <>
      <TopBar dark={dark} toggleTheme={toggleTheme} onMenu={() => setMenuOpen(true)} progress={progress} onPalette={() => setPalOpen(true)} />
      <div className="layout">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} slug={slug} />
        <main>
          <Section />
          <PrevNext slug={slug} done={stats.done} total={stats.total} />
        </main>
      </div>
      <div className={`scrim ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <Palette open={palOpen} onClose={() => setPalOpen(false)} slug={slug} />
    </>
  )
}
