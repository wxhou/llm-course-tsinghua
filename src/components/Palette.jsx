import { useEffect, useMemo, useRef, useState } from 'react'
import { NAV, navigateToAnchor } from '../routes.js'

/* 章节 → 面板标签 */
const TAG = { overview: '总览', hw1: 'HW1', hw2: 'HW2', hw3: 'HW3', hw4: 'HW4', final: '期末', plan: '计划' }

/* 索引 = 全局章节条目（静态） + 当前章 h3 小节（打开时 DOM 扫描，范围限本页）。
   小节 id 永不写入 URL：点击走章节路由 + pending anchor。 */
function buildIndex(slug) {
  const items = NAV.map(n => ({ kind: 'chapter', href: '#/' + n.slug, slug: n.slug, no: n.no, label: n.label, tag: '章节' }))
  document.querySelectorAll('main section').forEach(sec => {
    if (sec.id !== slug) return
    const tag = TAG[sec.id] || sec.id
    sec.querySelectorAll('h3').forEach((h, i) => {
      if (!h.id) h.id = `${sec.id}-s${i}`
      items.push({ kind: 'anchor', anchor: '#' + h.id, no: '', label: h.textContent.trim(), tag })
    })
  })
  return items
}

export default function Palette({ open, onClose, slug }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [items, setItems] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setItems(buildIndex(slug))
    setQ('')
    setSel(0)
    setTimeout(() => inputRef.current?.focus(), 0)
    // 关闭时焦点归还触发按钮（移动端 pal-btn 隐藏，focus() 安全空操作）
    return () => { document.querySelector('.pal-btn')?.focus() }
    // 打开期间路由变化（Back/Forward）：不刷新索引、不关面板（scrim 挡视线，Esc 后见新页）
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(it => (it.no + ' ' + it.label + ' ' + it.tag).toLowerCase().includes(s))
  }, [q, items])

  /* 过滤变化时重置选中，并把选中项滚进可视区 */
  useEffect(() => { setSel(0) }, [q])
  useEffect(() => {
    const el = listRef.current?.children[sel]
    el?.scrollIntoView({ block: 'nearest' })
  }, [sel, filtered.length])

  if (!open) return null

  const go = it => {
    onClose()
    if (it.kind === 'chapter') {
      location.hash = it.href  // 顶滚由路由 effect 负责
    } else {
      navigateToAnchor(slug, it.anchor)
    }
  }

  /* 键盘语义挂在对话框容器上：Esc 任何位置可关；Tab 困在面板内（input 是唯一落点） */
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); go(filtered[sel]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'Tab') { e.preventDefault(); inputRef.current?.focus() }
  }

  return (
    <div className="pal-scrim" onClick={onClose}>
      <div className="pal" role="dialog" aria-label="快速跳转" onKeyDown={onKey} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="跳转到章节，或搜索本页小节…"
          aria-label="搜索章节或小节"
          spellCheck="false"
        />
        <div className="pal-list" role="listbox" aria-label="跳转目标" ref={listRef}>
          {filtered.length === 0 && <div className="pal-empty">没有匹配「{q.trim()}」的小节——清空关键词可看全部章节</div>}
          {filtered.map((it, i) => (
            <div
              key={it.href || it.anchor}
              role="option"
              aria-selected={i === sel}
              className={`pal-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(it)}
            >
              <span className="no">{it.no || it.tag}</span>
              <span className="pl-label">{it.label}</span>
              <span className="sub">{it.no ? it.tag : '§ 本页'}</span>
            </div>
          ))}
        </div>
        <div className="pal-hint">
          <span>↑↓ 选择</span><span>↵ 跳转</span><span>esc 关闭</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} / {items.length}</span>
        </div>
      </div>
    </div>
  )
}
