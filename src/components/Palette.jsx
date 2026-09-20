import { useEffect, useMemo, useRef, useState } from 'react'

/* 章节 → 面板标签 */
const TAG = { overview: '总览', hw1: 'HW1', hw2: 'HW2', hw3: 'HW3', hw4: 'HW4', final: '期末', plan: '计划' }
const CHAPTERS = [
  ['#overview', '00', '总览 · 课程阶梯'],
  ['#hw1', '01', 'Tokenizer 与 Transformer'],
  ['#hw2', '02', 'Triton Attention 内核'],
  ['#hw3', '03', '数据与 Scaling Law'],
  ['#hw4', '04', 'SFT / DPO / RLVR'],
  ['#final', '05', '期末 · 长程 Agent'],
  ['#plan', '06', '八周学习计划'],
]

/* 打开时扫描 DOM 建索引：7 个章节 + 全部 h3 小节 */
function buildIndex() {
  const items = CHAPTERS.map(([href, no, label]) => ({ href, no, label, tag: '章节' }))
  document.querySelectorAll('main section').forEach(sec => {
    const tag = TAG[sec.id] || sec.id
    sec.querySelectorAll('h3').forEach((h, i) => {
      const id = `${sec.id}-s${i}`
      h.id = id
      items.push({ href: '#' + id, no: '', label: h.textContent.trim(), tag })
    })
  })
  return items
}

export default function Palette({ open, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [items, setItems] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (open) {
      setItems(buildIndex())
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

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
    requestAnimationFrame(() => {
      location.hash = it.href
      document.querySelector(it.href)?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); go(filtered[sel]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return (
    <div className="pal-scrim" onClick={onClose}>
      <div className="pal" role="dialog" aria-label="快速跳转" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="跳转到章节或小节…（试试 softmax / DPO / kernel）"
          spellCheck="false"
        />
        <div className="pal-list" ref={listRef}>
          {filtered.length === 0 && <div className="pal-empty">没有匹配的小节</div>}
          {filtered.map((it, i) => (
            <div
              key={it.href + i}
              className={`pal-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(it)}
            >
              <span className="no">{it.no || it.tag}</span>
              <span className="pl-label">{it.label}</span>
              <span className="sub">{it.no ? it.tag : '§'}</span>
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
