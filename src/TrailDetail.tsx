import type { Trail } from './types'
import { formatDate, formatDuration } from './formatters'

interface Props {
  trail: Trail
  onToggle: (id: string) => void
  onAttachGpx: (id: string) => void
  onBack?: () => void
}

interface StatProps {
  label: string
  value: string
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export default function TrailDetail({ trail, onToggle, onAttachGpx, onBack }: Props) {
  const gpx = trail.gpxTrack

  return (
    <div className="trail-detail">
      {onBack && (
        <button className="detail-back" onClick={onBack}>← Trails</button>
      )}
      <div className="detail-header">
        <span className="detail-number">{trail.number}</span>
        <h3 className="detail-name">{trail.name}</h3>
      </div>

      <div className="detail-status">
        <button
          className={`complete-btn ${trail.completed ? 'is-complete' : ''}`}
          onClick={() => onToggle(trail.id)}
        >
          {trail.completed ? '✓ Completed' : 'Mark complete'}
        </button>
        {trail.completedDate && (
          <span className="completed-date">{formatDate(trail.completedDate)}</span>
        )}
      </div>

      {gpx ? (
        <div className="stats">
          {gpx.date && <Stat label="Date" value={formatDate(gpx.date)} />}
          {gpx.distanceMiles != null && (
            <Stat label="Distance" value={`${gpx.distanceMiles} mi`} />
          )}
          {gpx.durationSecs != null && (
            <Stat label="Duration" value={formatDuration(gpx.durationSecs)} />
          )}
          {gpx.elevationGainFt != null && (
            <Stat label="Elevation gain" value={`${gpx.elevationGainFt.toLocaleString()} ft`} />
          )}
        </div>
      ) : (
        <p className="no-gpx">No GPX attached</p>
      )}

      <button className="attach-gpx-btn" onClick={() => onAttachGpx(trail.id)}>
        {gpx ? 'Replace GPX' : 'Attach GPX'}
      </button>
    </div>
  )
}
