import { useMemo, useState } from 'react'
import katex from 'katex'
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

/* ---------------- 章节头：期刊式巨型描边数字 ---------------- */
export function ChapterHead({ kicker, no, title, lead, hours, prereq, oneliner }) {
  return (
    <header className="chap-head">
      {no && <div className="chap-digit" aria-hidden="true">{no}</div>}
      <div className="chap-body">
        <div className="kicker">{kicker}</div>
        <h2>{title}</h2>
        {oneliner && <div className="oneliner"><b>一句话</b>{oneliner}</div>}
        <p className="lead">{lead}</p>
        {(hours || prereq) && (
          <div className="chap-meta">
            {hours && <span>预计学时 {hours}</span>}
            {prereq && <span>先修 {prereq}</span>}
          </div>
        )}
      </div>
    </header>
  )
}
