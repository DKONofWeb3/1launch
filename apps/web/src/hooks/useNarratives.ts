'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface Narrative {
  id: string
  title: string
  summary: string
  hype_score: number
  estimated_window: string
  sources: string[]
  suggested_angles: string[]
  suggested_tickers: string[]
  tokens_launched: number
  created_at: string
  expires_at: string
}

interface UseNarrativesReturn {
  narratives: Narrative[]
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

export function useNarratives(): UseNarrativesReturn {
  const [narratives, setNarratives] = useState<Narrative[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchNarratives = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/api/narratives')
      if (res.data.success) {
        setNarratives(res.data.data)
        setLastUpdated(new Date())
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch narratives')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNarratives()
    const interval = setInterval(fetchNarratives, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNarratives])

  return { narratives, loading, error, refresh: fetchNarratives, lastUpdated }
}
