/* 路由单一来源：章节表、hash 解析、程序化导航、跨页 pending anchor */

export const NAV = [
  { slug: 'overview', no: '00', label: '总览 · 课程阶梯', preview: '看懂这门课在练什么，先玩三个演示', prefix: '' },
  { slug: 'hw1', no: '01', label: 'Tokenizer 与 Transformer', preview: '从字符到 token，从矩阵到对话，亲手训一个 0.1B', prefix: 'hw1' },
  { slug: 'hw2', no: '02', label: 'Triton Attention 内核', preview: '同一公式，为什么手写版本快 10 倍', prefix: 'hw2' },
  { slug: 'hw3', no: '03', label: '数据与 Scaling Law', preview: '预算有限时，钱该堆参数还是堆数据', prefix: 'hw3' },
  { slug: 'hw4', no: '04', label: 'SFT / DPO / RLVR', preview: '模型听话的三条路，统一视角对比', prefix: 'hw4' },
  { slug: 'final', no: '05', label: '期末 · 长程 Agent', preview: '造考场、造手脚、造裁判，再训练它', prefix: 'fin' },
  { slug: 'plan', no: '06', label: '八周学习计划', preview: '每周 8–10 小时的路线图', prefix: '' },
]

const SLUGS = NAV.map(n => n.slug)

/* 滚动行为随 prefers-reduced-motion 降级（CSS scroll-behavior 管不到 JS scrollIntoView） */
export const scrollBehavior = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/* 解析当前 hash → slug。兼容旧锚点格式（'#hw3'），未知/空 → overview */
export function parseHash() {
  const h = location.hash.replace(/^#\/?/, '')
  return SLUGS.includes(h) ? h : 'overview'
}

/* pending anchor：跨章跳转时暂存目标元素选择器，App 在新章节渲染后的 effect 里消费 */
let pendingAnchor = null
export function consumePendingAnchor() {
  const a = pendingAnchor
  pendingAnchor = null
  return a
}

function flash(el) {
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 1900)
}

/* 跨章导航到页内锚点：同章直接滚动，异章先切路由再由 App 补滚动 */
export function navigateToAnchor(slug, anchor) {
  if (parseHash() === slug) {
    const el = document.querySelector(anchor)
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      flash(el)
    }
    return
  }
  pendingAnchor = anchor
  location.hash = '#/' + slug
}

/* 章节跳转（Sidebar/Palette/翻页器共用）：hash 赋值触发 hashchange，可回退 */
export function navigate(slug) {
  location.hash = '#/' + slug
}
