/**
 * Fetches trail geometries from OpenStreetMap via Overpass API.
 * Matches OSM ways to our trail list by name, then writes
 * src/trailGeometries.json for use in the app.
 *
 * Run once (or whenever you want to refresh):
 *   node scripts/fetch-geometries.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Pisgah Ranger District bounding box: south, west, north, east
const BBOX = '35.05,-83.1,35.65,-82.3'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Our trail list (number -> name), matching trails.ts
const TRAILS = [
  ['006',  'Biltmore Campus'],
  ['101',  'Ivestor Gap'],
  ['102',  'Big Creek'],
  ['103',  'Buckhorn Gap'],
  ['104',  'Buck Spring'],
  ['105',  'Daniel Ridge Loop'],
  ['106',  'Farlow Gap'],
  ['107',  'Little East Fork'],
  ['108',  'Art Loeb Spur'],
  ['109',  'Fork Mountain'],
  ['110',  'Laurel Mtn. Connector'],
  ['112',  'Pressley Cove'],
  ['113',  'Green Mountain'],
  ['114',  'Looking Glass Rock'],
  ['115',  'Riverside'],
  ['116',  'Long Branch'],
  ['117',  'Slick Rock Falls'],
  ['118',  'Pink Beds Loop'],
  ['118A', 'Pink Beds Connector'],
  ['119',  'Case Camp Ridge'],
  ['120',  'Cat Gap Loop'],
  ['120A', 'Cat Gap Bypass'],
  ['121',  'Laurel Mountain'],
  ['122',  'Buckwheat Knob'],
  ['123',  'Butter Gap'],
  ['126',  'Buckeye Gap'],
  ['127',  'Black Mountain'],
  ['130',  'Courthouse Falls'],
  ['132',  'North Face'],
  ['133',  'South Mills River'],
  ['134',  'Wagon Road Gap'],
  ['136',  'Little Hickory Top'],
  ['137A', 'Lower Sidehill'],
  ['138',  'Bennett Gap'],
  ['139',  'Greenslick'],
  ['141',  'Cold Mountain'],
  ['142',  'Haywood Gap'],
  ['143',  'Sycamore Cove Loop'],
  ['144',  'Coontree Loop'],
  ['145',  'Sidehill'],
  ['145A', 'Sidehill Connector'],
  ['146',  'Art Loeb'],
  ['147',  'Squirrel Gap'],
  ['148',  'Cantrell Creek'],
  ['150',  'Ingles Field Gap'],
  ['151',  'Perry Cove'],
  ['288',  'Andy Cove Nature'],
  ['318',  'Moore Cove'],
  ['319',  'Forest Festival'],
  ['320',  'Pilot Cove – Slate Rock'],
  ['320A', 'Pilot Cove Loop'],
  ['321',  'Pilot Rock'],
  ['321A', 'Pilot Rock Extension'],
  ['322',  'Turkeypen Gap'],
  ['323',  'Bad Fork'],
  ['324',  'Vinyard Gap'],
  ['325',  'Horse Cove Gap'],
  ['326',  'Mullinax'],
  ['327',  'Avery Creek'],
  ['328',  'Bear Branch'],
  ['329',  'Campground Connector'],
  ['332',  'Old Butt Knob'],
  ['333',  'Homestead'],
  ['334',  'Small Creek'],
  ['335',  'Deerfield Loop'],
  ['335A', 'Deerfield Connector'],
  ['336',  'Pine Tree Loop'],
  ['337',  'Explorer Loop'],
  ['337A', 'Explorer Loop Connector'],
  ['339',  'Sleepy Gap'],
  ['340',  'Cove Creek'],
  ['341',  'Cemetery Loop'],
  ['342',  'Clawhammer Cove'],
  ['343',  'Club Gap'],
  ['344',  'Exercise'],
  ['345',  'Shut-In'],
  ['346',  'Flat Laurel Creek'],
  ['347',  'Little Sam'],
  ['348',  'Laurel Creek'],
  ['349',  'Poundingmill'],
  ['350',  'Fletcher Creek'],
  ['351',  'Bradley Creek'],
  ['352',  'Middle Fork'],
  ['353',  'North Mills River'],
  ['354',  'Trace Ridge'],
  ['355',  'Mount Pisgah'],
  ['356',  'Graveyard Ridge'],
  ['356A', 'Graveyard Ridge Connector'],
  ['357',  'Big East Fork'],
  ['358',  'Graveyard Fields Loop'],
  ['358A', 'Upper Falls'],
  ['358B', 'MST Access'],
  ['359',  'North Slope'],
  ['359A', 'North Slope Connector'],
  ['361',  'Caney Bottom'],
  ['362',  'Greasy Cove'],
  ['363',  'Shining Creek'],
  ['364',  'Grassy Road'],
  ['365',  'John Rock'],
  ['440',  'MST'],
  ['499',  'Rainbow Falls'],
  ['600',  'Spencer Gap'],
  ['601',  'Sunwall'],
  ['602',  'Thompson Creek'],
  ['603',  'Thrift Cove Loop'],
  ['604',  'Twin Falls'],
  ['606',  'Wash Creek'],
  ['607',  'Bridges Camp Gap'],
  ['609',  'Seniard Ridge'],
  ['610',  'Foster Creek'],
  ['611',  'Yellow Gap'],
  ['617',  'Sam Knob'],
  ['617A', 'Sam Knob Summit'],
  ['618',  'Barnett Branch'],
  ['650',  'Davidson River'],
  ['660',  'Ledford'],
  ['661',  'Hardtimes Connector'],
  ['662',  'Chestnut Cove'],
  ['664',  'Deer Lake Lodge'],
  ['665',  'Boyd Branch'],
  ['666',  'Wolf Branch'],
]

// Manual overrides for trails where OSM name differs from our list
// trailNumber -> OSM name to match against
const ALIASES = {
  '139': 'Greens Lick Trail',
  '138': 'Bennett Gap Trail',
  '320': 'Slate Rock Creek Trail',
  '288': 'Andy Cove Trail',
  '322': 'Turkey Pen Gap Trail',
  '611': 'Yellow Gap Trail',
  '340': 'Cove Creek Trail',
}

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\btrail\b/g, '')
    .replace(/\bthe\b/g, '')
    .replace(/[–\-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchTrail(osmName) {
  const osmNorm = normalize(osmName)
  let best = null
  let bestScore = 0

  for (const [number, name] of TRAILS) {
    if (ALIASES[number]) {
      // aliased trails only match their alias — no fuzzy fallback
      if (normalize(ALIASES[number]) === osmNorm) return { number, name, score: 100 }
      continue
    }
    const trailNorm = normalize(name)
    // exact match after normalization
    if (osmNorm === trailNorm) return { number, name, score: 100 }
    // one contains the other
    if (osmNorm.includes(trailNorm) || trailNorm.includes(osmNorm)) {
      const score = Math.min(osmNorm.length, trailNorm.length) / Math.max(osmNorm.length, trailNorm.length)
      if (score > bestScore) { best = { number, name, score }; bestScore = score }
    }
  }
  // only accept if reasonably confident
  return bestScore >= 0.6 ? best : null
}

async function fetchOverpass(query) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass error: ${res.status}`)
  return res.json()
}

async function main() {
  console.log('Querying Overpass API...')

  const query = `
[out:json][timeout:90];
(
  way["highway"="path"]["name"](${BBOX});
  way["highway"="track"]["name"](${BBOX});
  way["highway"="footway"]["name"](${BBOX});
);
out geom;
`

  const data = await fetchOverpass(query)
  console.log(`Got ${data.elements.length} OSM ways`)

  // Group segments by matched trail
  // trailNumber -> array of coordinate arrays (each way is one segment)
  const geometries = {}
  const matchLog = {}
  const unmatched = new Set()

  for (const way of data.elements) {
    const osmName = way.tags?.name
    if (!osmName) continue

    const match = matchTrail(osmName)
    if (!match) {
      unmatched.add(osmName)
      continue
    }

    const id = `trail-${match.number}`
    if (!geometries[id]) {
      geometries[id] = []
      matchLog[id] = { trailName: match.name, osmNames: new Set() }
    }

    matchLog[id].osmNames.add(osmName)
    // coords as [lat, lng] to match Leaflet convention
    geometries[id].push(way.geometry.map(pt => [pt.lat, pt.lon]))
  }

  // Summary
  const matched = Object.keys(geometries).length
  console.log(`\nMatched ${matched} / ${TRAILS.length} trails`)
  console.log('\nMatched trails:')
  for (const [id, info] of Object.entries(matchLog)) {
    console.log(`  ${id}: "${info.trailName}" ← ${[...info.osmNames].join(', ')}`)
  }

  const missedTrails = TRAILS.filter(([n]) => !geometries[`trail-${n}`]).map(([n, name]) => `${n} ${name}`)
  if (missedTrails.length) {
    console.log(`\nNo geometry found for ${missedTrails.length} trails:`)
    missedTrails.forEach(t => console.log(`  ${t}`))
  }

  const outPath = path.join(__dirname, '../src/trailGeometries.json')
  fs.writeFileSync(outPath, JSON.stringify(geometries, null, 2))
  console.log(`\nWrote ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
