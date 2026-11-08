/* phase 页面：课目切换条 + 当前课正文。一次只渲染一课，避免 P10 下四章同时铺开。 */
import { COMPONENTS } from '../content/components.jsx'
import { lessonStats, usePhaseStates } from './Progress.jsx'
import { routeHref } from '../routes.js'

export default function PhasePage({ phase, lesson }) {
  const states = usePhaseStates()
  const phaseState = states[phase.id]
  const Component = COMPONENTS[lesson.componentId]

  return (
    <>
      <nav className="phase-bar" aria-label={`${phase.title} 课目`}>
        <span className="phase-bar-kicker">
          {phase.id.toUpperCase()}
          {phaseState ? <em>{phaseState.done}/{phaseState.total}</em> : null}
        </span>
        <ol>
          {phase.lessons.map(l => {
            const s = lessonStats(l)
            const active = l.id === lesson.id
            return (
              <li key={l.id}>
                <a
                  href={routeHref(l.id)}
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <b>{l.title}</b>
                  <em>{s.total ? `${s.done}/${s.total}` : '—'}</em>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
      {Component ? <Component /> : null}
    </>
  )
}
