import { useMemo, useState } from 'react'

const COLORS = ['chip-0', 'chip-1', 'chip-2', 'chip-3', 'chip-4', 'chip-5']

function runBPE(text, N) {
  const joined = text.replace(/\s+/g, '▁')
  let toks = Array.from(joined)
  const steps = []
  const mergedColor = new Map()
  let ci = 0
  for (let m = 0; m < N; m++) {
    const cnt = new Map()
    for (let i = 0; i < toks.length - 1; i++) {
      const p = toks[i] + '\u0001' + toks[i + 1]
      cnt.set(p, (cnt.get(p) || 0) + 1)
    }
    if (!cnt.size) break
    let best = null, bc = 0
    for (const [k, v] of cnt) if (v > bc) { bc = v; best = k }
    const [a, b] = best.split('\u0001')
    const nt = []
    for (let i = 0; i < toks.length; i++) {
      if (i < toks.length - 1 && toks[i] === a && toks[i + 1] === b) { nt.push(a + b); i++ }
      else nt.push(toks[i])
    }
    if (nt.length === toks.length) break
    steps.push(`第 ${m + 1} 次合并：「${a}」+「${b}」×${bc} 次 → 新 token「${a + b}」`)
    mergedColor.set(a + b, COLORS[ci++ % COLORS.length])
    toks = nt
  }
  return { toks, steps, mergedColor, raw: Array.from(joined).length }
}

export default function BpeDemo() {
  const [text, setText] = useState('the cat sat on the mat. the cat saw the other cat on the mat.')
  const [n, setN] = useState(8)

  const { toks, steps, mergedColor, raw } = useMemo(() => runBPE(text, n), [text, n])

  return (
    <div className="demo" id="demo-bpe">
      <div className="demo-title">交互演示 1 · 自己跑一遍 BPE 合并</div>
      <p style={{ fontSize: '12.5px', color: 'var(--sub)' }}>
        在下面输入一段文本（当作迷你语料），拖动滑块控制合并次数，观察 token 怎么从单字符一步步长大。这就是 BPE 训练的全部逻辑。
      </p>
      <textarea rows={2} value={text} onChange={e => setText(e.target.value)} />
      <div className="ctrl">
        <label>合并次数：<b>{n}</b></label>
        <input type="range" min="0" max="30" value={n} onChange={e => setN(+e.target.value)} style={{ flex: 1 }} />
      </div>
      <div>
        {toks.map((t, i) => (
          <span key={i} className={`chip ${mergedColor.get(t) || 'chip-0'}`}>{t}</span>
        ))}
      </div>
      <div className="tok-count">
        token 数：<b>{toks.length}</b>（原始字符数 {raw}，压缩率 {(raw / toks.length).toFixed(2)}×）
      </div>
      <div className="merge-steps">
        {steps.length
          ? steps.map((s, i) => <div key={i}>{s}</div>)
          : <div>（合并次数为 0，或已无可合并的高频对）</div>}
      </div>
    </div>
  )
}
