// apps/web/src/app/dashboard/tokens/[id]/analytics/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

function shortAddr(addr: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function ExplorerLink({ address, chain }: { address: string; chain: string }) {
  const base = chain === 'solana'
    ? `https://solscan.io/account/${address}`
    : `https://testnet.bscscan.com/address/${address}`
  return (
    <a
      href={base}
      target="_blank"
      rel="noreferrer"
      style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', textDecoration: 'none' }}
    >
      {shortAddr(address)}
    </a>
  )
}

function RiskBadge({ label }: { label: string }) {
  const config: Record<string, { color: string; bg: string; text: string }> = {
    mega_whale: { color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)',  text: 'Mega Whale' },
    whale:      { color: '#FF9500', bg: 'rgba(255,149,0,0.1)',  text: 'Whale' },
    holder:     { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', text: 'Holder' },
    sniper:     { color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)',  text: 'Sniper' },
  }
  const c = config[label] || config.holder
  return (
    <span style={{
      padding: '2px 8px',
      background: c.bg,
      border: `1px solid ${c.color}40`,
      borderRadius: 4,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 9, fontWeight: 700,
      color: c.color, letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    }}>
      {c.text}
    </span>
  )
}

export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()

  const [token, setToken] = useState<any>(null)
  const [snipers, setSnipers] = useState<any[]>([])
  const [holders, setHolders] = useState<any[]>([])
  const [loadingSnipers, setLoadingSnipers] = useState(false)
  const [loadingHolders, setLoadingHolders] = useState(false)
  const [activeTab, setActiveTab] = useState<'snipers' | 'whales'>('snipers')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/api/launched-tokens/${params.id}`)
      .then(res => { if (res.data.success) setToken(res.data.data) })
  }, [params.id])

  async function fetchSnipers() {
    setLoadingSnipers(true)
    setError(null)
    try {
      const res = await api.get(`/api/analytics/${params.id}/snipers`)
      if (res.data.success) setSnipers(res.data.data)
      else setError(res.data.error)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingSnipers(false)
    }
  }

  async function fetchHolders() {
    setLoadingHolders(true)
    setError(null)
    try {
      const res = await api.get(`/api/analytics/${params.id}/holders`)
      if (res.data.success) setHolders(res.data.data)
      else setError(res.data.error)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingHolders(false)
    }
  }

  function handleTabChange(tab: 'snipers' | 'whales') {
    setActiveTab(tab)
    setError(null)
    if (tab === 'snipers' && snipers.length === 0) fetchSnipers()
    if (tab === 'whales' && holders.length === 0) fetchHolders()
  }

  const draft = token?.token_drafts
  const whales = holders.filter(h => h.is_whale)

  return (
    <div className="dashboard-layout">
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to token
      </button>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">On-Chain Analytics</h1>
          <p className="page-subtitle">
            Sniper tracker and whale monitor for {draft?.name} (${draft?.ticker})
          </p>
        </div>
        <button
          onClick={() => activeTab === 'snipers' ? fetchSnipers() : fetchHolders()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M4 4v5h5M20 20v-5h-5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {([
          { id: 'snipers', label: 'Sniper Tracker', count: snipers.length },
          { id: 'whales',  label: 'Whale Monitor',  count: whales.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              background: activeTab === tab.id ? 'rgba(0,255,136,0.1)' : 'transparent',
              border: `1px solid ${activeTab === tab.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
              borderRadius: 6, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
              color: activeTab === tab.id ? '#00FF88' : '#6B7280',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                padding: '1px 6px',
                background: activeTab === tab.id ? 'rgba(0,255,136,0.15)' : '#1E1E2E',
                borderRadius: 10,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
                color: activeTab === tab.id ? '#00FF88' : '#6B7280',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sniper Tracker */}
      {activeTab === 'snipers' && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E1E2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>
                Sniper Wallets
              </span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', marginLeft: 10 }}>
                Wallets that bought within the first 3 blocks
              </span>
            </div>
            {snipers.length === 0 && !loadingSnipers && (
              <button onClick={fetchSnipers} style={{ padding: '6px 14px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Scan Now
              </button>
            )}
          </div>

          {loadingSnipers ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Scanning on-chain data...</div>
            </div>
          ) : snipers.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>No snipers detected</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#1E1E2E' }}>
                Either no one sniped your launch or the token is too new to have on-chain data
              </div>
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
                {['Wallet', 'Block Delta', 'Block #', 'Status'].map(h => (
                  <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
                ))}
              </div>
              {snipers.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12,
                    padding: '12px 20px',
                    borderBottom: i < snipers.length - 1 ? '1px solid #0A0A0F' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <ExplorerLink address={s.address} chain={token?.chain || 'bsc'} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: s.blockDiff === 0 ? '#FF3B3B' : s.blockDiff <= 1 ? '#FF9500' : '#9CA3AF' }}>
                    +{s.blockDiff} blocks
                  </span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                    {s.blockNumber?.toLocaleString()}
                  </span>
                  <RiskBadge label="sniper" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Whale Monitor */}
      {activeTab === 'whales' && (
        <div>
          {/* Summary cards */}
          {holders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Holders',  value: String(holders.length) },
                { label: 'Whales (>1%)',   value: String(whales.length) },
                { label: 'Top 10 Hold',    value: `${holders.slice(0, 10).reduce((s, h) => s + h.percentage, 0).toFixed(1)}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 700, color: '#F9FAFB' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E1E2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>
                  Holder Distribution
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', marginLeft: 10 }}>
                  Top 50 holders — whales highlighted
                </span>
              </div>
              {holders.length === 0 && !loadingHolders && (
                <button onClick={fetchHolders} style={{ padding: '6px 14px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Scan Now
                </button>
              )}
            </div>

            {loadingHolders ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Fetching holder data...</div>
              </div>
            ) : holders.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>No holder data yet</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#1E1E2E' }}>
                  Token needs on-chain activity to show holder distribution
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 80px', gap: 12, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
                  {['#', 'Wallet', 'Holdings', 'Share', 'Status'].map(h => (
                    <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
                  ))}
                </div>
                {holders.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 80px', gap: 12,
                      padding: '12px 20px',
                      borderBottom: i < holders.length - 1 ? '1px solid #0A0A0F' : 'none',
                      background: h.is_whale
                        ? h.label === 'mega_whale'
                          ? 'rgba(255,59,59,0.03)'
                          : 'rgba(255,149,0,0.03)'
                        : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>#{i + 1}</span>
                    <ExplorerLink address={h.address} chain={token?.chain || 'bsc'} />
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>
                      {Number(h.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: '#1E1E2E', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(h.percentage * 2, 100)}%`,
                          background: h.label === 'mega_whale' ? '#FF3B3B' : h.is_whale ? '#FF9500' : '#00FF88',
                          borderRadius: 2,
                        }} />
                      </div>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: h.is_whale ? (h.label === 'mega_whale' ? '#FF3B3B' : '#FF9500') : '#6B7280', width: 40, textAlign: 'right' as const }}>
                        {h.percentage.toFixed(2)}%
                      </span>
                    </div>
                    <RiskBadge label={h.label} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
