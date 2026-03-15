import { MapContainer, TileLayer, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Trail } from './types'

interface Props {
  trails: Trail[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// Pisgah National Forest center
const CENTER: [number, number] = [35.3, -82.75]

export default function TrailMap({ trails, selectedId, onSelect }: Props) {
  const trackedTrails = trails.filter(t => t.gpxTrack && t.gpxTrack.points.length > 0)

  return (
    <MapContainer
      center={CENTER}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trackedTrails.map(trail => (
        <Polyline
          key={trail.id}
          positions={trail.gpxTrack!.points}
          pathOptions={{
            color: trail.completed ? '#22c55e' : '#6b7280',
            weight: selectedId === trail.id ? 5 : 3,
            opacity: selectedId === trail.id ? 1 : 0.7,
          }}
          eventHandlers={{ click: () => onSelect(trail.id) }}
        >
          <Tooltip sticky>{trail.name}</Tooltip>
        </Polyline>
      ))}
    </MapContainer>
  )
}
