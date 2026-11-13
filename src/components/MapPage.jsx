/* 课程地图：20 个 phase 排成蛇形路径，实心=已上线、空心=未上线。
   首页即此页；节点顺序与连线是真实学习顺序。 */
import { useEffect, useState } from 'react'
import { INDEX_PHASES } from '../content/phases/index.js'
import { SITE } from '../site.js'
import PhaseGlyph from './PhaseGlyph.jsx'

function useColumns() {
  const [cols, setCols] = useState(4)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth
      setCols(w >= 1180 ? 4 : w >= 860 ? 3 : 2)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])
  return cols
}

export default function MapPage() {
  const cols = useColumns()
  const online = INDEX_PHASES.filter(p => p.lessons.length > 0).length

  return (
    <section id="map" className="map-page">
      <div className="kicker">COURSE MAP · {INDEX_PHASES.length} PHASES</div>
      <h1>从零构建 AI，<br />一条能走完的路</h1>
      <p className="lead">
        20 个 phase 按学习顺序连成一条路径。实心节点已经可以进入，空心节点只标出覆盖范围。
        当前已上线 {online} 个。
      </p>

      <div className="map-legend">
        <span><i className="lg on" /> 已上线</span>
        <span><i className="lg off" /> 未上线</span>
        <span><i className="lg flow" /> 学习顺序</span>
      </div>

      <ol className="map-grid" style={{ '--cols': cols }}>
        {INDEX_PHASES.map((p, i) => {
          const onlineNode = p.lessons.length > 0
          const row = Math.floor(i / cols)
          const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols)
          const rowEnd = i % cols === cols - 1
          const dir = row % 2 === 0 ? 'right' : 'left'
          const Tag = onlineNode ? 'a' : 'div'
          const props = onlineNode ? { href: '#/' + p.id } : {}
          return (
            <li
              key={p.id}
              className={`map-node ${onlineNode ? 'is-online' : 'is-offline'}`}
              style={{ gridColumn: col + 1, gridRow: row + 1 }}
            >
              <Tag className="mn-body" {...props}>
                <span className="mn-no">{p.id.slice(1)}</span>
                <PhaseGlyph id={p.id} className="mn-glyph" />
                <b className="mn-title">{p.title}</b>
                <em className="mn-meta">{onlineNode ? `${p.lessons.length} 课` : '未上线'}</em>
              </Tag>
              {!rowEnd && <span className={`mn-link ${dir}`} aria-hidden="true">{dir === 'right' ? '→' : '←'}</span>}
              {rowEnd && i < INDEX_PHASES.length - 1 && <span className="mn-link down" aria-hidden="true">↓</span>}
            </li>
          )
        })}
      </ol>

      <p className="map-note">
        phase 划分参考 {SITE.sources.upstream}；P10 与 P14 的作业设计参考 {SITE.sources.course}。
      </p>
    </section>
  )
}
