import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import TrailMap from './TrailMap'
import TrailList from './TrailList'
import TrailDetail from './TrailDetail'
import StatsBar from './StatsBar'
import ImportModal from './ImportModal'
import BulkImportPanel from './BulkImportModal'
import SplitModal from './SplitModal'
import AuthGate from './AuthGate'
import { useTrails } from './useTrails'
import { parseGpx } from './parseGpx'
import type { GpxTrack } from './types'
import type { PendingImport } from './BulkImportModal'

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
  const { trails, syncing, toggleComplete, attachGpx, removeGpx, updateGpxDate } = useTrails()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('list')
  const [pendingTrack, setPendingTrack] = useState<GpxTrack | null>(null)
  const [bulkPending, setBulkPending] = useState<PendingImport[] | null>(null)
  const [bulkPreviewIndex, setBulkPreviewIndex] = useState<number | null>(null)
  const [bulkPreviewData, setBulkPreviewData] = useState<{ points: [number, number][]; trailId: string } | null>(null)
  const [splitTarget, setSplitTarget] = useState<{ trailId: string; trackIndex: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkInputRef = useRef<HTMLInputElement>(null)
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
    attachGpx(trailId, pendingTrack, markComplete)
    setSelectedId(trailId)
    setPendingTrack(null)
    setActiveTab('map')
  }

  async function readGpxFiles(files: File[]): Promise<PendingImport[]> {
    const results: PendingImport[] = []
    for (const file of files) {
      const text = await file.text()
      results.push({ filename: file.name, track: parseGpx(text) })
    }
    return results
  }

  async function handleBulkFiles(files: File[]) {
    const gpxFiles = files.filter(f => f.name.toLowerCase().endsWith('.gpx'))
    const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'))

    const imports: PendingImport[] = []

    // Direct GPX files
    imports.push(...await readGpxFiles(gpxFiles))

    // Extract GPX from zip(s)
    for (const zipFile of zipFiles) {
      const zip = await JSZip.loadAsync(await zipFile.arrayBuffer())
      const gpxEntries = Object.values(zip.files).filter(
        f => !f.dir && f.name.toLowerCase().endsWith('.gpx')
      )
      for (const entry of gpxEntries) {
        const text = await entry.async('text')
        imports.push({ filename: entry.name.split('/').pop() ?? entry.name, track: parseGpx(text) })
      }
    }

    if (imports.length > 0) setBulkPending(imports)
  }

  async function handleBulkInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > 0) await handleBulkFiles(files)
  }

  function handleBulkPreview(index: number | null, data: { points: [number, number][]; trailId: string } | null) {
    setBulkPreviewIndex(index)
    setBulkPreviewData(data)
    if (data) setActiveTab('map')
  }

  function handleBulkConfirm(imports: { trailId: string; track: GpxTrack; markComplete: boolean }[]) {
    for (const { trailId, track, markComplete } of imports) {
      attachGpx(trailId, track, markComplete)
    }
    setBulkPending(null)
    setBulkPreviewIndex(null)
    setBulkPreviewData(null)
  }

  function handleSplitTrack(trailId: string, trackIndex: number) {
    setSplitTarget({ trailId, trackIndex })
  }

  function handleSplitConfirm(splits: { trailId: string; track: GpxTrack }[]) {
    if (!splitTarget) return
    // Remove the original track
    removeGpx(splitTarget.trailId, splitTarget.trackIndex)
    // Attach each split segment to its trail
    for (const { trailId, track } of splits) {
      attachGpx(trailId, track)
    }
    setSplitTarget(null)
  }

  function handleBulkDismiss() {
    setBulkPending(null)
    setBulkPreviewIndex(null)
    setBulkPreviewData(null)
  }

  if (syncing) return <div className="sync-loading">Loading trails…</div>

  return (
    <div className="app">
      <StatsBar trails={trails} />
      <div className={`app-body tab-${activeTab}`}>
        <aside className="sidebar">
          {bulkPending ? (
            <BulkImportPanel
              pending={bulkPending}
              trails={trails}
              previewIndex={bulkPreviewIndex}
              onPreview={(index, data) => handleBulkPreview(index, data)}
              onConfirm={handleBulkConfirm}
              onDismiss={handleBulkDismiss}
            />
          ) : selectedTrail ? (
            <TrailDetail
              trail={selectedTrail}
              onToggle={toggleComplete}
              onAttachGpx={handleAttachGpx}
              onRemoveGpx={removeGpx}
              onUpdateGpxDate={updateGpxDate}
              onSplitTrack={handleSplitTrack}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <TrailList
              trails={trails}
              selectedId={selectedId}
              onSelect={handleSelectTrail}
              onToggle={toggleComplete}
              onBulkImport={() => bulkInputRef.current?.click()}
            />
          )}
        </aside>
        <main className="map-area">
          <TrailMap
            trails={trails}
            selectedId={bulkPreviewData?.trailId ?? selectedId}
            onSelect={id => { setSelectedId(id); setActiveTab('map') }}
            previewTrack={bulkPreviewData?.points ?? null}
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

      {splitTarget && (() => {
        const t = trails.find(t => t.id === splitTarget.trailId)
        return t ? (
          <SplitModal
            trail={t}
            trackIndex={splitTarget.trackIndex}
            trails={trails}
            onConfirm={handleSplitConfirm}
            onDismiss={() => setSplitTarget(null)}
          />
        ) : null
      })()}

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={bulkInputRef}
        type="file"
        accept=".gpx,.zip"
        multiple
        style={{ display: 'none' }}
        onChange={handleBulkInputChange}
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
