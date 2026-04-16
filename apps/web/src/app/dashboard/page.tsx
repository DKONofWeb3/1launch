// apps/web/src/app/dashboard/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useNarratives } from '@/hooks/useNarratives'
import { NarrativeCard } from '@/components/narrative/NarrativeCard'
import { IconSignal, IconPulse } from '@/components/ui/Icons'
import type { Narrative } from '@/hooks/useNarratives'

function SkeletonCard() {
  return (
    <div className="narrative-card" style={{ opacity: 0.5 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="skeleton-block" style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-block" style={{ width: '55%', height: 13, marginBottom: 10, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '90%', height: 10, marginBottom: 6, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '70%', height: 10, marginBottom: 16, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-block" style={{ width: 50, height: 22, borderRadius: 4 }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { narratives, loading, error, refresh, lastUpdated } = useNarratives()
  const router = useRouter()

  const handleLaunch = (narrative: Narrative) => {
    router.push(`/launch?narrative=${narrative.id}`)
  }

  return (
    <div className="dashboard-layout">
      {/* Minimal header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900,
            color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 4,
          }}>
            What is the internet talking about?
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Live narrative signals — updated every 30 minutes'
            }
          </p>
        </div>
        <button onClick={refresh} className="refresh-btn" disabled={loading}>
          <IconPulse size={13} color={loading ? '#6B7280' : '#0A0A0F'} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <IconSignal size={14} color="#FF3B3B" />
          <span>Failed to load — {error}</span>
          <button onClick={refresh} style={{ color: '#00FF88', fontSize: 12, marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      <div className="narrative-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : narratives.map((narrative, i) => (
              <NarrativeCard
                key={narrative.id}
                narrative={narrative}
                index={i}
                onLaunch={handleLaunch}
              />
            ))
        }

        {!loading && narratives.length === 0 && !error && (
          <div className="empty-state">
            <IconSignal size={36} color="#1E1E2E" />
            <p>No active narratives</p>
            <span>Check back in 30 minutes</span>
          </div>
        )}
      </div>
    </div>
  )
}
