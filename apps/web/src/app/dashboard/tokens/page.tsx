// apps/web/src/app/dashboard/tokens/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { api } from '@/lib/api'
import { TokenCard } from '@/components/dashboard/TokenCard'
import { IconSignal, IconRocket, IconTrendingUp } from '@/components/ui/Icons'

export default function TokensPage() {
  const router = useRouter()
  const { address } = useAccount()
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function loadTokens() {
    setLoading(true)
    const params = address ? `?wallet=${address}` : ''
    api.get(`/api/launched-tokens${params}`)
      .then(res => { if (res.data.success) setTokens(res.data.data) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTokens() }, [address])

  return (
    <div className="dashboard-layout">
      <div className="page-header">
        <div>
          <h1 className="page-title">Launched Tokens</h1>
          <p className="page-subtitle">
            {address ? 'Your deployed tokens with live market data' : 'Connect wallet to see your tokens'}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: '#00FF88', color: '#0A0A0F',
            border: 'none', borderRadius: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <IconRocket size={13} color="#0A0A0F" />
          New Token
        </button>
      </div>

      {!address && (
        <div style={{ padding: '20px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500' }}>
          Connect your wallet to see your tokens
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      <div className="narrative-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 220, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 12 }} />
            ))
          : tokens.length === 0
          ? (
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12 }}>
              <IconSignal size={36} color="#1E1E2E" />
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>No tokens deployed yet</p>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#1E1E2E' }}>Deploy your first token from the drafts page</span>
            </div>
          )
          : tokens.map(token => <TokenCard key={token.id} token={token} />)
        }
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}
