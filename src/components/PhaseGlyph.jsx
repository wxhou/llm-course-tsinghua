/* 每个 phase 一个线稿图示：只用描边、无填充，跟随 currentColor。
   作为课程地图节点与章节色带的视觉主体。 */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
}

const circle = (cx, cy, r) => <circle cx={cx} cy={cy} r={r} />
const line = (x1, y1, x2, y2, key) => <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} />
const rect = (x, y, w, h) => <rect x={x} y={y} width={w} height={h} />

const GLYPHS = {
  // 环境与工具：终端窗口
  p00: () => (
    <>
      {rect(7, 12, 50, 40)}
      {line(7, 21, 57, 21)}
      <path d="M14 31 l6 6 -6 6" />
      {line(25, 43, 36, 43)}
    </>
  ),
  // 数学基础：坐标轴 + 曲线
  p01: () => (
    <>
      {line(10, 54, 58, 54)}
      {line(10, 54, 10, 8)}
      <path d="M10 46 Q22 46 30 30 T54 12" />
      {line(10, 34, 16, 34)}
      {line(34, 54, 34, 48)}
    </>
  ),
  // 机器学习：散点 + 决策边界
  p02: () => (
    <>
      {circle(18, 20, 2.5)}
      {circle(26, 14, 2.5)}
      {circle(31, 24, 2.5)}
      {circle(46, 42, 2.5)}
      {circle(52, 30, 2.5)}
      {circle(40, 50, 2.5)}
      <path d="M8 48 L56 16" />
    </>
  ),
  // 深度学习：三层网络
  p03: () => (
    <>
      {circle(13, 18, 2.5)}{circle(13, 32, 2.5)}{circle(13, 46, 2.5)}
      {circle(32, 14, 2.5)}{circle(32, 32, 2.5)}{circle(32, 50, 2.5)}
      {circle(51, 24, 2.5)}{circle(51, 40, 2.5)}
      <path d="M15 18 L30 14 M15 18 L30 32 M15 32 L30 14 M15 32 L30 32 M15 32 L30 50 M15 46 L30 32 M15 46 L30 50" />
      <path d="M34 14 L49 24 M34 14 L49 40 M34 32 L49 24 M34 32 L49 40 M34 50 L49 24 M34 50 L49 40" />
    </>
  ),
  // 计算机视觉：取景框
  p04: () => (
    <>
      {rect(8, 12, 48, 40)}
      {line(8, 38, 24, 26)}{line(24, 26, 36, 38)}
      {circle(44, 24, 4)}
      <path d="M8 12 h8 M8 12 v8 M56 12 h-8 M56 12 v8" />
    </>
  ),
  // NLP：token 序列
  p05: () => (
    <>
      {rect(8, 22, 12, 20)}
      {rect(26, 22, 12, 20)}
      {rect(44, 22, 12, 20)}
      <path d="M20 32 h6 M38 32 h6" />
      {line(8, 50, 56, 50)}
    </>
  ),
  // 语音：波形
  p06: () => {
    const hs = [10, 20, 30, 16, 40, 24, 34, 14, 26, 18, 32, 12]
    return (
      <>
        {hs.map((h, i) => line(9 + i * 4, 32 - h / 2, 9 + i * 4, 32 + h / 2, i))}
      </>
    )
  },
  // Transformer：堆叠块 + 注意力矩阵
  p07: () => (
    <>
      {rect(8, 14, 22, 8)}
      {rect(8, 28, 22, 8)}
      {rect(8, 42, 22, 8)}
      <path d="M34 18 h12 M34 32 h12 M34 46 h12" />
      <path d="M46 12 h10 v10 h-10 z M46 26 h10 v10 h-10 z M46 40 h10 v10 h-10 z" />
    </>
  ),
  // 生成式：噪声 → 图像
  p08: () => (
    <>
      {circle(14, 18, 1.5)}{circle(24, 30, 1.5)}{circle(12, 42, 1.5)}
      {circle(26, 12, 1.5)}{circle(20, 50, 1.5)}
      <path d="M30 32 h6" />
      {rect(40, 14, 18, 18)}
      {rect(40, 38, 18, 18)}
      <path d="M40 46 l6 -6 6 6 6 -8" />
    </>
  ),
  // 强化学习：状态-动作-奖励回路
  p09: () => (
    <>
      {rect(8, 26, 14, 12)}
      {rect(44, 10, 14, 12)}
      {rect(44, 42, 14, 12)}
      <path d="M22 30 h10 a6 6 0 0 1 6 0" />
      <path d="M38 38 a6 6 0 0 1 -6 0 H27" />
      <path d="M51 22 v10 M51 32 l-4 -4 M51 32 l4 -4" />
      <path d="M22 38 h10 a6 6 0 0 0 6 0" />
    </>
  ),
  // LLM 从零训练：token → 矩阵 → logits
  p10: () => (
    <>
      {rect(6, 26, 6, 12)}{rect(14, 26, 6, 12)}
      <path d="M22 32 h6" />
      <path d="M30 20 h14 v24 h-14 z M30 26 h14 M30 32 h14 M30 38 h14" />
      <path d="M44 32 h6" />
      <path d="M52 44 v-6 M56 44 v-12 M60 44 v-20" />
    </>
  ),
  // LLM 工程：流水线
  p11: () => (
    <>
      {rect(6, 26, 12, 12)}
      {rect(26, 26, 12, 12)}
      {rect(46, 26, 12, 12)}
      <path d="M18 32 h8 M38 32 h8" />
      <path d="M12 20 v-6 h40 v6" />
      {line(32, 38, 32, 46)}
    </>
  ),
  // 多模态：两种输入汇合
  p12: () => (
    <>
      {rect(6, 12, 16, 16)}
      {line(6, 28, 22, 12)}
      {line(12, 40, 12, 46)}{line(18, 40, 18, 46)}{line(6, 46, 24, 46)}
      <path d="M22 20 h8 a8 8 0 0 1 8 8" />
      <path d="M24 50 h6 a8 8 0 0 0 8 -8" />
      {rect(38, 20, 20, 20)}
    </>
  ),
  // 工具与协议：插头 / 协议
  p13: () => (
    <>
      {rect(6, 24, 18, 16)}
      <path d="M24 28 h8 M24 36 h8" />
      {rect(38, 20, 18, 24)}
      {line(44, 28, 50, 28)}
      {line(44, 36, 56, 36)}
    </>
  ),
  // Agent 工程：循环 + 工具
  p14: () => (
    <>
      <path d="M18 44 a16 16 0 1 1 14 -6" />
      <path d="M32 38 l-5 1 4 4" />
      {rect(38, 40, 18, 14)}
      {line(41, 47, 53, 47)}
    </>
  ),
  // 自主系统：时钟 + 回环
  p15: () => (
    <>
      {circle(28, 32, 18)}
      <path d="M28 22 v10 l7 4" />
      <path d="M50 18 a20 20 0 0 1 0 14" />
      <path d="M50 32 l-4 -3 M50 32 l4 -3" />
    </>
  ),
  // 多智能体：全连接
  p16: () => (
    <>
      {circle(32, 12, 3)}{circle(12, 32, 3)}{circle(52, 32, 3)}{circle(22, 50, 3)}{circle(42, 50, 3)}
      <path d="M30 14 L14 30 M34 14 L50 30 M14 34 L22 48 M50 34 L42 48 M24 48 L40 48 M16 32 L48 32" />
    </>
  ),
  // 基础设施：机架
  p17: () => (
    <>
      {rect(14, 8, 36, 14)}
      {rect(14, 25, 36, 14)}
      {rect(14, 42, 36, 14)}
      {circle(21, 15, 1.5)}{circle(21, 32, 1.5)}{circle(21, 49, 1.5)}
      {line(28, 15, 44, 15)}{line(28, 32, 44, 32)}{line(28, 49, 44, 49)}
    </>
  ),
  // 伦理与安全：盾牌 + 勾
  p18: () => (
    <>
      <path d="M32 8 L52 16 v16 c0 12 -10 20 -20 24 c-10 -4 -20 -12 -20 -24 V16 z" />
      <path d="M23 32 l7 8 12 -14" />
    </>
  ),
  // Capstone：装配体
  p19: () => (
    <>
      {rect(12, 36, 18, 18)}
      {rect(34, 36, 18, 18)}
      {rect(23, 14, 18, 18)}
      <path d="M32 32 v4 M21 36 v-4 h22 v4" />
    </>
  ),
}

export default function PhaseGlyph({ id, className }) {
  const G = GLYPHS[id] || GLYPHS.p19
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g {...S}>{G()}</g>
    </svg>
  )
}
