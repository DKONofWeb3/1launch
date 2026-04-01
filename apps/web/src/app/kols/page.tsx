// apps/web/src/app/kols/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

// ── Mock data (delete from DB once real KOLs are added) ───────────────────────
const MOCK_KOLS = [
  {
    id: 'mock_1',
    handle: '@SolanaWhale_X',
    display_name: 'Solana Whale',
    avatar_url: 'https://api.dicebear.com/8.x/shapes/svg?seed=solanawhale&backgroundColor=00FF88',
    chain_focus: ['solana'],
    niches: ['memecoins', 'defi'],
    follower_count: 84200,
    engagement_rate: 7.4,
    price_min: 150,
    price_max: 400,
    delivery_hours: 24,
    services: ['tweet', 'thread', 'spaces'],
    verified: true,
    rating: 4.7,
    rating_count: 38,
    promotions_count: 23,
    status: 'open',
    bio: 'Solana native. Only call what I believe in. 3 years in crypto.',
  },
  {
    id: 'mock_2',
    handle: '@MemecoinKing99',
    display_name: 'Memecoin King',
    avatar_url: 'https://api.dicebear.com/8.x/shapes/svg?seed=memecoinKing&backgroundColor=FF9500',
    chain_focus: ['bsc', 'solana'],
    niches: ['memecoins'],
    follower_count: 42600,
    engagement_rate: 11.2,
    price_min: 80,
    price_max: 250,
    delivery_hours: 48,
    services: ['tweet', 'tg_call'],
    verified: true,
    rating: 4.2,
    rating_count: 61,
    promotions_count: 87,
    status: 'open',
    bio: 'BSC + Solana degen. High engagement community. No rugs.',
  },
  {
    id: 'mock_3',
    handle: '@CryptoNarratives',
    display_name: 'Crypto Narratives',
    avatar_url: 'https://api.dicebear.com/8.x/shapes/svg?seed=cryptoNarr&backgroundColor=3B82F6',
    chain_focus: ['solana'],
    niches: ['memecoins', 'nft', 'gaming'],
    follower_count: 128000,
    engagement_rate: 4.1,
    price_min: 300,
    price_max: 800,
    delivery_hours: 72,
    services: ['tweet', 'thread', 'spaces', 'tg_call'],
    verified: true,
    rating: 3.9,
    rating_count: 24,
    promotions_count: 41,
    status: 'busy',
    bio: 'Narrative-focused content. Quality over quantity.',
  },
  {
    id: 'mock_4',
    handle: '@DegenAlpha_Sol',
    display_name: 'Degen Alpha',
    avatar_url: 'https://api.dicebear.com/8.x/shapes/svg?seed=degenAlpha&backgroundColor=8B5CF6',
    chain_focus: ['solana'],
    niches: ['memecoins', 'defi'],
    follower_count: 19800,
    engagement_rate: 14.7,
    price_min: 50,
    price_max: 150,
    delivery_hours: 24,
    services: ['tweet', 'tg_call'],
    verified: false,
    rating: 4.5,
    rating_count: 12,
    promotions_count: 9,
    status: 'open',
    bio: 'Micro KOL, max engagement. Under 20k but they all listen.',
  },
  {
    id: 'mock_5',
    handle: '@BSCGemFinder',
    display_name: 'BSC Gem Finder',
    avatar_url: 'https://api.dicebear.com/8.x/shapes/svg?seed=bscGem&backgroundColor=FF3B3B',
    chain_focus: ['bsc'],
    niches: ['memecoins', 'defi'],
    follower_count: 67300,
    engagement_rate: 6.8,
    price_min: 120,
    price_max: 350,
    delivery_hours: 48,
    services: ['tweet', 'thread'],
    verified: true,
    rating: 4.0,
    rating_count: 45,
    promotions_count: 56,
    status: 'open',
    bio: 'BSC specialist since 2021. Honest reviews only.',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatFollowers(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => {
          const filled = i <= Math.floor(rating)
          const partial = !filled && i === Math.ceil(rating) && rating % 1 > 0
          return (
            <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? '#FFB800' : partial ? 'url(#half)' : 'none'}
                stroke={filled || partial ? '#FFB800' : '#374151'}
                strokeWidth="1.5"
              />
            </svg>
          )
        })}
      </div>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280' }}>
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  )
}

function EngagementBar({ rate }: { rate: number }) {
  const color = rate >= 10 ? '#00FF88' : rate >= 5 ? '#FF9500' : '#6B7280'
  const label = rate >= 10 ? 'Excellent' : rate >= 5 ? 'Good' : 'Average'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 4, background: '#1E1E2E', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(rate * 5, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700, color }}>{rate}%</span>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{label}</span>
    </div>
  )
}

function ChainBadge({ chain }: { chain: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    solana: { color: '#9945FF', bg: 'rgba(153,69,255,0.1)', label: 'SOL' },
    bsc:    { color: '#F0B90B', bg: 'rgba(240,185,11,0.1)',  label: 'BSC' },
  }
  const c = config[chain] || { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: chain.toUpperCase() }
  return (
    <span style={{ padding: '2px 7px', background: c.bg, border: `1px solid ${c.color}40`, borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: c.color, letterSpacing: '0.06em' }}>
      {c.label}
    </span>
  )
}

