/* phase 地图单一真源：12 个 phase 的数据文件在此汇总，导航、路由、进度全部从这里派生。
   新增 phase 只需加一个数据文件并在 PHASES 登记；没有课节点的 phase 不会出现在目录里。 */

import p01 from './p01.js'
import p03 from './p03.js'
import p05 from './p05.js'
import p07 from './p07.js'
import p09 from './p09.js'
import p10 from './p10.js'
import p11 from './p11.js'
import p13 from './p13.js'
import p14 from './p14.js'
import p15 from './p15.js'
import p17 from './p17.js'
import p18 from './p18.js'

export const PHASES = [p01, p03, p05, p07, p09, p10, p11, p13, p14, p15, p17, p18]

export const PHASE_BY_ID = Object.fromEntries(PHASES.map(p => [p.id, p]))

/* 课节点带上所属 phase，供路由、进度、翻页器共用 */
export const ALL_LESSONS = PHASES.flatMap(p => p.lessons.map(l => ({ ...l, phaseId: p.id })))

export const LESSON_BY_ID = Object.fromEntries(ALL_LESSONS.map(l => [l.id, l]))

/* 学习顺序是站内唯一的跨 phase 排序依据（不用上游编号） */
export const LESSON_BY_ORDER = [...ALL_LESSONS].sort((a, b) => a.order - b.order)

export const isPublished = phase => phase.lessons.length > 0

export const PUBLISHED_PHASES = PHASES.filter(isPublished)

/* phase 在目录中的位置 = 其最小学序号；空 phase 排最后 */
const phaseFirstOrder = phase =>
  phase.lessons.length ? Math.min(...phase.lessons.map(l => l.order)) : Number.POSITIVE_INFINITY

export const NAV_PHASES = [...PUBLISHED_PHASES].sort((a, b) => phaseFirstOrder(a) - phaseFirstOrder(b))

/* 旧章节标识 → 新路由（part1 的演示按钮与续读卡仍按旧 slug 调用） */
export const LEGACY_SLUGS = {
  hw1: 'p10/hw1',
  hw2: 'p10/hw2',
  hw3: 'p10/hw3',
  hw4: 'p10/hw4',
  final: 'p14/fin',
  fin: 'p14/fin',
}

export const resolveLegacy = slug => LEGACY_SLUGS[slug] || null
