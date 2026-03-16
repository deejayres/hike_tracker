const SHARE_CACHE = 'share-target-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === '/hike_tracker/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request))
  }
})

async function handleShare(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('gpx')
    if (!file) return Response.redirect('/hike_tracker/', 303)

    const text = await file.text()
    const cache = await caches.open(SHARE_CACHE)
    await cache.put('/hike_tracker/pending-gpx', new Response(text, {
      headers: {
        'Content-Type': 'application/gpx+xml',
        'X-Filename': file.name ?? 'track.gpx',
      }
    }))
  } catch (e) {
    console.error('Share handler error', e)
  }
  return Response.redirect('/hike_tracker/?share=1', 303)
}
