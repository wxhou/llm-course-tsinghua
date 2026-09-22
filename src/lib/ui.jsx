import { useMemo, useState, useEffect } from 'react'
import katex from 'katex'
import { NAV } from '../routes.js'
import { PHASE_LABELS, useNarrative } from './narrative.jsx'
import './katex-subset.css'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('text', plaintext)

/* ---------------- 数学公式 ---------------- */
export function M({ children }) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: false, throwOnError: false }),
    [children],
  )
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function MB({ children }) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: true, throwOnError: false }),
    [children],
  )
  return <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />
}

/* ---------------- 代码块（高亮 + 复制 + 文件名） ---------------- */
export function CodeBlock({ lang = 'python', file, highlight = [], children }) {
  const [copied, setCopied] = useState(false)
  const html = useMemo(() => {
    const r = hljs.highlight(children, { language: lang, ignoreIllegals: true })
    // 给指定行加高亮标记
    return r.value
      .split('\n')
      .map((line, i) =>
        highlight.includes(i + 1)
          ? `<span class="line-hl">${line || ' '}</span>`
          : line || ' ',
      )
      .join('\n')
  }, [children, lang, highlight])

  const copy = () => {
    navigator.clipboard?.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="codeblock">
      <div className="code-head">
        <span className="code-dots"><i /><i /><i /></span>
        {file && <span className="code-file">{file}</span>}
        <span className="code-lang">{lang}</span>
        <button className="code-copy" onClick={copy}>{copied ? '已复制' : '复制'}</button>
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  )
}

/* ---------------- 教学标注框 ---------------- */
const CALLOUT_TYPES = {
  def: { label: '定义', cls: 'co-def' },
  thm: { label: '定理', cls: 'co-thm' },
  int: { label: '直觉', cls: 'co-int' },
  warn: { label: '踩坑', cls: 'co-warn' },
  note: { label: '注记', cls: 'co-note' },
}

export function Callout({ type = 'note', title, children }) {
  const t = CALLOUT_TYPES[type] || CALLOUT_TYPES.note
  return (
    <div className={`callout ${t.cls}`}>
      <div className="callout-label">{title || t.label}</div>
      {children}
    </div>
  )
}

