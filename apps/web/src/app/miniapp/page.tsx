// apps/web/src/app/miniapp/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

function HypeBar({ score }: { score: number }) {
  const color = score >= 75 ? '#00FF88' : score >= 50 ? '#FF9500' : '#FF3B3B'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#1E1E2E', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color, width: 28, textAlign: 'right' as const }}>{score}</span>
    </div>
  )
}

export default function MiniAppHome() {
  const [narratives, setNarratives] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/narratives?limit=20')
      .then(res => { if (res.data.success) setNarratives(res.data.data || []) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>Narrative Feed</h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>Live hype signals — tap to launch</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 90, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {narratives.map((n, i) => (
            <a
              key={n.id || i}
              href={`/launch?narrative=${n.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10,
                padding: '14px', transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.3, flex: 1 }}>
                    {n.title}
                  </div>
                  <span style={{
                    padding: '3px 8px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
                    color: '#00FF88', flexShrink: 0,
                  }}>
                    Launch
                  </span>
                </div>
                <HypeBar score={n.hype_score} />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' as const }}>
                  {(n.suggested_tickers || []).slice(0, 4).map((t: string) => (
                    <span key={t} style={{ padding: '2px 7px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600, color: '#00FF88' }}>
                      ${t}
                    </span>
                  ))}
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151', alignSelf: 'center' }}>
                    {n.estimated_window}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}
