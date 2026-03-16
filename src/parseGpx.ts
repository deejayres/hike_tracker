import type { GpxTrack } from './types'
import { segmentDistance } from './geo'

// getElementsByTagName ignores XML namespaces; querySelector does not
function getElements(doc: Document, tag: string): Element[] {
  return Array.from(doc.getElementsByTagName(tag))
}

function getText(el: Element, tag: string): string | undefined {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? undefined
}

export function parseGpx(xmlText: string): GpxTrack {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const trkNameEl = doc.getElementsByTagName('trk')[0]?.getElementsByTagName('name')[0]
  const nameEl = trkNameEl ?? doc.getElementsByTagName('name')[0]
  const name = nameEl?.textContent?.trim() ?? 'Unnamed Track'

  const trkpts = getElements(doc, 'trkpt')

  const points: [number, number][] = trkpts.map(pt => [
    parseFloat(pt.getAttribute('lat') ?? '0'),
    parseFloat(pt.getAttribute('lon') ?? '0'),
  ])

  const firstTime = getText(trkpts[0], 'time')
  const lastTime = getText(trkpts[trkpts.length - 1], 'time')

  const date = firstTime ? firstTime.split('T')[0] : undefined

  const durationSecs =
    firstTime && lastTime
      ? Math.round((new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 1000)
      : undefined

  const distanceMiles = segmentDistance(points)

  const eles = trkpts.map(pt => parseFloat(getText(pt, 'ele') ?? 'NaN'))
  let elevationGainFt = 0
  for (let i = 1; i < eles.length; i++) {
    const delta = eles[i] - eles[i - 1]
    if (!isNaN(delta) && delta > 0) elevationGainFt += delta * 3.28084
  }

  return {
    name,
    points,
    date,
    durationSecs,
    distanceMiles: distanceMiles > 0 ? parseFloat(distanceMiles.toFixed(2)) : undefined,
    elevationGainFt: elevationGainFt > 0 ? Math.round(elevationGainFt) : undefined,
  }
}
