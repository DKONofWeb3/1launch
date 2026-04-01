// apps/web/src/app/miniapp/tokens/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

function formatNum(n: number) {
  if (!n) return '$0'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(4)}`
}

export default function MiniAppTokens() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get wallet from Telegram user or localStorage
    const wallet = typeof window !== 'undefined' ? localStorage.getItem('1launch_wallet') : null
    const params = wallet ? `?wallet=${wallet}` : ''
    api.get(`/api/launched-tokens${params}`)
      .then(res => { if (res.data.success) setTokens(res.data.data || []) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>My Tokens</h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>Your deployed tokens with live data</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 100, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10 }} />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>No tokens yet</div>
          <a href="/miniapp/launch" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', textDecoration: 'none' }}>Launch your first token →</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tokens.map((token: any, i: number) => {
            const draft  = token.token_drafts
            const market = token.market_data
            return (
              <a key={i} href={`/dashboard/tokens/${token.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      background: 'rgba(0,255,136,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 900, color: '#00FF88',
                    }}>
                      {draft?.name?.slice(0, 2).toUpperCase() || '??'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>{draft?.name}</div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88' }}>${draft?.ticker} · {token.chain.toUpperCase()}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {market ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { l: 'PRICE',  v: formatNum(market.price_usd) },
                        { l: 'MCAP',   v: formatNum(market.market_cap_usd) },
                        { l: '24H',    v: `${market.price_change_24h >= 0 ? '+' : ''}${market.price_change_24h?.toFixed(1)}%`,
                          c: market.price_change_24h >= 0 ? '#00FF88' : '#FF3B3B' },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ padding: '6px 8px', background: '#0A0A0F', borderRadius: 6 }}>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#4B5563', marginBottom: 2 }}>{l}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: c || '#F9FAFB' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151' }}>No DEX pair yet</div>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}

      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  )
}