function ServiceBadge({ service }: { service: string }) {
  const labels: Record<string, string> = {
    tweet: 'Tweet', thread: 'Thread', spaces: 'Spaces', tg_call: 'TG Call'
  }
  return (
    <span style={{ padding: '2px 7px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#6B7280' }}>
      {labels[service] || service}
    </span>
  )
}

function ReportModal({ kol, onClose }: { kol: any; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
    onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '28px 32px', maxWidth: 440, width: '100%' }}
      >
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
              <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-5" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>Report submitted</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>We'll review this within 48 hours.</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>Report {kol.handle}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 20 }}>Help us keep the marketplace clean</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['Fake engagement / bot followers', 'Scam / rug pulled projects', 'Didn\'t deliver promised service', 'Misleading pricing', 'Other'].map(r => (
                <div
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer', borderRadius: 6,
                    background: reason === r ? 'rgba(255,59,59,0.08)' : '#0A0A0F',
                    border: `1px solid ${reason === r ? 'rgba(255,59,59,0.3)' : '#1E1E2E'}`,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
                    color: reason === r ? '#FF6B6B' : '#6B7280',
                    transition: 'all 0.15s',
                  }}
                >
                  {r}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => reason && setSubmitted(true)}
                disabled={!reason}
                style={{ flex: 1, padding: '9px 0', background: reason ? 'rgba(255,59,59,0.15)' : '#1E1E2E', border: `1px solid ${reason ? 'rgba(255,59,59,0.3)' : 'transparent'}`, borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: reason ? '#FF6B6B' : '#4B5563', cursor: reason ? 'pointer' : 'not-allowed' }}
              >
                Submit Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function KOLCard({ kol, onBook, onReport }: { kol: any; onBook: () => void; onReport: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#12121C' : '#0E0E16',
        border: `1px solid ${hovered ? '#2A2A3E' : '#1E1E2E'}`,
        borderRadius: 14, padding: '20px',
        transition: 'all 0.2s',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}
    >
      {/* Status dot */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: kol.status === 'open' ? '#00FF88' : '#FF9500',
          boxShadow: kol.status === 'open' ? '0 0 6px #00FF88' : 'none',
        }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: kol.status === 'open' ? '#00FF88' : '#FF9500', fontWeight: 600 }}>
          {kol.status === 'open' ? 'Available' : 'Busy'}
        </span>
      </div>

      {/* Header: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={kol.avatar_url}
            alt={kol.display_name}
            width={56} height={56}
            style={{ borderRadius: '50%', border: '2px solid #1E1E2E', display: 'block' }}
          />
          {kol.verified && (
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0A0A0F' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 12l2 2 4-4" fill="#3B82F6" stroke="none"/>
                <circle cx="12" cy="12" r="9" fill="#3B82F6" opacity="0.15"/>
                <path d="M9 12l2 2 4-4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#F9FAFB', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kol.display_name}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
            {kol.handle}
          </div>
        </div>
      </div>

      {/* Bio */}
      <p style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280',
        lineHeight: 1.6, marginBottom: 16,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      } as any}>
        {kol.bio}
      </p>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Followers', value: formatFollowers(kol.follower_count) },
          { label: 'Promoted', value: `${kol.promotions_count} tokens` },
          { label: 'Delivery', value: `${kol.delivery_hours}h` },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '8px 10px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6, textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Engagement rate */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 6 }}>ENGAGEMENT RATE</div>
        <EngagementBar rate={kol.engagement_rate} />
      </div>

      {/* Star rating */}
      <div style={{ marginBottom: 14 }}>
        <StarRating rating={kol.rating} count={kol.rating_count} />
      </div>

      {/* Chain + service badges */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 14 }}>
        {kol.chain_focus.map((c: string) => <ChainBadge key={c} chain={c} />)}
        {kol.services.map((s: string) => <ServiceBadge key={s} service={s} />)}
      </div>

      {/* Price + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #1E1E2E' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 2 }}>PRICE RANGE</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700, color: '#00FF88' }}>
            ${kol.price_min}–${kol.price_max}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Report button */}
          <button
            onClick={onReport}
            title="Report this KOL"
            style={{ width: 32, height: 32, borderRadius: 6, background: 'transparent', border: '1px solid #1E1E2E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,59,59,0.4)'; e.currentTarget.style.background = 'rgba(255,59,59,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#FF3B3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 22v-7" stroke="#FF3B3B" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Book button */}
          <button
            onClick={onBook}
            disabled={kol.status === 'busy'}
            style={{
              padding: '8px 18px',
              background: kol.status === 'open' ? '#00FF88' : '#1E1E2E',
              color: kol.status === 'open' ? '#0A0A0F' : '#4B5563',
              border: 'none', borderRadius: 6,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
              cursor: kol.status === 'open' ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {kol.status === 'open' ? 'Book' : 'Busy'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KOLMarketplacePage() {
  const [kols, setKols] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reportTarget, setReportTarget] = useState<any>(null)
  const [bookTarget, setBookTarget] = useState<any>(null)
  const [filterChain, setFilterChain] = useState<string>('all')
  const [filterNiche, setFilterNiche] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('engagement')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Try to fetch from API, fall back to mock data
    api.get('/api/kols')
      .then(res => {
        if (res.data.success && res.data.data?.length > 0) {
          setKols(res.data.data)
        } else {
          setKols(MOCK_KOLS)
        }
      })
      .catch(() => setKols(MOCK_KOLS))
      .finally(() => setLoading(false))
  }, [])

  // Filter + sort
  const filtered = kols
    .filter(k => {
      if (filterChain !== 'all' && !k.chain_focus.includes(filterChain)) return false
      if (filterNiche !== 'all' && !k.niches.includes(filterNiche)) return false
      if (search && !k.display_name.toLowerCase().includes(search.toLowerCase()) &&
          !k.handle.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'engagement') return b.engagement_rate - a.engagement_rate
      if (sortBy === 'followers') return b.follower_count - a.follower_count
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'price_low') return a.price_min - b.price_min
      if (sortBy === 'promotions') return b.promotions_count - a.promotions_count
      return 0
    })

  const availableCount = kols.filter(k => k.status === 'open').length

  return (
    <div className="dashboard-layout" style={{ position: 'relative' }}>

      {/* Coming Soon overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        padding: '40px 20px',
      }}>
        <div style={{
          transform: 'rotate(-3deg)',
          background: '#0A0A0F',
          border: '2px solid #00FF88',
          borderRadius: 16,
          padding: '32px 48px',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(0,255,136,0.15), 0 0 0 1px rgba(0,255,136,0.1)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12 }}>
            Coming Soon
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 8 }}>
            KOL Marketplace
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563', maxWidth: 280, lineHeight: 1.7 }}>
            Vetted crypto influencers, ranked by engagement rate. Book directly through 1launch.
          </div>
        </div>
      </div>

      {/* Blurred content behind */}
      <div style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="page-title">KOL Marketplace</h1>
            <p className="page-subtitle">
              {availableCount} influencers available · Vetted for engagement quality
            </p>
          </div>
          <div style={{
            padding: '8px 14px',
            background: 'rgba(0,255,136,0.06)',
            border: '1px solid rgba(0,255,136,0.15)',
            borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88',
          }}>
            15% platform fee on bookings
          </div>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" stroke="#4B5563" strokeWidth="1.5"/>
              <path d="m21 21-4.35-4.35" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name or handle..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 32px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB', outline: 'none' }}
            />
          </div>

          {/* Chain filter */}
          <select
            value={filterChain}
            onChange={e => setFilterChain(e.target.value)}
            style={{ padding: '8px 12px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Chains</option>
            <option value="solana">Solana</option>
            <option value="bsc">BSC</option>
          </select>

          {/* Niche filter */}
          <select
            value={filterNiche}
            onChange={e => setFilterNiche(e.target.value)}
            style={{ padding: '8px 12px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Niches</option>
            <option value="memecoins">Memecoins</option>
            <option value="defi">DeFi</option>
            <option value="nft">NFT</option>
            <option value="gaming">Gaming</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', outline: 'none' }}
          >
            <option value="engagement">Sort: Engagement</option>
            <option value="followers">Sort: Followers</option>
            <option value="rating">Sort: Rating</option>
            <option value="price_low">Sort: Price Low</option>
            <option value="promotions">Sort: Most Active</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', marginBottom: 16 }}>
        {filtered.length} KOL{filtered.length !== 1 ? 's' : ''} found
        {(filterChain !== 'all' || filterNiche !== 'all' || search) && ' · filtered'}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 380, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>No KOLs found</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#1E1E2E' }}>Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(kol => (
            <KOLCard
              key={kol.id}
              kol={kol}
              onBook={() => setBookTarget(kol)}
              onReport={() => setReportTarget(kol)}
            />
          ))}
        </div>
      )}

      {/* Report modal */}
      {reportTarget && (
        <ReportModal kol={reportTarget} onClose={() => setReportTarget(null)} />
      )}

      {/* Book modal - simple for now, full flow in Phase 5 with payments */}
      {bookTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setBookTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '28px 32px', maxWidth: 440, width: '100%' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>Book {bookTarget.display_name}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 20 }}>
              {bookTarget.handle} · ${bookTarget.price_min}–${bookTarget.price_max} · {bookTarget.delivery_hours}h delivery
            </div>
            <div style={{ padding: '14px 16px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500', marginBottom: 20 }}>
              Payment integration coming in Phase 5. For now, contact this KOL directly on X/Twitter.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBookTarget(null)} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Close</button>
              <a
                href={`https://x.com/${bookTarget.handle.replace('@', '')}`}
                target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '9px 0', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' as const, display: 'block' }}
              >
                View on X
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      </div>
    </div>
  )
}