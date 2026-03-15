import { useState, useEffect } from 'react'
import type { Trail, GpxTrack } from './types'
import { DEFAULT_TRAILS } from './trails'
import { supabase } from './supabase'

type TrailState = Pick<Trail, 'completed' | 'completedDate' | 'gpxTrack'>

async function loadFromSupabase(): Promise<Trail[]> {
  const { data, error } = await supabase
    .from('trail_states')
    .select('trail_id, completed, completed_date, gpx_track')

  if (error || !data) return DEFAULT_TRAILS

  const stateMap = new Map<string, TrailState>()
  for (const row of data) {
    stateMap.set(row.trail_id, {
      completed: row.completed,
      completedDate: row.completed_date ?? undefined,
      gpxTrack: row.gpx_track ?? undefined,
    })
  }

  return DEFAULT_TRAILS.map(t => ({ ...t, ...stateMap.get(t.id) }))
}

async function upsertTrail(trail: Trail) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('trail_states').upsert({
    trail_id: trail.id,
    user_id: user.id,
    completed: trail.completed,
    completed_date: trail.completedDate ?? null,
    gpx_track: trail.gpxTrack ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'trail_id,user_id' })
}

export function useTrails() {
  const [trails, setTrails] = useState<Trail[]>(DEFAULT_TRAILS)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    loadFromSupabase().then(loaded => {
      setTrails(loaded)
      setSyncing(false)
    })
  }, [])

  function updateTrail(id: string, patch: Partial<Trail>) {
    setTrails(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t)
      const updated = next.find(t => t.id === id)!
      upsertTrail(updated)
      return next
    })
  }

  function toggleComplete(id: string) {
    const trail = trails.find(t => t.id === id)!
    const nowCompleted = !trail.completed
    updateTrail(id, {
      completed: nowCompleted,
      completedDate: nowCompleted
        ? (trail.gpxTrack?.date ?? new Date().toISOString().split('T')[0])
        : undefined,
    })
  }

  function attachGpx(id: string, track: GpxTrack) {
    const trail = trails.find(t => t.id === id)!
    updateTrail(id, {
      gpxTrack: track,
      completedDate: trail.completed && track.date ? track.date : trail.completedDate,
    })
  }

  function addTrail(name: string) {
    const id = `trail-custom-${Date.now()}`
    const newTrail: Trail = { id, number: '', name, completed: false }
    setTrails(prev => [...prev, newTrail])
    upsertTrail(newTrail)
  }

  return { trails, syncing, toggleComplete, attachGpx, addTrail }
}
