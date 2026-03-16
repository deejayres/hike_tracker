import type { Trail } from './types'
import { segmentDistance } from './geo'
import geometries from './trailGeometries.json'

const GEO = geometries as unknown as Record<string, [number, number][][]>

// Pre-compute distance for each trail from OSM geometry (cached at module load)
const osmDistances: Record<string, number> = {}
for (const [id, segments] of Object.entries(GEO)) {
  osmDistances[id] = segments.reduce((sum, seg) => sum + segmentDistance(seg), 0)
}

function trailDistance(trail: Trail): number {
  if (trail.gpxTrack?.distanceMiles) return trail.gpxTrack.distanceMiles
  return osmDistances[trail.id] ?? 0
}

interface BarProps {
  label: string
  value: number
  total: number
  unit: string
}

function ProgressBar({ label, value, total, unit }: BarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="stat-bar">
      <div className="stat-bar-labels">
        <span className="stat-bar-label">{label}</span>
        <span className="stat-bar-value">
          {value.toFixed(1)} / {total.toFixed(1)} {unit}
          <span className="stat-bar-pct">{pct}%</span>
        </span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface Props {
  trails: Trail[]
}

export default function StatsBar({ trails }: Props) {
  const totalTrails = trails.length
  const completedTrails = trails.filter(t => t.completed).length

  const totalMiles = trails.reduce((sum, t) => sum + trailDistance(t), 0)
  const completedMiles = trails
    .filter(t => t.completed)
    .reduce((sum, t) => sum + trailDistance(t), 0)

  return (
    <div className="stats-bar">
      <ProgressBar
        label="Trails"
        value={completedTrails}
        total={totalTrails}
        unit="trails"
      />
      <ProgressBar
        label="Miles"
        value={completedMiles}
        total={totalMiles}
        unit="mi"
      />
    </div>
  )
}
