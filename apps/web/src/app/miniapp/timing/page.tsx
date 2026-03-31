// apps/web/src/app/miniapp/timing/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function MiniAppTiming() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/timing/analyze?chain=bsc')
      .then(res => { if (res.data.success) setData(res.data.data) })
      .finally(() => setLoading(false))
  }, [])

  const analysis = data?.analysis
  const signals  = data?.signals

  const recColors: Record<string, string> = {
    launch_now: '#00FF88', wait_hours: '#FF9500', wait_days: '#FF9500', avoid: '#FF3B3B'
  }
  const color = analysis ? (recColors[analysis.recommendation] || '#6B7280') : '#6B7280'

  return (
    <div style={{ padding: '16px 12px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>Launch Timing</h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>Is now a good time to launch?</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 60, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10 }} />
          ))}
        </div>
      ) : analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Score card */}
          <div style={{ background: `${color}10`, border: `1px solid ${color}40`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 900, color, lineHeight: 1, marginBottom: 8 }}>
              {analysis.score}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color, marginBottom: 6 }}>
              {analysis.recommendation === 'launch_now' ? 'Launch Now'
                : analysis.recommendation === 'wait_hours' ? 'Wait a Few Hours'
                : analysis.recommendation === 'wait_days' ? 'Wait 2-3 Days'
                : 'Avoid Launching'}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
              {analysis.window} · {analysis.confidence}% confidence
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.7 }}>
              {analysis.summary}
            </p>
          </div>

          {/* Signals grid */}
          {signals && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { l: 'BTC 24h',       v: `${parseFloat(signals.sentiment.btc_24h) >= 0 ? '+' : ''}${signals.sentiment.btc_24h}%`, c: parseFloat(signals.sentiment.btc_24h) >= 0 ? '#00FF88' : '#FF3B3B' },
                { l: 'Fear & Greed',  v: `${signals.fear_greed.value}/100` },
                { l: 'Hot Pairs',     v: String(signals.dex_activity.hot_pairs_24h) },
                { l: 'Gas',          v: `${signals.gas.low} Gwei` },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ padding: '10px 12px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700, color: c || '#F9FAFB' }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Best time */}
          {analysis.best_time && (
            <div style={{ padding: '12px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 4, letterSpacing: '0.1em' }}>BEST WINDOW</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88' }}>{analysis.best_time}</div>
            </div>
          )}

          <button
            onClick={() => { setLoading(true); api.get('/api/timing/analyze?chain=bsc').then(res => { if (res.data.success) setData(res.data.data) }).finally(() => setLoading(false)) }}
            style={{ padding: '12px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer', width: '100%' }}
          >
            Refresh Analysis
          </button>
        </div>
      )}

      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  )
}
