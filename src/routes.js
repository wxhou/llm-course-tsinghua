/* 路由单一来源：目录表、hash 解析、程序化导航、跨页 pending anchor。
   路形：#/<meta> | #/<phase> | #/<phase>/<lesson>；旧章节 slug 在解析层映射，正文不必改调用。 */

import { PHASE_BY_ID, LESSON_BY_ID, LESSON_BY_ORDER, NAV_PHASES, LEGACY_SLUGS } from './content/phases/index.js'

const META = [
  { slug: 'overview', no: '00', label: '总览 · 课程阶梯', preview: '看懂这门课在练什么，先玩三个演示', kind: 'meta' },
]

const PLAN = { slug: 'plan', no: '—', label: '八周学习计划', preview: '每周 8–10 小时的路线图', kind: 'meta' }

const META_SLUGS = META.map(m => m.slug).concat(PLAN.slug)

/* 侧栏目录：总览 → 已发布 phase（按学习顺序）→ 学习计划 */
export const NAV = [
  ...META,
  ...NAV_PHASES.map(p => ({
    slug: p.id,
    no: p.id.replace(/^p0?/, ''),
    label: p.title,
    preview: p.preview,
    kind: 'phase',
    phaseId: p.id,
  })),
  PLAN,
]

/* 阅读顺序：总览 → 各课（按学习序号，可跨 phase）→ 学习计划。翻页器与续读只认这张表 */
export const PATH = [
  { key: 'overview', href: '#/overview', label: '总览 · 课程阶梯', preview: '看懂这门课在练什么，先玩三个演示' },
  ...LESSON_BY_ORDER.map(l => ({
    key: l.id,
    href: `#/${l.phaseId}/${l.id}`,
    label: l.title,
    preview: `${PHASE_BY_ID[l.phaseId].title} · ${l.tier.toUpperCase()}`,
  })),
  { key: 'plan', href: '#/plan', label: '八周学习计划', preview: '每周 8–10 小时的路线图' },
]

const route = (phaseId, lessonId, meta = null) => ({
  key: meta || `${phaseId}/${lessonId}`,
  meta,
  phaseId,
  lessonId,
})

const OVERVIEW = route(null, null, 'overview')

/* 解析当前 hash → { key, meta, phaseId, lessonId }；未知/空 → 总览 */
export function parseRoute(hash = location.hash) {
  const raw = String(hash || '').replace(/^#\/?/, '').replace(/\/+$/, '')
  if (!raw) return OVERVIEW
  if (META_SLUGS.includes(raw)) return route(null, null, raw)

  const normalized = LEGACY_SLUGS[raw] || raw
  const [phaseId, lessonId] = normalized.split('/')
  const phase = PHASE_BY_ID[phaseId]
  if (!phase || phase.lessons.length === 0) return OVERVIEW

  const lesson = lessonId
    ? phase.lessons.find(l => l.id === lessonId)
    : phase.lessons[0]
  if (!lesson) return route(phase.id, phase.lessons[0].id)

  return route(phase.id, lesson.id)
}

/* 兼容旧调用方：返回路形 key */
export function parseHash() {
  return parseRoute().key
}

/* 把任意目标（meta 名 / 旧章节 slug / phase id / lesson id / 复合 key）解析成路由 */
export function resolveTarget(target) {
  if (!target) return OVERVIEW
  if (META_SLUGS.includes(target)) return route(null, null, target)
  const lesson = LESSON_BY_ID[target]
  if (lesson) return route(lesson.phaseId, lesson.id)
  return parseRoute('#/' + target)
}

export const routeHref = target => '#/' + resolveTarget(target).key

/* 滚动行为随 prefers-reduced-motion 降级（CSS scroll-behavior 管不到 JS scrollIntoView） */
export const scrollBehavior = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/* pending anchor：跨页跳转时暂存目标元素选择器，App 在新页面渲染后的 effect 里消费 */
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

/* 跨页导航到页内锚点：同一路由直接滚动，异路由先切路由再由 App 补滚动 */
export function navigateToAnchor(target, anchor) {
  const dest = resolveTarget(target)
  const cur = parseRoute()
  if (dest.key === cur.key) {
    const el = document.querySelector(anchor)
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      flash(el)
    }
    return
  }
  pendingAnchor = anchor
  location.hash = '#/' + dest.key
}

/* 页面跳转（Sidebar/Palette/翻页器共用）：hash 赋值触发 hashchange，可回退 */
export function navigate(target) {
  location.hash = routeHref(target)
}
