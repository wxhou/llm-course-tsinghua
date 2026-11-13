/* 路由单一来源：目录表、hash 解析、程序化导航、跨页 pending anchor。
   路形：#/<meta> | #/<phase> | #/<phase>/<lesson> | #/<phase>/<lesson>/<section-id>；首页 = 课程地图。 */

import { PHASE_BY_ID, LESSON_BY_ID, NAV_PHASES, LEGACY_SLUGS, SECTION_PATH } from './content/phases/index.js'
import { SECTION_BY_ID, SECTIONS_BY_LESSON } from './content/sections.js'

const MAP = { slug: 'map', no: '—', label: '课程地图', preview: '20 个 phase 的路径与上线状态', kind: 'meta' }
const OVERVIEW = { slug: 'overview', no: '—', label: '总览 · 这门课在练什么', preview: '三个可玩演示与学习方式', kind: 'meta' }
const PLAN = { slug: 'plan', no: '—', label: '八周学习计划', preview: '每周 8–10 小时的路线图', kind: 'meta' }

const META = [MAP, OVERVIEW, PLAN]
const META_SLUGS = META.map(m => m.slug)

/* 侧栏：地图 → 总览 → 已上线 phase（按学习顺序）→ 计划 */
export const NAV = [
  MAP,
  OVERVIEW,
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

export const sectionHref = (phaseId, lessonId, sectionId) =>
  `#/${phaseId}/${lessonId}/${sectionId}`

/* 阅读顺序：地图 → 总览 → 各节（按节的全局序号，可跨课、跨 phase）→ 计划 */
export const PATH = [
  { key: 'map', href: '#/map', label: '课程地图', preview: '20 个 phase 的路径与上线状态' },
  { key: 'overview', href: '#/overview', label: '总览 · 这门课在练什么', preview: '三个可玩演示与学习方式' },
  ...SECTION_PATH.map(s => ({
    key: s.id,
    href: sectionHref(s.phaseId, s.lessonId, s.id),
    label: s.title,
    preview: `${PHASE_BY_ID[s.phaseId].title} · ${s.lessonTitle}`,
  })),
  { key: 'plan', href: '#/plan', label: '八周学习计划', preview: '每周 8–10 小时的路线图' },
]

const route = (phaseId, lessonId, meta = null, sectionId = null, explicitSection = false) => ({
  key: meta || [phaseId, lessonId].filter(Boolean).join('/'),
  meta,
  phaseId,
  lessonId,
  sectionId,
  explicitSection,
})

const firstSectionOf = lessonId => SECTIONS_BY_LESSON[lessonId]?.[0]?.id || null

const HOME = route(null, null, 'map')

/* 解析当前 hash → { key, meta, phaseId, lessonId, sectionId }；未知/空 → 课程地图 */
export function parseRoute(hash = location.hash) {
  const raw = String(hash || '').replace(/^#\/?/, '').replace(/\/+$/, '')
  if (!raw) return HOME
  if (META_SLUGS.includes(raw)) return route(null, null, raw)

  const normalized = LEGACY_SLUGS[raw] || raw
  const [phaseId, lessonId, sectionId] = normalized.split('/')
  const phase = PHASE_BY_ID[phaseId]
  if (!phase || phase.lessons.length === 0) return HOME

  const lesson = lessonId
    ? phase.lessons.find(l => l.id === lessonId)
    : phase.lessons[0]
  if (!lesson) return HOME

  if (!sectionId) return route(phase.id, lesson.id, null, firstSectionOf(lesson.id))

  const sec = SECTION_BY_ID[sectionId]
  // 不存在的节、或属于别的课的节：按规格回退到目录首页，不静默替换成别的节
  if (!sec || sec.lessonId !== lesson.id) return HOME
  return route(phase.id, lesson.id, null, sec.id, true)
}

/* 兼容旧调用方：返回路形 key */
export function parseHash() {
  return parseRoute().key
}

/* 把任意目标（meta 名 / 旧章节 slug / phase id / 课 id / 节 id / 复合 key）解析成路由 */
export function resolveTarget(target) {
  if (!target) return HOME
  if (META_SLUGS.includes(target)) return route(null, null, target)
  const sec = SECTION_BY_ID[target]
  if (sec) return route(LESSON_BY_ID[sec.lessonId].phaseId, sec.lessonId, null, sec.id, true)
  const lesson = LESSON_BY_ID[target]
  if (lesson) return route(lesson.phaseId, lesson.id, null, firstSectionOf(lesson.id))
  return parseRoute('#/' + target)
}

export const routeHref = target => {
  const r = resolveTarget(target)
  return r.explicitSection ? `#/${r.key}/${r.sectionId}` : '#/' + r.key
}

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