/* ---------------- OJ 式编程作业卡 ---------------- */
export function Assignment({ id, title, difficulty = 1, estHours, prereq, deliverables, accept, hints }) {
  return (
    <div className="assignment" id={id}>
      <div className="asg-head">
        <span className="asg-tag">PROGRAMMING ASSIGNMENT</span>
        <h4>{title}</h4>
        <div className="asg-meta">
          <span className="asg-diff" title={`难度 ${difficulty}/5`}>
            难度 <b>{'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}</b>
          </span>
          {estHours && <span>预计学时 {estHours}</span>}
          {prereq && <span>先修：{prereq}</span>}
        </div>
      </div>
      {deliverables && (
        <>
          <div className="asg-sub">交付物</div>
          <ul>{deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </>
      )}
      {accept && (
        <>
          <div className="asg-sub">验收标准（全部满足才算通过）</div>
          <ul className="asg-accept">{accept.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </>
      )}
      {hints && (
        <>
          <div className="asg-sub">分步提示（先自己想，再逐级展开）</div>
          {hints.map((h, i) => (
            <details key={i}>
              <summary>提示 {i + 1}</summary>
              <p>{h}</p>
            </details>
          ))}
        </>
      )}
    </div>
  )
}

/* ---------------- 进阶思考题（带难度星） ---------------- */
export function Star({ diff = 1, title, children }) {
  return (
    <details className="star-q">
      <summary>
        <span className="star-diff">{'★'.repeat(diff)}</span>
        {title}
      </summary>
      <p>{children}</p>
    </details>
  )
}

/* ---------------- 参考文献 ---------------- */
export function Refs({ items }) {
  return (
    <div className="refs">
      <div className="asg-sub">参考文献与延伸阅读</div>
      <ol>
        {items.map((r, i) => (
          <li key={i}>
            {r.href
              ? <a href={r.href} target="_blank" rel="noreferrer">{r.text}</a>
              : r.text}
            {r.note && <span className="ref-note"> —— {r.note}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------------- 阶段签：训练隐喻铭牌 + 7 格进度（R5，NarrativeContext 注入） ---------------- */
export function PhaseStrip({ slug }) {
  const narrative = useNarrative()
  return (
    <span className="run-strip" aria-hidden="true">
      <span className="run-strip-label">{PHASE_LABELS[slug]}</span>
      {NAV.map(n => {
        const st = narrative?.phaseStates?.[n.slug]
        const cls = st?.archived ? 'done' : n.slug === slug ? 'now' : 'future'
        return <i key={n.slug} className={`tick ${cls}`} />
      })}
    </span>
  )
}

/* ---------------- 训练档案卡：收敛后总览常驻的藏书票式双框卡（R4 标志性瞬间） ---------------- */
export function RunReportCard() {
  const first = localStorage.getItem('llm-first-step-at')
  const converged = localStorage.getItem('llm-converged-at')
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('zh-CN') : null
  return (
    <aside className="report-card" aria-label="训练档案卡">
      <div className="rc-inner">
        <div className="rc-kicker">TRAINING RUN #001 · FINAL REPORT</div>
        <h3 className="rc-title">从零训练大模型</h3>
        <div className="rc-stats">
          28 STEPS · 5 CHECKPOINTS
          {first && converged && <> · {fmt(first)} → {fmt(converged)}</>}
        </div>
        <div className="rc-chapters">
          {['HW1', 'HW2', 'HW3', 'HW4', 'FINAL'].map(c => <span key={c}>{c}</span>)}
        </div>
        <p className="rc-motto">大模型，应退化为一段你亲手写过的、能解释的代码</p>
        <div className="rc-foot">SELF-TAUGHT · NO ACCOUNT · DATA STAYS IN YOUR BROWSER</div>
      </div>
      <span className="rc-stamp" aria-hidden="true">已收敛 · CONVERGED</span>
    </aside>
  )
}

/* ---------------- 章尾翻页器：上一节/下一节 + 下一章预览 + 本章完成度弱提示（无门槛） ---------------- */
export function PrevNext({ slug, done, total }) {
  const idx = NAV.findIndex(n => n.slug === slug)
  const prev = NAV[idx - 1]
  const next = NAV[idx + 1]
  const [, setTick] = useState(0)
  useEffect(() => {
    const on = () => setTick(t => t + 1)  // 同页 Checklist 勾选后弱提示实时更新
    window.addEventListener('llmcourse-progress', on)
    window.addEventListener('change', on)
    return () => { window.removeEventListener('llmcourse-progress', on); window.removeEventListener('change', on) }
  }, [])
  // done/total 由 App 每次渲染传入，重渲染即取最新值
  return (
    <nav className="pager">
      {prev
        ? <a className="pager-btn prev" href={'#/' + prev.slug}><span className="pager-dir">← 上一节</span><b>{prev.label}</b></a>
        : <span />}
      {next && (
        <a className="pager-btn next" href={'#/' + next.slug}>
          <span className="pager-dir">下一节 →</span>
          <b>{next.label}</b>
          <em className="pager-preview">{next.preview}</em>
          {total > 0 && <i className="pager-hint">本章清单 {done}/{total} 已完成</i>}
        </a>
      )}
    </nav>
  )
}

/* ---------------- 章节头：期刊式巨型描边数字 ---------------- */
export function ChapterHead({ kicker, no, title, lead, hours, prereq, oneliner }) {
  const narrative = useNarrative()
  return (
    <header className="chap-head">
      {no && <div className="chap-digit" aria-hidden="true">{no}</div>}
      <div className="chap-body">
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
        {oneliner && <div className="oneliner"><b>一句话</b>{oneliner}</div>}
        <p className="lead">{lead}</p>
        <div className="chap-meta">
          {(hours || prereq) && (
            <>
              {hours && <span>预计学时 {hours}</span>}
              {prereq && <span>先修 {prereq}</span>}
            </>
          )}
          {narrative && <PhaseStrip slug={narrative.slug} />}
        </div>
      </div>
    </header>
  )
}
