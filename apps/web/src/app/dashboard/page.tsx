'use client'

import { useRouter } from 'next/navigation'
import { useNarratives } from '@/hooks/useNarratives'
import { NarrativeCard } from '@/components/narrative/NarrativeCard'
import { IconSignal, IconTrendingUp, IconFire, IconPulse } from '@/components/ui/Icons'
import type { Narrative } from '@/hooks/useNarratives'

function SkeletonCard() {
  return (
    <div className="narrative-card" style={{ opacity: 0.5 }}>
      <div className="flex items-start gap-4">
        <div className="skeleton-block" style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0 }} />
        <div className="flex-1">
          <div className="skeleton-block" style={{ width: '55%', height: 13, marginBottom: 10, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '90%', height: 10, marginBottom: 6, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '70%', height: 10, marginBottom: 16, borderRadius: 4 }} />
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-block" style={{ width: 50, height: 22, borderRadius: 4 }} />
            ))}
          </div>
          <div className="skeleton-block" style={{ width: '35%', height: 10, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}

function StatsBar({ narratives }: { narratives: Narrative[] }) {
  const hot = narratives.filter((n) => n.hype_score >= 60).length
  const avgScore =
    narratives.length > 0
      ? Math.round(narratives.reduce((a, b) => a + b.hype_score, 0) / narratives.length)
      : 0

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <IconSignal size={14} color="#00FF88" />
        <span className="stat-value">{narratives.length}</span>
        <span className="stat-label">active narratives</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <IconFire size={14} color="#FF9500" />
        <span className="stat-value">{hot}</span>
        <span className="stat-label">hot signals</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <IconTrendingUp size={14} color="#6B7280" />
        <span className="stat-value">{avgScore}</span>
        <span className="stat-label">avg hype score</span>
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Narrative Feed</h1>
          <p className="page-subtitle">
            Live signals from Reddit, DexScreener, CoinGecko — ranked by momentum
          </p>
        </div>
        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={refresh} className="refresh-btn" disabled={loading}>
            <IconPulse size={14} color={loading ? '#6B7280' : '#0A0A0F'} />
            {loading ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!loading && narratives.length > 0 && <StatsBar narratives={narratives} />}

      {error && (
        <div className="error-banner">
          <IconSignal size={14} color="#FF3B3B" />
          <span>Failed to load narratives — {error}</span>
          <button onClick={refresh} style={{ color: '#00FF88', fontSize: 12, marginLeft: 8 }}>
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
            ))}

        {!loading && narratives.length === 0 && !error && (
          <div className="empty-state">
            <IconSignal size={36} color="#1E1E2E" />
            <p>No active narratives</p>
            <span>Cron runs every 30 minutes — check back shortly</span>
          </div>
        )}
      </div>
    </div>
  )
}
