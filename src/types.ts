export interface Trail {
  id: string
  number: string   // e.g. "006", "118A", "440"
  name: string
  completed: boolean
  completedDate?: string // ISO date string, e.g. "2024-06-15"
  gpxTrack?: GpxTrack
}

export interface GpxTrack {
  name: string
  points: [number, number][] // [lat, lng]
  date?: string        // ISO date of the activity
  durationSecs?: number
  distanceMiles?: number
  elevationGainFt?: number
}
