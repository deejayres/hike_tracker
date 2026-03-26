import type { Trail, GpxTrack } from './types'
import { formatDate, formatDuration } from './formatters'
import { segmentDistance } from './geo'
import geometries from './trailGeometries.json'

const GEO = geometries as unknown as Record<string, [number, number][][]>

function osmMiles(trailId: string): number | null {
  const segs = GEO[trailId]
  if (!segs) return null
  const miles = segs.reduce((sum, seg) => sum + segmentDistance(seg), 0)
  return miles > 0 ? miles : null
}

interface Props {
  trail: Trail
  onToggle: (id: string) => void
  onAttachGpx: (id: string) => void
  onRemoveGpx: (id: string, index: number) => void
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

function TrackCard({ track, index, onRemove }: { track: GpxTrack; index: number; onRemove: (i: number) => void }) {
  return (
    <div className="track-card">
      <div className="track-card-header">
        <span className="track-card-name">{track.name}</span>
        <button className="track-remove-btn" onClick={() => onRemove(index)} title="Remove this track">×</button>
      </div>
      <div className="stats">
        {track.date && <Stat label="Date" value={formatDate(track.date)} />}
        {track.distanceMiles != null && (
          <Stat label="Distance" value={`${track.distanceMiles} mi`} />
        )}
        {track.durationSecs != null && (
          <Stat label="Duration" value={formatDuration(track.durationSecs)} />
        )}
        {track.elevationGainFt != null && (
          <Stat label="Elevation gain" value={`${track.elevationGainFt.toLocaleString()} ft`} />
        )}
      </div>
    </div>
  )
}

function TrackTotals({ tracks }: { tracks: GpxTrack[] }) {
  const totalMiles = tracks.reduce((sum, t) => sum + (t.distanceMiles ?? 0), 0)
  const totalSecs = tracks.reduce((sum, t) => sum + (t.durationSecs ?? 0), 0)
  const totalElev = tracks.reduce((sum, t) => sum + (t.elevationGainFt ?? 0), 0)

  return (
    <div className="track-totals">
      <span className="track-totals-label">Totals ({tracks.length} tracks)</span>
      <div className="stats">
        {totalMiles > 0 && <Stat label="Distance" value={`${totalMiles.toFixed(1)} mi`} />}
        {totalSecs > 0 && <Stat label="Duration" value={formatDuration(totalSecs)} />}
        {totalElev > 0 && <Stat label="Elevation gain" value={`${totalElev.toLocaleString()} ft`} />}
      </div>
    </div>
  )
}

export default function TrailDetail({ trail, onToggle, onAttachGpx, onRemoveGpx, onBack }: Props) {
  const tracks = trail.gpxTracks

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

      {tracks.length > 0 ? (
        <div className="track-list">
          {tracks.length > 1 && <TrackTotals tracks={tracks} />}
          {tracks.map((track, i) => (
            <TrackCard
              key={i}
              track={track}
              index={i}
              onRemove={(idx) => onRemoveGpx(trail.id, idx)}
            />
          ))}
        </div>
      ) : (() => {
        const miles = osmMiles(trail.id)
        return miles != null ? (
          <div className="stats">
            <Stat label="Distance (OSM)" value={`${miles.toFixed(1)} mi`} />
          </div>
        ) : (
          <p className="no-gpx">No GPX attached</p>
        )
      })()}

      <button className="attach-gpx-btn" onClick={() => onAttachGpx(trail.id)}>
        Add GPX
      </button>
    </div>
  )
}
