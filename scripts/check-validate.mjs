/* 构建校验的负向用例：每条注入一类已知错误，断言 validate 报出对应失败。
   与 check:content 互补——那个跑真实内容，这个证明校验真的会拦。 */

import { PHASES } from '../src/content/phases/index.js'
import { SECTIONS } from '../src/content/sections.js'
import { validate } from '../src/content/phases/validate.js'

const clone = v => JSON.parse(JSON.stringify(v))
const BASE_PHASES = clone(PHASES)
const BASE_SECTIONS = clone(SECTIONS)

const checks = {}
for (const p of BASE_PHASES) {
  for (const l of p.lessons) {
    if (l.acceptancePrefix) checks[l.acceptancePrefix] = [{ id: l.acceptancePrefix + '-x', text: 'x' }]
  }
}
const components = new Proxy({}, { get: () => () => null })

const byId = id => SECTIONS.find(s => s.id === id)
const lesson = id => PHASES.flatMap(p => p.lessons).find(l => l.id === id)

const CASES = [
  ['基线（真实内容）', () => {}, ''],
  ['节 id 重复', () => { SECTIONS[1].id = SECTIONS[0].id }, 'id 全局重复'],
  ['学习序号重复', () => { SECTIONS[1].order = SECTIONS[0].order }, '与另一节重复'],
  ['非法 tier', () => { SECTIONS[0].tier = 't9' }, 'tier 必须是'],
  ['缺少 check 字段', () => { delete SECTIONS[0].check.pitfall }, 'check.pitfall 必填'],
  ['缺少交付物', () => { delete SECTIONS[0].deliverable }, 'deliverable 必填'],
  ['课节点上声明 tier', () => { lesson('hw1').tier = 't1' }, 'tier / order 属于节'],
  ['汇入到别的课', () => { byId('hw1-1').feeds = ['hw2-5'] }, '不在本课'],
  ['课没有任何节', () => {
    for (let i = SECTIONS.length - 1; i >= 0; i--) if (SECTIONS[i].lessonId === 'hw1') SECTIONS.splice(i, 1)
  }, '没有声明任何节'],
  ['完整 phase 的 T1 汇入不足', () => {
    SECTIONS.splice(SECTIONS.findIndex(s => s.id === 'fin-selfjudge'), 1)
    PHASES.find(p => p.id === 'p14').complete = true
  }, '需要至少 3 条汇入'],
]

let failed = 0
for (const [name, mutate, expect] of CASES) {
  SECTIONS.splice(0, SECTIONS.length, ...clone(BASE_SECTIONS))
  PHASES.splice(0, PHASES.length, ...clone(BASE_PHASES))
  mutate()
  const errors = validate(PHASES, checks, components)
  const ok = expect ? errors.some(e => e.includes(expect)) : errors.length === 0
  if (!ok) {
    failed++
    console.error(`FAIL: ${name} —— 期望${expect ? `「${expect}」` : '无错误'}，实际 ${errors.length ? errors.join(' | ') : '无错误'}`)
  }
}

if (failed) {
  console.error(`validate checks failed · ${failed}/${CASES.length}`)
  process.exit(1)
}
console.log(`validate ok · ${CASES.length} 个负向用例全部被拦下`)
