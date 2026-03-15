import type { Trail } from './types'

interface Props {
  trails: Trail[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

export default function TrailList({ trails, selectedId, onSelect, onToggle }: Props) {
  const completed = trails.filter(t => t.completed).length

  return (
    <div className="trail-list">
      <div className="trail-list-header">
        <h2>Pisgah 400</h2>
        <span className="progress">{completed} / {trails.length}</span>
      </div>

      <ul>
        {trails.map(trail => (
          <li
            key={trail.id}
            className={[
              'trail-item',
              trail.completed ? 'completed' : '',
              selectedId === trail.id ? 'selected' : '',
            ].join(' ')}
            onClick={() => onSelect(trail.id)}
          >
            <button
              className="check-btn"
              onClick={e => { e.stopPropagation(); onToggle(trail.id) }}
              title={trail.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {trail.completed ? '✓' : '○'}
            </button>
            <span className="trail-number">{trail.number}</span>
            <span className="trail-name">{trail.name}</span>
            {trail.gpxTrack && <span className="gpx-indicator" title="GPX attached">📍</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
