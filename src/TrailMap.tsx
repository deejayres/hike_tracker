import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Tooltip, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trail } from './types'
import geometries from './trailGeometries.json'

interface Props {
  trails: Trail[]
  selectedId: string | null
  onSelect: (id: string) => void
  previewTrack?: [number, number][] | null
}

const CENTER: [number, number] = [35.3, -82.75]
const GEO = geometries as unknown as Record<string, [number, number][][]>

const TILE_STYLES = [
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
  },
  {
    id: 'osm',
    label: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
]

function trailColor(trail: Trail): string {
  if (trail.completed) return '#22c55e'
  if (trail.gpxTracks.length > 0) return '#f59e0b' // in progress
  return '#6b7280'
}

function FocusSelected({ trails, selectedId, previewTrack }: { trails: Trail[]; selectedId: string | null; previewTrack?: [number, number][] | null }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const trail = trails.find(t => t.id === selectedId)
    if (!trail) return
    const osmSegments = GEO[trail.id] ?? []
    const gpxSegments = trail.gpxTracks.map(t => t.points)
    const segments = gpxSegments.length > 0 ? [...osmSegments, ...gpxSegments] : osmSegments
    const bounds = new LatLngBounds([])
    segments.forEach(seg => seg.forEach(([lat, lng]) => bounds.extend([lat, lng])))
    if (previewTrack) previewTrack.forEach(([lat, lng]) => bounds.extend([lat, lng]))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [selectedId, previewTrack, trails, map])
  return null
}

export default function TrailMap({ trails, selectedId, onSelect, previewTrack }: Props) {
  const [tileId, setTileId] = useState('topo')
  const tile = TILE_STYLES.find(t => t.id === tileId) ?? TILE_STYLES[0]

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer center={CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer key={tile.id} url={tile.url} attribution={tile.attribution} />
        <FocusSelected trails={trails} selectedId={selectedId} previewTrack={previewTrack} />
        {trails.map(trail => {
          const isSelected = selectedId === trail.id
          const hasGpx = trail.gpxTracks.length > 0
          const osmSegments = GEO[trail.id] ?? []
          const gpxSegments = trail.gpxTracks.map(t => t.points)

          // For incomplete trails with GPX: show OSM underlay in gray + GPX overlay in orange
          // For completed trails: show GPX (or OSM fallback) in green
          // For trails with no GPX: show OSM in gray
          if (hasGpx && !trail.completed && osmSegments.length > 0) {
            return [
              // Gray OSM underlay (remaining/unhiked portions visible)
              ...osmSegments.map((positions, i) => (
                <Polyline
                  key={`${trail.id}-osm-${i}`}
                  positions={positions}
                  pathOptions={{
                    color: '#6b7280',
                    weight: isSelected ? 5 : 3,
                    opacity: isSelected ? 0.7 : 0.5,
                  }}
                  eventHandlers={{ click: () => onSelect(trail.id) }}
                >
                  <Tooltip sticky>{trail.number} — {trail.name}</Tooltip>
                </Polyline>
              )),
              // Orange GPX overlay (hiked portions)
              ...gpxSegments.map((positions, i) => (
                <Polyline
                  key={`${trail.id}-gpx-${i}`}
                  positions={positions}
                  pathOptions={{
                    color: '#f59e0b',
                    weight: isSelected ? 5 : 3,
                    opacity: isSelected ? 1 : 0.75,
                  }}
                  eventHandlers={{ click: () => onSelect(trail.id) }}
                >
                  <Tooltip sticky>{trail.number} — {trail.name}</Tooltip>
                </Polyline>
              )),
            ]
          }

          const segments = hasGpx ? gpxSegments : osmSegments
          if (!segments.length) return null
          return segments.map((positions, i) => (
            <Polyline
              key={`${trail.id}-${i}`}
              positions={positions}
              pathOptions={{
                color: trailColor(trail),
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : trail.completed ? 0.85 : 0.5,
              }}
              eventHandlers={{ click: () => onSelect(trail.id) }}
            >
              <Tooltip sticky>{trail.number} — {trail.name}</Tooltip>
            </Polyline>
          ))
        })}
        {previewTrack && previewTrack.length > 0 && (
          <Polyline
            positions={previewTrack}
            pathOptions={{
              color: '#f59e0b',
              weight: 4,
              opacity: 0.9,
              dashArray: '8 6',
            }}
          >
            <Tooltip sticky>GPX preview</Tooltip>
          </Polyline>
        )}
      </MapContainer>

      <div className="tile-switcher">
        {TILE_STYLES.map(t => (
          <button
            key={t.id}
            className={tileId === t.id ? 'active' : ''}
            onClick={() => setTileId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
