import { haversineDistance } from './geo'
import geometries from './trailGeometries.json'

const GEO = geometries as unknown as Record<string, [number, number][][]>

// ~160 feet in miles
const THRESHOLD_MILES = 0.03

// Minimum fraction of GPX points that must be near a trail to count as a match
const MIN_SCORE = 0.45

function downsample(points: [number, number][], n: number): [number, number][] {
  if (points.length <= n) return points
  const step = points.length / n
  return Array.from({ length: n }, (_, i) => points[Math.floor(i * step)])
}

interface Bbox {
  minLat: number; maxLat: number
  minLon: number; maxLon: number
}

function pointsBbox(pts: [number, number][]): Bbox {
  let minLat = Infinity, maxLat = -Infinity
  let minLon = Infinity, maxLon = -Infinity
  for (const [lat, lon] of pts) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
  }
  return { minLat, maxLat, minLon, maxLon }
}

function bboxOverlaps(a: Bbox, b: Bbox, margin = 0.02): boolean {
  return (
    a.maxLat + margin >= b.minLat &&
    a.minLat - margin <= b.maxLat &&
    a.maxLon + margin >= b.minLon &&
    a.minLon - margin <= b.maxLon
  )
}

// Pre-compute flattened trail points and bboxes once
const trailData: Record<string, { points: [number, number][]; bbox: Bbox }> = {}
for (const [id, segments] of Object.entries(GEO)) {
  const points = segments.flat() as [number, number][]
  trailData[id] = { points, bbox: pointsBbox(points) }
}

export interface TrailMatch {
  trailId: string
  score: number // 0–1, fraction of GPX points near the trail
}

export function matchGpxToTrail(gpxPoints: [number, number][]): TrailMatch | null {
  if (gpxPoints.length === 0) return null

  const sample = downsample(gpxPoints, 100)
  const gpxBb = pointsBbox(sample)

  let bestId: string | null = null
  let bestScore = 0

  for (const [trailId, { points: trailPoints, bbox: trailBb }] of Object.entries(trailData)) {
    if (!bboxOverlaps(gpxBb, trailBb)) continue

    let hits = 0
    for (const gpt of sample) {
      for (const tpt of trailPoints) {
        if (haversineDistance(gpt, tpt) < THRESHOLD_MILES) {
          hits++
          break
        }
      }
    }

    const score = hits / sample.length
    if (score > bestScore) {
      bestScore = score
      bestId = trailId
    }
  }

  return bestId && bestScore >= MIN_SCORE ? { trailId: bestId, score: bestScore } : null
}
