import { useState, useRef, useEffect } from 'react'
import TrailMap from './TrailMap'
import TrailList from './TrailList'
import TrailDetail from './TrailDetail'
import StatsBar from './StatsBar'
import ImportModal from './ImportModal'
import AuthGate from './AuthGate'
import { useTrails } from './useTrails'
import { parseGpx } from './parseGpx'
import type { GpxTrack } from './types'

type Tab = 'list' | 'map'

async function consumePendingShare(): Promise<GpxTrack | null> {
  try {
    const cache = await caches.open('share-target-v1')
    const response = await cache.match('/hike_tracker/pending-gpx')
    if (!response) return null
    const text = await response.text()
    await cache.delete('/hike_tracker/pending-gpx')
    return parseGpx(text)
  } catch {
    return null
  }
}

function AppInner() {
  const { trails, syncing, toggleComplete, attachGpx } = useTrails()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [pendingTrack, setPendingTrack] = useState<GpxTrack | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef<string | null>(null)

  const selectedTrail = trails.find(t => t.id === selectedId) ?? null

  // Check for incoming GPX share on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('share') === '1') {
      window.history.replaceState({}, '', window.location.pathname)
      consumePendingShare().then(track => {
        if (track) setPendingTrack(track)
      })
    }
  }, [])

  function handleSelectTrail(id: string) {
    setSelectedId(id)
    setActiveTab('map')
  }

  function handleAttachGpx(id: string) {
    pendingIdRef.current = id
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = pendingIdRef.current
    if (!file || !id) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      attachGpx(id, parseGpx(text))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImportConfirm(trailId: string, markComplete: boolean) {
    if (!pendingTrack) return
    attachGpx(trailId, pendingTrack)
    if (markComplete) toggleComplete(trailId)
    setSelectedId(trailId)
    setPendingTrack(null)
    setActiveTab('map')
  }

  if (syncing) return <div className="sync-loading">Loading trails…</div>

  return (
    <div className="app">
      <StatsBar trails={trails} />
      <div className={`app-body tab-${activeTab}`}>
        <aside className="sidebar">
          {selectedTrail ? (
            <TrailDetail
              trail={selectedTrail}
              onToggle={toggleComplete}
              onAttachGpx={handleAttachGpx}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <TrailList
              trails={trails}
              selectedId={selectedId}
              onSelect={handleSelectTrail}
              onToggle={toggleComplete}
            />
          )}
        </aside>
        <main className="map-area">
          <TrailMap
            trails={trails}
            selectedId={selectedId}
            onSelect={id => { setSelectedId(id); setActiveTab('map') }}
          />
        </main>
      </div>

      <nav className="tab-bar">
        <button
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          <span className="tab-icon">☰</span>
          <span className="tab-label">Trails</span>
        </button>
        <button
          className={activeTab === 'map' ? 'active' : ''}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">🗺</span>
          <span className="tab-label">Map</span>
        </button>
      </nav>

      {pendingTrack && (
        <ImportModal
          track={pendingTrack}
          trails={trails}
          onConfirm={handleImportConfirm}
          onDismiss={() => setPendingTrack(null)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <AppInner />
    </AuthGate>
  )
}
