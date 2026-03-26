import { haversineDistance, segmentDistance } from './geo'
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

// Find the closest trail to a single point (within threshold)
function closestTrail(pt: [number, number], candidates: string[]): string | null {
  let bestId: string | null = null
  let bestDist = THRESHOLD_MILES

  for (const trailId of candidates) {
    const { points: trailPoints } = trailData[trailId]
    for (const tpt of trailPoints) {
      const d = haversineDistance(pt, tpt)
      if (d < bestDist) {
        bestDist = d
        bestId = trailId
      }
    }
  }
  return bestId
}

export interface SplitSegment {
  trailId: string
  points: [number, number][]
  distanceMiles: number
}

// Minimum segment length to keep (filters junction noise)
const MIN_SEGMENT_MILES = 0.1

export function splitGpxByTrail(gpxPoints: [number, number][]): SplitSegment[] {
  if (gpxPoints.length === 0) return []

  // Pre-filter to only trails whose bbox overlaps the GPX
  const gpxBb = pointsBbox(gpxPoints)
  const candidates = Object.keys(trailData).filter(id =>
    bboxOverlaps(gpxBb, trailData[id].bbox)
  )

  // Tag each point with its closest trail
  const tagged: (string | null)[] = gpxPoints.map(pt => closestTrail(pt, candidates))

  // Group consecutive points with the same trail into segments
  const raw: { trailId: string; points: [number, number][] }[] = []
  let currentId: string | null = null
  let currentPoints: [number, number][] = []

  for (let i = 0; i < gpxPoints.length; i++) {
    const id = tagged[i]
    if (id !== currentId) {
      if (currentId && currentPoints.length > 1) {
        raw.push({ trailId: currentId, points: currentPoints })
      }
      currentId = id
      // Overlap by one point so segments connect
      currentPoints = [gpxPoints[i]]
    } else {
      currentPoints.push(gpxPoints[i])
    }
  }
  if (currentId && currentPoints.length > 1) {
    raw.push({ trailId: currentId, points: currentPoints })
  }

  // Merge consecutive segments of the same trail (after short-segment filtering)
  // First pass: compute distances and filter short segments
  const withDist = raw.map(seg => ({
    ...seg,
    distanceMiles: segmentDistance(seg.points),
  }))
  const filtered = withDist.filter(seg => seg.distanceMiles >= MIN_SEGMENT_MILES)

  // Second pass: merge consecutive same-trail segments
  const merged: SplitSegment[] = []
  for (const seg of filtered) {
    const prev = merged[merged.length - 1]
    if (prev && prev.trailId === seg.trailId) {
      prev.points.push(...seg.points.slice(1))
      prev.distanceMiles += seg.distanceMiles
    } else {
      merged.push({ ...seg })
    }
  }

  return merged
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
