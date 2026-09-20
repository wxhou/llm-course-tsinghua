import { useEffect, useRef, useState } from 'react'

const CMIN = 1e18, CMAX = 1e26, CPIVOT = 1e21

export default function ScalingLawDemo() {
  const [E, setE] = useState(1.7)
  const [A, setA] = useState(1.6) // C = 1e21 FLOPs 处幂律项的取值
  const [alpha, setAlpha] = useState(0.34)
  const [tick, setTick] = useState(0)
  const canvasRef = useRef(null)

  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    const cvar = name => css.getPropertyValue(name).trim() || '#888'
    const ink = cvar('--sub'), grid = cvar('--line'), accent = cvar('--accent'), blue = cvar('--blue')
    const L = c => E + A / Math.pow(c / CPIVOT, alpha)
    const x = c => ((Math.log10(c) - 18) / (26 - 18)) * (520 - 70) + 50
    const y = l => 340 - 30 - ((l - 1.6) / (4.2 - 1.6)) * (340 - 60)

    ctx.clearRect(0, 0, 520, 340)
    ctx.strokeStyle = grid; ctx.fillStyle = ink; ctx.font = '10px monospace'
    for (let c = 18; c <= 26; c += 2) {
      ctx.beginPath(); ctx.moveTo(x(10 ** c), 30); ctx.lineTo(x(10 ** c), 310); ctx.stroke()
      ctx.fillText('1e' + c, x(10 ** c) - 12, 325)
    }
    for (let l = 2; l <= 4; l += 0.5) {
      ctx.beginPath(); ctx.moveTo(50, y(l)); ctx.lineTo(490, y(l)); ctx.stroke()
      ctx.fillText(l.toFixed(1), 18, y(l) + 3)
    }
    ctx.fillStyle = ink; ctx.font = '11px sans-serif'
    ctx.fillText('训练算力 C（FLOPs, log 轴）', 170, 338)
    ctx.save(); ctx.translate(12, 220); ctx.rotate(-Math.PI / 2); ctx.fillText('验证损失 L', 0, 0); ctx.restore()

    // 裁剪到绘图区，超范围段不画出界
    ctx.save(); ctx.beginPath(); ctx.rect(50, 30, 440, 280); ctx.clip()
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath()
    for (let i = 0; i <= 300; i++) {
      const c = CMIN * Math.pow(CMAX / CMIN, i / 300)
      const px = x(c), py = y(L(c))
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    ctx.stroke(); ctx.lineWidth = 1
    ctx.restore()

    const pts = [['GPT-2 1.5B', 2.1e21, 3.3], ['Chinchilla 70B', 5.8e23, 2.4], ['~0.1B 你的 HW1', 2.4e19, 4.0]]
    pts.forEach(([n, c, l]) => {
      const px = x(c), py = y(l)
      if (px > 50 && px < 490 && py > 30 && py < 310) {
        ctx.fillStyle = blue; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill()
        ctx.fillText(n, px + 7, py + 3)
      }
    })
  }, [E, A, alpha, tick])

  useEffect(() => {
    const redraw = () => setTick(t => t + 1)
    window.addEventListener('llm-theme', redraw)
    return () => window.removeEventListener('llm-theme', redraw)
  }, [])


  const Cq = 2e21
  // Chinchilla：C ≈ 6·N·D 且 D ≈ 20·N ⇒ C ≈ 120·N² ⇒ N_opt = √(C/120)，D_opt = 20·N_opt
  const Nopt = Math.sqrt(Cq / 120)
  const Dopt = 20 * Nopt
  const L = c => E + A / Math.pow(c / CPIVOT, alpha)

  return (
    <div className="demo" id="demo-scaling">
      <div className="demo-title">交互演示 2 · Scaling Law 拟合器</div>
      <div className="sl-wrap">
        <canvas ref={canvasRef} width="520" height="340" />
        <div className="sl-panel">
          <p>损失公式：L(C) = E + A·(C / 10<sup>21</sup>)<sup>−α</sup>（双对数坐标。算力以 10<sup>21</sup> FLOPs 为单位归一，A 即 C = 10<sup>21</sup> 处幂律项的取值）</p>
          <div className="ctrl">
            <label>E（不可约损失）= <span className="val">{E.toFixed(2)}</span></label>
            <input type="range" min="10" max="30" value={E * 10} onChange={e => setE(+e.target.value / 10)} style={{ flex: 1 }} />
          </div>
          <div className="ctrl">
            <label>A = <span className="val">{A.toFixed(1)}</span></label>
            <input type="range" min="2" max="40" value={A * 10} onChange={e => setA(+e.target.value / 10)} style={{ flex: 1 }} />
          </div>
          <div className="ctrl">
            <label>α = <span className="val">{alpha.toFixed(2)}</span></label>
            <input type="range" min="10" max="60" value={alpha * 100} onChange={e => setAlpha(+e.target.value / 100)} style={{ flex: 1 }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--sub)' }}>
            蓝点 = 一些公开模型的近似位置（数值仅示意量级）。α 越大，损失随算力下降越快。
          </p>
          <div className="sl-computed">
            Chinchilla 配比速算（以 C = 2e21 FLOPs ≈ 单张 4090 × 1 年为例）：<br />
            最优参数量 N ≈ <b>{(Nopt / 1e9).toFixed(1)} B</b>，
            最优数据量 D ≈ <b>{(Dopt / 1e9).toFixed(1)} B</b> token
            （经验：D ≈ 20·N，C ≈ 6·N·D ⇒ N<sub>opt</sub> = √(C/120)）<br />
            当前曲线在 C=2e21 处的预测损失 ≈ <b>{L(Cq).toFixed(2)}</b>
          </div>
        </div>
      </div>
    </div>
  )
}
