# Pisgah 400 Hike Tracker

A React web app to track completion of the Carolina Mountain Club Pisgah 400 challenge — 121 trails in the Pisgah National Forest, NC. Replaces a paper map. Data comes from WorkOutDoors app → GPX export → imported into the app.

## Running locally

```bash
npm run dev
```

Requires `.env.local` in the project root (not committed):
```
VITE_SUPABASE_URL=https://sqmkhffneduewfjrrxoh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Stack

- **Vite + React + TypeScript**
- **Leaflet + react-leaflet** — interactive map
- **Supabase** — email/password auth + cloud DB for trail state sync across devices

## Key architecture

- **Trail list** is static in `src/trails.ts` — 121 trails with official CMC numbers (e.g. "006", "118A")
- **Trail state** (completed, date, GPX data) lives in Supabase `trail_states` table, loaded on login and upserted on every change
- **OSM geometries** are pre-fetched and stored in `src/trailGeometries.json` — not fetched at runtime. Regenerate with `node scripts/fetch-geometries.mjs`
- **GPX parsing** is fully client-side (`src/parseGpx.ts`); extracts date, distance (haversine), duration, and elevation gain from WorkOutDoors GPX exports

## Supabase

- Project: `https://sqmkhffneduewfjrrxoh.supabase.co`
- Table: `trail_states` (trail_id, user_id, completed, completed_date, gpx_track jsonb, updated_at)
- RLS enabled — users only access their own rows

## Geometry fetch script

`scripts/fetch-geometries.mjs` queries the Overpass API for all named paths/tracks in the Pisgah bounding box and fuzzy-matches them to the trail list by name. To fix a mismatch between our trail name and the OSM name, add an entry to the `ALIASES` map at the top of the script, then re-run:

```bash
node scripts/fetch-geometries.mjs
```

## Trails without OSM geometry (13)

These appear in the list but have no map polyline:
110, 130, 288, 320, 321A, 322, 344, 349, 356A, 358A, 358B, 440, 617A

## Planned features

- **GitHub Pages deploy** — needs `base: '/hike_tracker/'` in vite.config.ts + GitHub Actions workflow with secrets for env vars
- **Search / filter** — search by name or number, filter by complete/incomplete
- **Bulk GPX import** — drag-and-drop multiple GPX files, auto-match to trails by name
- **iOS Share Sheet (PWA)** — manifest.json + service worker so WorkOutDoors can share GPX directly to the app; requires HTTPS + installed to home screen + iOS 16.4+
