import { useMemo, useState, useEffect } from 'react'
import katex from 'katex'
import { PATH } from '../routes.js'
import { SECTION_BY_ID, sectionCheckId } from '../content/sections.js'
import { setItemState } from '../components/Progress.jsx'
import { SITE } from '../site.js'
import PhaseGlyph from '../components/PhaseGlyph.jsx'
import { useNarrative } from './narrative.jsx'
import './katex-subset.css'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'

/* HW1 starter notebook 的 Colab 加载入口（notebook 随构建发布于站点公网路径，私库 GitHub 拉不到） */
export const COLAB_URL =
  'https://colab.research.google.com/#file=https://llm-course-tsinghua.pages.dev/notebooks/hw1-starter.ipynb'

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

/* ---------------- 节：标题、锚点、交付物与检查全部由节数据渲染 ---------------- */
export function Section({ id, children }) {
  const sec = SECTION_BY_ID[id]
  if (!sec) throw new Error(`<Section id="${id}"> 找不到对应的节数据（跑 npm run check:content）`)
  const checkId = sectionCheckId(id)
  const [passed, setPassed] = useState(() => localStorage.getItem('llmcourse-' + checkId) === '1')
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard?.writeText(sec.check.cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const toggle = () => {
    const next = !passed
    setPassed(next)
    setItemState(checkId, next)
  }

  return (
    <section className="sec" id={id} aria-labelledby={id + '-title'}>
      <h2 className="sec-title" id={id + '-title'}>{sec.title}</h2>
      <p className="sec-deliverable"><b>交付物</b>{sec.deliverable}</p>
      {children}
      <div className="sec-gate">
        <div className="sg-head"><span>检查</span><code>{sec.check.grader}</code></div>
        <p className="sg-how">{sec.check.how}</p>
        {sec.check.interface && (
          <p className="sg-iface"><b>接口</b><code>{sec.check.interface}</code></p>
        )}
        <div className="sg-cmd">
          <code>{sec.check.cmd}</code>
          <button onClick={copy}>{copied ? '已复制' : '复制'}</button>
        </div>
        <p className="sg-expect"><b>判定</b>{sec.check.expect}</p>
        <p className="sg-pitfall"><b>常见失败</b>{sec.check.pitfall}</p>
        <label className="sg-pass">
          <input type="checkbox" checked={passed} onChange={toggle} />
          <span>我跑通了这项检查</span>
        </label>
      </div>
    </section>
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

/* ---------------- 章节头：色带 + 专属图示 ---------------- */

/* ---------------- 训练档案卡：收敛后总览常驻的藏书票式双框卡（R4 标志性瞬间） ---------------- */
export function RunReportCard() {
  const first = localStorage.getItem('llm-first-step-at')
  const converged = localStorage.getItem('llm-converged-at')
  const fmt = iso => iso ? new Date(iso).toLocaleDateString('zh-CN') : null
  return (
    <aside className="report-card" aria-label="训练档案卡">
      <div className="rc-inner">
        <div className="rc-kicker">TRAINING RUN #001 · FINAL REPORT</div>
        <h3 className="rc-title">{SITE.name}</h3>
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

/* ---------------- 高频报错速查（三线表：报错现象/原因/修复；td 断行防长 token 串撑破窄屏） ---------------- */
export function ErrorQuickRef({ items }) {
  return (
    <details className="err-ref">
      <summary>高频报错速查 · 做作业卡壳先看这里</summary>
      <table>
        <thead><tr><th>报错现象</th><th>原因</th><th>修复</th></tr></thead>
        <tbody>
          {items.map(([err, cause, fix], i) => (
            <tr key={i}><td>{err}</td><td>{cause}</td><td>{fix}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

/* ---------------- 章尾翻页器：上一节/下一节 + 下一节预览 + 本课完成度弱提示（无门槛） ---------------- */
export function PrevNext({ routeKey, done, total }) {
  const idx = PATH.findIndex(n => n.key === routeKey)
  const prev = idx > 0 ? PATH[idx - 1] : null
  const next = idx >= 0 ? PATH[idx + 1] : null
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
        ? <a className="pager-btn prev" href={prev.href}><span className="pager-dir">← 上一节</span><b>{prev.label}</b></a>
        : <span />}
      {next && (
        <a className="pager-btn next" href={next.href}>
          <span className="pager-dir">下一节 →</span>
          <b>{next.label}</b>
          <em className="pager-preview">{next.preview}</em>
          {total > 0 && <i className="pager-hint">本课验收 {done}/{total} 已完成</i>}
        </a>
      )}
    </nav>
  )
}

/* ---------------- 章节头：色带 + 专属图示 ---------------- */
export function ChapterHead({ kicker, no, title, lead, hours, prereq, oneliner }) {
  const narrative = useNarrative()
  return (
    <header className="chap-head">
      <div className="chap-body">
        <div className="chap-top">
          <span className="kicker">{kicker}</span>
          {no && <span className="chap-digit" aria-hidden="true">{no}</span>}
        </div>
        <h1 className="chap-title">{title}</h1>
        {oneliner && <div className="oneliner"><b>一句话</b>{oneliner}</div>}
        {lead && <p className="lead">{lead}</p>}
        <div className="chap-meta">
          {(hours || prereq) && (
            <>
              {hours && <span>预计学时 {hours}</span>}
              {prereq && <span>先修 {prereq}</span>}
            </>
          )}
        </div>
      </div>
      {narrative?.phaseId && <PhaseGlyph id={narrative.phaseId} className="chap-glyph" />}
    </header>
  )
}
