import { useState, useEffect } from 'react'
import type { Trail, GpxTrack } from './types'
import { DEFAULT_TRAILS } from './trails'

const STORAGE_KEY = 'pisgah400-trails'

function loadTrails(): Trail[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as Trail[]
  } catch {
    // ignore
  }
  return DEFAULT_TRAILS
}

export function useTrails() {
  const [trails, setTrails] = useState<Trail[]>(loadTrails)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trails))
  }, [trails])

  function toggleComplete(id: string) {
    setTrails(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        const nowCompleted = !t.completed
        return {
          ...t,
          completed: nowCompleted,
          completedDate: nowCompleted
            ? (t.gpxTrack?.date ?? new Date().toISOString().split('T')[0])
            : undefined,
        }
      })
    )
  }

  function attachGpx(id: string, track: GpxTrack) {
    setTrails(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        return {
          ...t,
          gpxTrack: track,
          // if already marked complete, update date from GPX
          completedDate: t.completed && track.date ? track.date : t.completedDate,
        }
      })
    )
  }

  function addTrail(name: string) {
    const id = `trail-custom-${Date.now()}`
    setTrails(prev => [...prev, { id, number: '', name, completed: false }])
  }

  return { trails, toggleComplete, attachGpx, addTrail }
}
