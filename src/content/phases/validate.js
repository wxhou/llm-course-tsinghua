/* 内容结构校验：把非法组合挡在构建期，而不是散落成运行时的 if 兜底。
   返回错误字符串数组；空数组即通过。 */

import { SECTIONS } from '../sections.js'

export const TIERS = ['t1', 't2', 't3', 't4']

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0

const CHECK_FIELDS = ['how', 'cmd', 'expect', 'pitfall', 'grader']

export function validate(phases, checks, components = {}) {
  const errors = []
  const err = (where, msg) => errors.push(`${where}: ${msg}`)

  const phaseIds = new Set()
  const lessonIds = new Set()
  const lessonsById = new Map()

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
      else {
        lessonIds.add(lesson.id)
        lessonsById.set(lesson.id, { ...lesson, phaseId: phase.id })
      }

      if (!isNonEmptyString(lesson.title)) err(lw, 'title 必填')

      if (lesson.tier !== undefined || lesson.order !== undefined) {
        err(lw, 'tier / order 属于节（design D2），课节点上不再声明')
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

  /* ---------- 节 ---------- */
  const sectionIds = new Set()
  const orders = new Set()
  const sectionsByLesson = new Map()

  for (const s of SECTIONS) {
    const where = `section ${s?.id ?? '(missing id)'}`

    if (!isNonEmptyString(s.id)) err(where, 'id 必填')
    else if (sectionIds.has(s.id)) err(where, 'id 全局重复')
    else sectionIds.add(s.id)

    const lesson = lessonsById.get(s.lessonId)
    if (!isNonEmptyString(s.lessonId)) err(where, 'lessonId 必填')
    else if (!lesson) err(where, `lessonId "${s.lessonId}" 没有对应的课节点`)
    else {
      if (!sectionsByLesson.has(s.lessonId)) sectionsByLesson.set(s.lessonId, [])
      sectionsByLesson.get(s.lessonId).push(s)
      if (lesson.acceptancePrefix && !String(s.id).startsWith(lesson.acceptancePrefix + '-')) {
        err(where, `节 id 须以课的前缀 "${lesson.acceptancePrefix}-" 开头（节检查按该前缀计入课级验收）`)
      }
    }

    if (!isNonEmptyString(s.title)) err(where, 'title 必填')
    if (!TIERS.includes(s.tier)) err(where, `tier 必须是 ${TIERS.join('/')}`)
    if (!isNonEmptyString(s.deliverable)) err(where, 'deliverable 必填（没有交付物的不算节，见 design D6）')

    if (!Number.isInteger(s.order) || s.order < 1) err(where, 'order 必须是正整数')
    else if (orders.has(s.order)) err(where, `order ${s.order} 与另一节重复`)
    else orders.add(s.order)

    if (!s.check || typeof s.check !== 'object') {
      err(where, 'check 必填')
    } else {
      for (const f of CHECK_FIELDS) {
        if (!isNonEmptyString(s.check[f])) err(where, `check.${f} 必填`)
      }
      if (s.check.interface !== undefined && !isNonEmptyString(s.check.interface)) {
        err(where, 'check.interface 声明了就必须是非空字符串')
      }
    }

    if (s.tier !== 't1') {
      if (!Array.isArray(s.feeds) || s.feeds.length === 0) {
        err(where, '非 T1 节必须声明 feeds 指向本课作业节')
      } else if (lesson) {
        for (const target of s.feeds) {
          const t = SECTIONS.find(x => x.id === target)
          if (!t) err(where, `feeds 指向不存在的节 "${target}"`)
          else if (t.tier !== 't1') err(where, `feeds 目标 "${target}" 不是 T1 作业节`)
          else if (t.lessonId !== s.lessonId) err(where, `feeds 目标 "${target}" 不在本课（节只汇入本课作业）`)
        }
      }
    }
  }

  /* 已上线的课必须有节：课的正文与进度都以节为单位 */
  for (const [id, lesson] of lessonsById) {
    if (!sectionsByLesson.has(id)) {
      err(`phase ${lesson.phaseId ?? ''} / lesson ${id}`, '没有声明任何节')
    }
  }

  /* 注册表里每个验收组都必须恰好被一节课引用，避免孤儿进度项 */
  for (const prefix of Object.keys(checks)) {
    const owners = phases.reduce(
      (n, p) => n + p.lessons.filter(l => l.acceptancePrefix === prefix).length, 0)
    if (owners === 0) err(`checks ${prefix}`, '没有任何课节点引用该验收组')
    if (owners > 1) err(`checks ${prefix}`, `被 ${owners} 节课重复引用`)
  }

  /* phase 标记为完整时，其每个 T1 节至少有三条非 T1 节汇入（design D2/D5） */
  for (const phase of phases) {
    if (!phase.complete) continue
    for (const lesson of phase.lessons) {
      for (const s of sectionsByLesson.get(lesson.id) || []) {
        if (s.tier !== 't1') continue
        const feeders = SECTIONS.filter(x => x.tier !== 't1' && (x.feeds || []).includes(s.id))
        if (feeders.length < 3) {
          err(`phase ${phase.id} / ${s.id}`, `完整 phase 的 T1 节需要至少 3 条汇入，当前 ${feeders.length} 条`)
        }
      }
    }
  }

  return errors
}
