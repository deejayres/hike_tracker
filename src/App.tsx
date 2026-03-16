import { useState, useRef } from 'react'
import TrailMap from './TrailMap'
import TrailList from './TrailList'
import TrailDetail from './TrailDetail'
import StatsBar from './StatsBar'
import AuthGate from './AuthGate'
import { useTrails } from './useTrails'
import { parseGpx } from './parseGpx'

function AppInner() {
  const { trails, syncing, toggleComplete, attachGpx } = useTrails()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingIdRef = useRef<string | null>(null)

  const selectedTrail = trails.find(t => t.id === selectedId) ?? null

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

  if (syncing) return <div className="sync-loading">Loading trails…</div>

  return (
    <div className="app">
      <StatsBar trails={trails} />
      <div className="app-body">
      <aside className="sidebar">
        <TrailList
          trails={trails}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={toggleComplete}
        />
        {selectedTrail && (
          <TrailDetail
            trail={selectedTrail}
            onToggle={toggleComplete}
            onAttachGpx={handleAttachGpx}
          />
        )}
      </aside>
      <main className="map-area">
        <TrailMap
          trails={trails}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </main>
      </div>
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
