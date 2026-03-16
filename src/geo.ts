const R = 3958.8 // Earth radius in miles

function toRad(deg: number) { return (deg * Math.PI) / 180 }

export function haversineDistance(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const c = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLon * sinLon
  return 2 * R * Math.asin(Math.sqrt(c))
}

export function segmentDistance(points: [number, number][]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineDistance(points[i - 1], points[i])
  return total
}
