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

function getSegments(trail: Trail): [number, number][][] {
  return trail.gpxTrack?.points.length
    ? [trail.gpxTrack.points]
    : (GEO[trail.id] ?? [])
}

function FocusSelected({ trails, selectedId }: { trails: Trail[]; selectedId: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedId) return
    const trail = trails.find(t => t.id === selectedId)
    if (!trail) return
    const segments = getSegments(trail)
    if (!segments.length) return
    const bounds = new LatLngBounds([])
    segments.forEach(seg => seg.forEach(([lat, lng]) => bounds.extend([lat, lng])))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [selectedId, trails, map])
  return null
}

export default function TrailMap({ trails, selectedId, onSelect }: Props) {
  const [tileId, setTileId] = useState('topo')
  const tile = TILE_STYLES.find(t => t.id === tileId) ?? TILE_STYLES[0]

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer center={CENTER} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer key={tile.id} url={tile.url} attribution={tile.attribution} />
        <FocusSelected trails={trails} selectedId={selectedId} />
        {trails.map(trail => {
          const isSelected = selectedId === trail.id
          const segments = getSegments(trail)
          if (!segments.length) return null
          return segments.map((positions, i) => (
            <Polyline
              key={`${trail.id}-${i}`}
              positions={positions}
              pathOptions={{
                color: trail.completed ? '#22c55e' : '#6b7280',
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : trail.completed ? 0.85 : 0.5,
              }}
              eventHandlers={{ click: () => onSelect(trail.id) }}
            >
              <Tooltip sticky>{trail.number} — {trail.name}</Tooltip>
            </Polyline>
          ))
        })}
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
