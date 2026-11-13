import { createContext, useContext } from 'react'

/* 进度叙事层的跨层注入：App 提供 { phaseId, phases, phaseStates }，PhaseRuler 消费。
   避免 props 穿透内容组件。 */
export const NarrativeContext = createContext(null)

export function useNarrative() {
  return useContext(NarrativeContext)
}
