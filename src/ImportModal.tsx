import { useState } from 'react'
import type { Trail, GpxTrack } from './types'
import { formatDate, formatDuration } from './formatters'

interface Props {
  track: GpxTrack
  trails: Trail[]
  onConfirm: (trailId: string, markComplete: boolean) => void
  onDismiss: () => void
}

export default function ImportModal({ track, trails, onConfirm, onDismiss }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [markComplete, setMarkComplete] = useState(true)
  const [search, setSearch] = useState('')

  const filtered = trails.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.number.includes(search)
  )

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Import GPX</h2>

        <div className="modal-track-info">
          <div className="modal-track-name">{track.name}</div>
          <div className="modal-stats">
            {track.date && <span>{formatDate(track.date)}</span>}
            {track.distanceMiles != null && <span>{track.distanceMiles} mi</span>}
            {track.durationSecs != null && <span>{formatDuration(track.durationSecs)}</span>}
            {track.elevationGainFt != null && <span>+{track.elevationGainFt.toLocaleString()} ft</span>}
          </div>
        </div>

        <div className="modal-field">
          <label>Match to trail</label>
          <input
            type="text"
            placeholder="Search by name or number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <select size={5} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="" disabled>— select a trail —</option>
            {filtered.map(t => (
              <option key={t.id} value={t.id}>
                {t.number} — {t.name}
              </option>
            ))}
          </select>
        </div>

        <label className="modal-checkbox">
          <input
            type="checkbox"
            checked={markComplete}
            onChange={e => setMarkComplete(e.target.checked)}
          />
          Mark as completed
        </label>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onDismiss}>Cancel</button>
          <button
            className="modal-confirm"
            disabled={!selectedId}
            onClick={() => onConfirm(selectedId, markComplete)}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
