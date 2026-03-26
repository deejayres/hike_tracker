import { useState, useMemo } from 'react'
import type { Trail, GpxTrack } from './types'
import { splitGpxByTrail } from './matchGpxToTrail'

interface Props {
  trail: Trail
  trackIndex: number
  trails: Trail[]
  onConfirm: (splits: { trailId: string; track: GpxTrack }[]) => void
  onDismiss: () => void
}

export default function SplitModal({ trail, trackIndex, trails, onConfirm, onDismiss }: Props) {
  const track = trail.gpxTracks[trackIndex]
  const trailMap = useMemo(() => new Map(trails.map(t => [t.id, t])), [trails])

  const segments = useMemo(() => splitGpxByTrail(track.points), [track.points])

  const [included, setIncluded] = useState<boolean[]>(() => segments.map(() => true))

  function toggleSegment(i: number) {
    setIncluded(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function handleConfirm() {
    const splits = segments
      .filter((_, i) => included[i])
      .map(seg => ({
        trailId: seg.trailId,
        track: {
          name: track.name,
          points: seg.points,
          date: track.date,
          distanceMiles: parseFloat(seg.distanceMiles.toFixed(2)),
          // Duration and elevation can't be split accurately without timestamps per point,
          // so we omit them from split segments
        } as GpxTrack,
      }))
    onConfirm(splits)
  }

  const selectedCount = included.filter(Boolean).length

  if (segments.length <= 1) {
    return (
      <div className="modal-overlay" onClick={onDismiss}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Split Track</h2>
          <p className="no-gpx">
            This track {segments.length === 0 ? "doesn't match any trail geometries" : 'only covers one trail'}. Nothing to split.
          </p>
          <div className="modal-actions">
            <button className="modal-cancel" onClick={onDismiss}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Split Track</h2>
        <p className="split-description">
          This track covers {segments.length} trails. Select which segments to keep:
        </p>

        <div className="split-list">
          {segments.map((seg, i) => {
            const t = trailMap.get(seg.trailId)
            return (
              <label key={i} className={`split-row ${included[i] ? '' : 'split-row-skip'}`}>
                <input
                  type="checkbox"
                  checked={included[i]}
                  onChange={() => toggleSegment(i)}
                />
                <span className="split-trail-name">
                  {t ? `${t.number} ${t.name}` : seg.trailId}
                </span>
                <span className="split-distance">{seg.distanceMiles.toFixed(1)} mi</span>
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onDismiss}>Cancel</button>
          <button
            className="modal-confirm"
            disabled={selectedCount === 0}
            onClick={handleConfirm}
          >
            Split into {selectedCount} track{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
