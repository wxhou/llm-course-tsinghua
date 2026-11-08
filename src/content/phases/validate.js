/* 内容结构校验：把非法组合挡在构建期，而不是散落成运行时的 if 兜底。
   返回错误字符串数组；空数组即通过。 */

export const TIERS = ['t1', 't2', 't3', 't4']

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0

export function validate(phases, checks, components = {}) {
  const errors = []
  const err = (where, msg) => errors.push(`${where}: ${msg}`)

  const phaseIds = new Set()
  const lessonIds = new Set()
  const orders = new Set()
  const t1ByPhase = new Map()

  for (const phase of phases) {
    const where = `phase ${phase?.id ?? '(missing id)'}`

    if (!isNonEmptyString(phase.id)) err(where, 'id 必填')
    else if (phaseIds.has(phase.id)) err(where, 'id 重复')
    else phaseIds.add(phase.id)

    if (!isNonEmptyString(phase.title)) err(where, 'title 必填')
    if (!isNonEmptyString(phase.source)) err(where, 'source 必填（标题须可追溯到上游 phase 目录）')
    if (typeof phase.complete !== 'boolean') err(where, 'complete 必须是布尔值')
    if (!Array.isArray(phase.lessons)) {
      err(where, 'lessons 必须是数组')
      continue
    }

    for (const lesson of phase.lessons) {
      const lw = `${where} / lesson ${lesson?.id ?? '(missing id)'}`

      if (!isNonEmptyString(lesson.id)) err(lw, 'id 必填')
      else if (lessonIds.has(lesson.id)) err(lw, 'id 全局重复')
      else lessonIds.add(lesson.id)

      if (!isNonEmptyString(lesson.title)) err(lw, 'title 必填')
      if (!TIERS.includes(lesson.tier)) err(lw, `tier 必须是 ${TIERS.join('/')}`)

      if (!Number.isInteger(lesson.order) || lesson.order < 1) err(lw, 'order 必须是正整数')
      else if (orders.has(lesson.order)) err(lw, `order ${lesson.order} 与另一节课重复`)
      else orders.add(lesson.order)

      if (lesson.tier === 't1') {
        if (!isNonEmptyString(lesson.componentId)) err(lw, 'T1 必须声明 componentId')
        else if (!components[lesson.componentId]) err(lw, `componentId "${lesson.componentId}" 没有对应组件`)
        if (!t1ByPhase.has(phase.id)) t1ByPhase.set(phase.id, [])
        t1ByPhase.get(phase.id).push(lesson)
      }

      if (lesson.acceptancePrefix) {
        const items = checks[lesson.acceptancePrefix]
        if (!items) err(lw, `acceptancePrefix "${lesson.acceptancePrefix}" 在注册表中不存在`)
        else {
          const bad = items.filter(it => !String(it.id).startsWith(lesson.acceptancePrefix + '-'))
          if (bad.length) err(lw, `验收项 ${bad.map(b => b.id).join(',')} 不属于前缀 ${lesson.acceptancePrefix}`)
        }
      }
    }
  }

  /* 注册表里每个验收组都必须恰好被一节课引用，避免孤儿进度项 */
  for (const prefix of Object.keys(checks)) {
    const owners = phases.reduce(
      (n, p) => n + p.lessons.filter(l => l.acceptancePrefix === prefix).length, 0)
    if (owners === 0) err(`checks ${prefix}`, '没有任何课节点引用该验收组')
    if (owners > 1) err(`checks ${prefix}`, `被 ${owners} 节课重复引用`)
  }

  /* phase 标记为完整时，其每个 T1 至少有三条非 T1 课汇入 */
  for (const phase of phases) {
    if (!phase.complete) continue
    for (const t1 of t1ByPhase.get(phase.id) || []) {
      const feeders = phases
        .flatMap(p => p.lessons)
        .filter(l => l.tier !== 't1' && Array.isArray(l.feeds) && l.feeds.includes(t1.id))
      if (feeders.length < 3) {
        err(`phase ${phase.id} / ${t1.id}`,
          `完整 phase 的 T1 需要至少 3 条汇入，当前 ${feeders.length} 条`)
      }
    }
  }

  return errors
}
