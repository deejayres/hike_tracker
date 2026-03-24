import { useState, useMemo } from 'react'
import type { Trail, GpxTrack } from './types'
import { matchGpxToTrail } from './matchGpxToTrail'
import { formatDate, formatDuration } from './formatters'

export interface PendingImport {
  filename: string
  track: GpxTrack
}

export interface MatchedRow {
  filename: string
  track: GpxTrack
  trailId: string
  trailName: string
  score: number
  existingGpx: GpxTrack | undefined
  include: boolean
  keepExisting: boolean
}

interface Props {
  pending: PendingImport[]
  trails: Trail[]
  previewIndex: number | null
  onPreview: (index: number | null, data: { points: [number, number][]; trailId: string } | null) => void
  onConfirm: (imports: { trailId: string; track: GpxTrack; markComplete: boolean }[]) => void
  onDismiss: () => void
}

function scoreLabel(score: number): string {
  if (score >= 0.85) return 'High'
  if (score >= 0.65) return 'Med'
  return 'Low'
}

function scoreClass(score: number): string {
  if (score >= 0.85) return 'confidence-high'
  if (score >= 0.65) return 'confidence-med'
  return 'confidence-low'
}

function TrackStats({ track }: { track: GpxTrack }) {
  return (
    <span className="bulk-track-stats">
      {track.date && <span>{formatDate(track.date)}</span>}
      {track.distanceMiles != null && <span>{track.distanceMiles} mi</span>}
      {track.durationSecs != null && <span>{formatDuration(track.durationSecs)}</span>}
    </span>
  )
}

function useBulkRows(pending: PendingImport[], trails: Trail[]) {
  const trailMap = useMemo(() => new Map(trails.map(t => [t.id, t])), [trails])

  const initialRows = useMemo<MatchedRow[]>(() => {
    return pending.flatMap(({ filename, track }) => {
      const match = matchGpxToTrail(track.points)
      if (!match) return []
      const trail = trailMap.get(match.trailId)
      if (!trail) return []
      return [{
        filename,
        track,
        trailId: match.trailId,
        trailName: `${trail.number} ${trail.name}`,
        score: match.score,
        existingGpx: trail.gpxTrack,
        include: true,
        keepExisting: false,
      }]
    })
  }, [pending, trailMap])

  return { initialRows, unmatchedCount: pending.length - initialRows.length }
}

export default function BulkImportPanel({ pending, trails, previewIndex, onPreview, onConfirm, onDismiss }: Props) {
  const { initialRows, unmatchedCount } = useBulkRows(pending, trails)

  const [rows, setRows] = useState<MatchedRow[]>(initialRows)
  const [markComplete, setMarkComplete] = useState(true)

  function toggleInclude(i: number, e: React.MouseEvent) {
    e.stopPropagation()
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, include: !r.include } : r))
  }

  function toggleKeepExisting(i: number) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, keepExisting: !r.keepExisting } : r))
  }

  const included = rows.filter(r => r.include && !r.keepExisting)

  function handleConfirm() {
    onConfirm(included.map(r => ({ trailId: r.trailId, track: r.track, markComplete })))
  }

  if (rows.length === 0) {
    return (
      <div className="bulk-import-panel">
        <div className="bulk-import-header">
          <h2>Bulk Import</h2>
        </div>
        <p className="no-gpx" style={{ padding: '16px' }}>
          No trails matched in {pending.length} file{pending.length !== 1 ? 's' : ''}.
        </p>
        <div className="bulk-import-footer">
          <button className="modal-cancel" onClick={onDismiss}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bulk-import-panel">
      <div className="bulk-import-header">
        <h2>Bulk Import</h2>
        <span className="bulk-import-summary">
          {rows.length} matched · {unmatchedCount > 0 ? `${unmatchedCount} unmatched · ` : ''}
          {included.length} to import
        </span>
      </div>

      <div className="bulk-import-list">
        {rows.map((row, i) => (
          <div
            key={i}
            className={[
              'bulk-row',
              row.include && !row.keepExisting ? '' : 'bulk-row-skip',
              previewIndex === i ? 'bulk-row-preview' : '',
            ].join(' ')}
            onClick={() => {
              if (previewIndex === i) {
                onPreview(null, null)
              } else {
                onPreview(i, { points: row.track.points, trailId: row.trailId })
              }
            }}
          >
            <input
              type="checkbox"
              checked={row.include}
              onChange={() => {}}
              onClick={(e) => toggleInclude(i, e)}
              className="bulk-checkbox"
            />
            <div className="bulk-row-body">
              <div className="bulk-row-top">
                <span className="bulk-trail-name">{row.trailName}</span>
                <span className={`bulk-confidence ${scoreClass(row.score)}`}>
                  {scoreLabel(row.score)}
                </span>
              </div>
              <TrackStats track={row.track} />
              {row.existingGpx && row.include && (
                <div className="bulk-conflict">
                  <span className="bulk-conflict-label">Existing:</span>
                  <TrackStats track={row.existingGpx} />
                  <label className="bulk-keep-existing" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={row.keepExisting}
                      onChange={() => toggleKeepExisting(i)}
                    />
                    keep existing
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bulk-import-footer">
        <label className="modal-checkbox" style={{ flex: 1 }}>
          <input
            type="checkbox"
            checked={markComplete}
            onChange={e => setMarkComplete(e.target.checked)}
          />
          Mark complete
        </label>
        <button className="modal-cancel" onClick={onDismiss}>Cancel</button>
        <button
          className="modal-confirm"
          disabled={included.length === 0}
          onClick={handleConfirm}
        >
          Import {included.length}
        </button>
      </div>
    </div>
  )
}
