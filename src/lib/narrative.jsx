import { createContext, useContext } from 'react'

/* 进度叙事层的跨层注入：App 提供 { slug, phaseStates }，ChapterHead/PhaseStrip 消费。
   避免 props 穿透内容组件（design 决策 6）。 */
export const NarrativeContext = createContext(null)

export function useNarrative() {
  return useContext(NarrativeContext)
}

/* 阶段铭牌：slug → 训练隐喻文案（design 决策 2 的七页映射） */
export const PHASE_LABELS = {
  overview: 'RUN CONFIG · 实验配置单',
  hw1: 'PHASE 01 · INIT',
  hw2: 'PHASE 02 · KERNEL',
  hw3: 'PHASE 03 · DATA',
  hw4: 'PHASE 04 · ALIGN',
  final: 'PHASE 05 · DEPLOY',
  plan: 'TRAINING SCHEDULE',
}