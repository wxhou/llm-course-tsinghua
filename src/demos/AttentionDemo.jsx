import { useMemo, useState } from 'react'

const SENT = '猫 追 球 因为 它 想 玩'.split(' ')
const D = 8

function hashVec(ch) {
  const v = new Array(D).fill(0)
  let h = 0
  for (const c of ch) h = (h * 31 + c.codePointAt(0)) >>> 0
  for (let i = 0; i < D; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    v[i] = ((h >>> 16) / 65535 - 0.5) * 2
  }
  if (ch.includes('猫')) v[0] = 1.2
  if (ch.includes('它')) v[1] = 1.1
  return v
}

function proj(v, seed) {
  return v.map((_, i) => {
    let s = 0
    for (let j = 0; j < D; j++) s += v[j] * Math.cos(seed + i * 3.7 + j * 1.3)
    return s
  })
}

const X = SENT.map(hashVec)
const Q = X.map((_, i) => proj(X[i], 1 + i * 0.13 + (SENT[i] === '它' ? 2.0 : 0)))
const K = X.map((_, i) => proj(X[i], 0.5 + i * 0.09 + (SENT[i] === '猫' ? 1.2 : 0)))

function computeRow(qi) {
  const scores = K.map(k => {
    let s = 0
    for (let i = 0; i < D; i++) s += Q[qi][i] * k[i]
    return s / Math.sqrt(D)
  })
  const m = Math.max(...scores)
  const ex = scores.map(s => Math.exp(s - m))
  const sum = ex.reduce((a, b) => a + b, 0)
  return ex.map(e => e / sum)
}

export default function AttentionDemo() {
  const [selQ, setSelQ] = useState(3) // 默认选中「它」
  const rows = useMemo(() => SENT.map((_, qi) => computeRow(qi)), [])
  const w = rows[selQ]
  const top = [...w.map((v, i) => [v, i])].sort((a, b) => b[0] - a[0]).slice(0, 2)

  return (
    <div className="demo" id="demo-attn">
      <div className="demo-title">交互演示 · 注意力在算什么</div>
      <p style={{ fontSize: '12.5px', color: 'var(--sub)' }}>
        句子「{SENT.join(' ')}」。点左列任意字切换 query，看它的注意力落在哪些位置。
      </p>
      <table style={{ borderCollapse: 'collapse', display: 'inline-block' }}>
        <thead>
          <tr>
            <th style={{ border: 'none' }}></th>
            {SENT.map(k => (
              <th key={k} style={{ border: 'none', fontWeight: 400, color: 'var(--sub)', fontFamily: 'monospace' }}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SENT.map((q, qi) => (
            <tr key={qi}>
              <td className="attn-cell">
                <button type="button" className="attn-q" aria-pressed={qi === selQ} onClick={() => setSelQ(qi)}
                  style={{
                    color: qi === selQ ? 'var(--accent)' : 'var(--sub)',
                    fontWeight: qi === selQ ? 700 : 400,
                  }}
                >
                  {q}
                </button>
              </td>
              {rows[qi].map((v, ki) => (
                <td
                  key={ki}
                  className="attn-cell"
                  style={{ background: `rgba(139,47,47,${Math.min(1, v * 2.2).toFixed(2)})` }}
                >
                  {v >= 0.10 ? v.toFixed(2) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="attn-head">
        当前 query：「{SENT[selQ]}」→ 最关注 「{SENT[top[0][1]]}」（权重 {(top[0][0] * 100).toFixed(0)}%）。
        权重由 softmax(QKᵀ/√d) 算出，颜色越深权重越高——注意力就是“每个位置按权重向其他位置取信息”。
      </div>
    </div>
  )
}
