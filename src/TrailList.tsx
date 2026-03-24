import { useState } from 'react'
import type { Trail } from './types'

interface Props {
  trails: Trail[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onBulkImport: () => void
}

export default function TrailList({ trails, selectedId, onSelect, onToggle, onBulkImport }: Props) {
  const [search, setSearch] = useState('')
  const completed = trails.filter(t => t.completed).length

  const filtered = search.trim()
    ? trails.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.number.toLowerCase().includes(search.toLowerCase())
      )
    : trails

  return (
    <div className="trail-list">
      <div className="trail-list-header">
        <h2>Pisgah 400</h2>
        <div className="trail-list-header-right">
          <button className="bulk-import-btn" onClick={onBulkImport} title="Bulk import GPX files">⬆ Import</button>
          <span className="progress">{completed} / {trails.length}</span>
        </div>
      </div>

      <div className="trail-search">
        <input
          type="search"
          placeholder="Search trails…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <ul>
        {filtered.map(trail => (
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
        {filtered.length === 0 && (
          <li className="trail-no-results">No trails match "{search}"</li>
        )}
      </ul>
    </div>
  )
}
