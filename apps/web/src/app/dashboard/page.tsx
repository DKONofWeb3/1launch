'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNarratives } from '@/hooks/useNarratives'
import { NarrativeCard } from '@/components/narrative/NarrativeCard'
import { IconSignal, IconPulse } from '@/components/ui/Icons'
import { api } from '@/lib/api'
import type { Narrative } from '@/hooks/useNarratives'

interface AlphaCoin {
  name: string; ticker: string; chain: string
  market_cap: number; change_pct: number; narrative: string; dex_url: string
}

function SkeletonCard() {
  return (
    <div className="narrative-card" style={{ opacity: 0.5 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="skeleton-block" style={{ width: 68, height: 68, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-block" style={{ width: '55%', height: 13, marginBottom: 10, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '90%', height: 10, marginBottom: 6,  borderRadius: 4 }} />
          <div className="skeleton-block" style={{ width: '70%', height: 10, marginBottom: 16, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-block" style={{ width: 50, height: 22, borderRadius: 4 }} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtMc(n: number) {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

const FALLBACK_COINS: AlphaCoin[] = [
  { name: 'Fartcoin', ticker: 'FARTCOIN', chain: 'solana', market_cap: 890000000, change_pct: 4200, narrative: 'Meme gas prices',        dex_url: 'https://dexscreener.com/solana/9bb5j4q5plnjpqpzmrxzm9rzeulzm8pkwbxgtcmacpump' },
  { name: 'Moo Deng', ticker: 'MOODENG',  chain: 'solana', market_cap: 290000000, change_pct: 2800, narrative: 'Viral baby hippo',        dex_url: 'https://dexscreener.com/solana/ed5nyywneric3dyuvv1wumuvqbml7t7dxvpicq5z5r5r' },
  { name: 'Pnut',     ticker: 'PNUT',     chain: 'solana', market_cap: 180000000, change_pct: 3100, narrative: 'Squirrel execution news', dex_url: 'https://dexscreener.com/solana/2qehjdpj9yhvdtbcqryrfpd9bx4fpj9a3wejnaae7qvj' },
  { name: 'Act I',    ticker: 'ACT',      chain: 'solana', market_cap: 320000000, change_pct: 1900, narrative: 'AI agent narrative',      dex_url: 'https://dexscreener.com/solana/gktrzagmzubksb4jf4d5txdbm5bgxnhkxmm7avdnbpum' },
  { name: 'Goatseus', ticker: 'GOAT',     chain: 'solana', market_cap: 560000000, change_pct: 5100, narrative: 'AI agent goes viral',     dex_url: 'https://dexscreener.com/solana/cznxbzfiqe9y4bvjpkdyupjntx7lktxwnaxfqrdvgdvy' },
  { name: 'Zerebro',  ticker: 'ZEREBRO',  chain: 'solana', market_cap: 120000000, change_pct: 890,  narrative: 'Autonomous AI narrative', dex_url: 'https://dexscreener.com' },
  { name: 'Sigma',    ticker: 'SIGMA',    chain: 'solana', market_cap: 95000000,  change_pct: 1200, narrative: 'Sigma male meme cycle',   dex_url: 'https://dexscreener.com' },
  { name: 'CatWif',   ticker: 'CATWIF',   chain: 'solana', market_cap: 430000000, change_pct: 2400, narrative: 'Dog wif hat derivative',  dex_url: 'https://dexscreener.com' },
]



export default function DashboardPage() {
  const { narratives, loading, error, refresh, lastUpdated } = useNarratives()
  const router                = useRouter()
  const [visible, setVisible] = useState(8)

  const handleLaunch = (narrative: Narrative) => router.push(`/launch?narrative=${narrative.id}`)

  const shown   = narratives.slice(0, visible)
  const hasMore = narratives.length > visible

  return (
    <div className="dashboard-layout">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 4 }}>
            What is the internet talking about?
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live narrative signals — updated every 30 minutes'}
          </p>
        </div>
        <button onClick={refresh} className="refresh-btn" disabled={loading}>
          <IconPulse size={13} color={loading ? '#6B7280' : '#0A0A0F'} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

     

      {error && (
        <div className="error-banner" style={{ marginBottom: 16 }}>
          <IconSignal size={14} color="#FF3B3B" />
          <span>Failed to load — {error}</span>
          <button onClick={refresh} style={{ color: '#00FF88', fontSize: 12, marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      <div className="narrative-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : shown.map((narrative, i) => (
              <NarrativeCard key={narrative.id} narrative={narrative} index={i} onLaunch={handleLaunch} />
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

      {!loading && hasMore && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setVisible(v => Math.min(v + 12, 20))}
            style={{ padding: '10px 28px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)'; e.currentTarget.style.color = '#00FF88' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.color = '#6B7280' }}
          >
            View {Math.min(narratives.length - visible, 12)} more narratives
          </button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}