import { useEffect, useMemo, useRef, useState } from 'react'
import { NAV, sectionHref } from '../routes.js'
import { PHASE_BY_ID, SECTION_PATH } from '../content/phases/index.js'

/* 索引 = 全站章节 + 全部已发布节。节由数据派生，不再扫描 DOM。 */
function buildIndex() {
  const items = NAV.map(n => ({ kind: 'nav', href: '#/' + n.slug, no: n.no, label: n.label, tag: '章节' }))
  for (const s of SECTION_PATH) {
    items.push({
      kind: 'section',
      href: sectionHref(s.phaseId, s.lessonId, s.id),
      no: '',
      label: s.title,
      tag: PHASE_BY_ID[s.phaseId].title,
      sub: s.lessonTitle,
    })
  }
  return items
}

export default function Palette({ open, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [items, setItems] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setItems(buildIndex())
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
    location.hash = it.href  // 滚动由路由 effect 负责
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
          placeholder="跳转到章节或小节…"
          aria-label="搜索章节或小节"
          spellCheck="false"
        />
        <div className="pal-list" role="listbox" aria-label="跳转目标" ref={listRef}>
          {filtered.length === 0 && <div className="pal-empty">没有匹配「{q.trim()}」的章节或小节——清空关键词可看全部</div>}
          {filtered.map((it, i) => (
            <div
              key={it.href}
              role="option"
              aria-selected={i === sel}
              className={`pal-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(it)}
            >
              <span className="no">{it.no || it.tag}</span>
              <span className="pl-label">{it.label}</span>
              <span className="sub">{it.no ? '章节' : it.sub}</span>
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
