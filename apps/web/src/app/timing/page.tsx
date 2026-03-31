// apps/web/src/app/timing/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useSearchParams } from 'next/navigation'

type Chain = 'bsc' | 'solana'
type Recommendation = 'launch_now' | 'wait_hours' | 'wait_days' | 'avoid'

const REC_CONFIG: Record<Recommendation, { color: string; bg: string; border: string; icon: string; label: string }> = {
  launch_now: {
    color: '#00FF88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.3)',
    icon: '🚀', label: 'Launch Now',
  },
  wait_hours: {
    color: '#FF9500', bg: 'rgba(255,149,0,0.08)', border: 'rgba(255,149,0,0.3)',
    icon: '⏳', label: 'Wait a Few Hours',
  },
  wait_days: {
    color: '#FF9500', bg: 'rgba(255,149,0,0.08)', border: 'rgba(255,149,0,0.3)',
    icon: '📅', label: 'Wait 2-3 Days',
  },
  avoid: {
    color: '#FF3B3B', bg: 'rgba(255,59,59,0.08)', border: 'rgba(255,59,59,0.3)',
    icon: '🛑', label: 'Avoid Launching Now',
  },
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#00FF88' : score >= 50 ? '#FF9500' : '#FF3B3B'
  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r="54" fill="none" stroke="#1E1E2E" strokeWidth="10"/>
        <circle
          cx="70" cy="70" r="54"
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease', filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>
          {score}
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em' }}>
          SCORE
        </div>
      </div>
    </div>
  )
}

function SignalCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  const trendColor = trend === 'up' ? '#00FF88' : trend === 'down' ? '#FF3B3B' : '#6B7280'
  return (
    <div style={{ padding: '14px 16px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 16, fontWeight: 700, color: '#F9FAFB' }}>{value}</span>
        {trend && trend !== 'neutral' && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: trend === 'down' ? 'rotate(180deg)' : 'none' }}>
            <path d="M6 2l4 5H2l4-5z" fill={trendColor}/>
          </svg>
        )}
      </div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function FactorRow({ factor }: { factor: any }) {
  const impactConfig: Record<string, { color: string; icon: string }> = {
    positive: { color: '#00FF88', icon: '+' },
    negative: { color: '#FF3B3B', icon: '−' },
    neutral:  { color: '#6B7280', icon: '·' },
  }
  const c = impactConfig[factor.impact] || impactConfig.neutral

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '10px 14px',
      background: '#0A0A0F',
      border: `1px solid ${factor.impact === 'positive' ? 'rgba(0,255,136,0.1)' : factor.impact === 'negative' ? 'rgba(255,59,59,0.1)' : '#1E1E2E'}`,
      borderRadius: 7,
      marginBottom: 6,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: `${c.color}15`,
        border: `1px solid ${c.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 800, color: c.color,
      }}>
        {c.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 2 }}>
          {factor.factor}
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
          {factor.detail}
        </div>
      </div>
    </div>
  )
}

function FearGreedMeter({ value, label }: { value: number; label: string }) {
  const color = value >= 75 ? '#00FF88' : value >= 55 ? '#FF9500' : value >= 45 ? '#FFB800' : value >= 25 ? '#FF9500' : '#FF3B3B'
  return (
    <div style={{ padding: '14px 16px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Fear & Greed</div>
      <div style={{ height: 6, background: 'linear-gradient(to right, #FF3B3B, #FF9500, #FFB800, #00FF88)', borderRadius: 3, marginBottom: 8, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -4, width: 14, height: 14,
          borderRadius: '50%', background: '#F9FAFB',
          border: `2px solid ${color}`,
          left: `calc(${value}% - 7px)`,
          transition: 'left 0.8s ease',
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{value}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{label}</span>
      </div>
    </div>
  )
}

export default function TimingPage() {
  const [chain, setChain] = useState<Chain>('bsc')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [satName, setSatName] = useState('')
  const [satTicker, setSatTicker] = useState('')
  const [saturation, setSaturation] = useState<any>(null)
  const [satLoading, setSatLoading] = useState(false)

  async function checkSaturation() {
    if (!satName || !satTicker) return
    setSatLoading(true)
    try {
      const res = await api.get(`/api/token-search/saturation?name=${encodeURIComponent(satName)}&ticker=${encodeURIComponent(satTicker)}`)
      if (res.data.success) setSaturation(res.data.data)
    } catch {}
    finally { setSatLoading(false) }
  }

  async function analyze() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/timing/analyze?chain=${chain}`)
      if (res.data.success) {
        setData(res.data.data)
        setLastFetched(new Date())
      } else {
        setError(res.data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { analyze() }, [chain])

  const analysis = data?.analysis
  const signals  = data?.signals
  const rec      = analysis?.recommendation as Recommendation
  const recConfig = rec ? REC_CONFIG[rec] : null

  return (
    <div className="dashboard-layout">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Launch Timing Engine</h1>
          <p className="page-subtitle">Real-time market analysis — is now a good time to launch?</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Chain selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['bsc', 'solana'] as Chain[]).map(c => (
              <button
                key={c}
                onClick={() => setChain(c)}
                style={{
                  padding: '7px 14px',
                  background: chain === c ? 'rgba(0,255,136,0.1)' : 'transparent',
                  border: `1px solid ${chain === c ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
                  color: chain === c ? '#00FF88' : '#6B7280',
                  textTransform: 'uppercase' as const,
                  transition: 'all 0.15s',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={analyze}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: loading ? '#1E1E2E' : 'transparent',
              border: '1px solid #1E1E2E', borderRadius: 6,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
              color: loading ? '#4B5563' : '#6B7280', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}>
              <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="16" cy="16" r="12" stroke="#1E1E2E" strokeWidth="3" fill="none"/>
            <path d="M16 4a12 12 0 0 1 12 12" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" fill="none"/>
          </svg>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>
            Collecting market signals...
          </div>
        </div>
      )}

      {data && analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Main recommendation card */}
          <div style={{
            background: recConfig?.bg,
            border: `1px solid ${recConfig?.border}`,
            borderRadius: 14, padding: '28px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' as const }}>
              <ScoreGauge score={analysis.score} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                  Recommendation
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 900, color: recConfig?.color, marginBottom: 6, letterSpacing: '-0.5px' }}>
                  {recConfig?.label}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                  {analysis.window} · {analysis.confidence}% confidence
                </div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 14 }}>
                  {analysis.summary}
                </p>
                {analysis.best_time && (
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: recConfig?.color }}>
                    Best window: {analysis.best_time}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analysis.warnings.map((w: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,59,59,0.06)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="#FF3B3B" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B' }}>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Market signals grid */}
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Market Signals</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              <SignalCard
                label="BTC 24h"
                value={`${parseFloat(signals.sentiment.btc_24h) >= 0 ? '+' : ''}${signals.sentiment.btc_24h}%`}
                sub={`$${signals.sentiment.prices?.btc?.toLocaleString()}`}
                trend={parseFloat(signals.sentiment.btc_24h) > 0 ? 'up' : 'down'}
              />
              <SignalCard
                label="ETH 24h"
                value={`${parseFloat(signals.sentiment.eth_24h) >= 0 ? '+' : ''}${signals.sentiment.eth_24h}%`}
                sub={`$${signals.sentiment.prices?.eth?.toLocaleString()}`}
                trend={parseFloat(signals.sentiment.eth_24h) > 0 ? 'up' : 'down'}
              />
              <SignalCard
                label={chain === 'bsc' ? 'BNB 24h' : 'SOL 24h'}
                value={`${parseFloat(chain === 'bsc' ? signals.sentiment.bnb_24h : signals.sentiment.sol_24h) >= 0 ? '+' : ''}${chain === 'bsc' ? signals.sentiment.bnb_24h : signals.sentiment.sol_24h}%`}
                trend={parseFloat(chain === 'bsc' ? signals.sentiment.bnb_24h : signals.sentiment.sol_24h) > 0 ? 'up' : 'down'}
              />
              {chain === 'bsc' ? (
                <SignalCard
                  label="Gas Price"
                  value={`${signals.gas.low} Gwei`}
                  sub={`High: ${signals.gas.high} Gwei`}
                  trend={signals.gas.high < 8 ? 'up' : 'down'}
                />
              ) : (
                <SignalCard
                  label="Solana TPS"
                  value={`${signals.solana.tps}`}
                  sub={signals.solana.status}
                  trend={signals.solana.status === 'clear' ? 'up' : 'down'}
                />
              )}
              <SignalCard
                label="Hot Meme Pairs"
                value={String(signals.dex_activity.hot_pairs_24h)}
                sub={signals.dex_activity.activity_level}
                trend={signals.dex_activity.activity_level === 'high' || signals.dex_activity.activity_level === 'very_high' ? 'up' : 'neutral'}
              />
              <FearGreedMeter value={signals.fear_greed.value} label={signals.fear_greed.label} />
            </div>
          </div>

          {/* Top active narrative */}
          {signals.top_narrative && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Top Active Narrative</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>{signals.top_narrative.title}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 700, color: '#00FF88' }}>{signals.top_narrative.hype_score}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>HYPE SCORE</div>
              </div>
            </div>
          )}

          {/* Factors breakdown */}
          {analysis.factors?.length > 0 && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Factor Analysis</div>
              {analysis.factors.map((f: any, i: number) => <FactorRow key={i} factor={f} />)}
            </div>
          )}

          {lastFetched && (
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#1E1E2E', textAlign: 'center' as const }}>
              Last updated {lastFetched.toLocaleTimeString()} · Data refreshes automatically
            </div>
          )}
        </div>
      )}

      {/* Narrative Saturation Scanner */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
          Narrative Saturation Scanner
        </div>
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 16 }}>
            Check how many tokens already exist with your planned name and ticker before launching.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
            <input
              type="text" placeholder="Token name (e.g. Liz Beast Mode)"
              value={satName} onChange={e => setSatName(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: '9px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB', outline: 'none' }}
            />
            <input
              type="text" placeholder="Ticker (e.g. LIZB)"
              value={satTicker} onChange={e => setSatTicker(e.target.value.toUpperCase())}
              style={{ width: 140, padding: '9px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB', outline: 'none' }}
            />
            <button
              onClick={checkSaturation}
              disabled={satLoading || !satName || !satTicker}
              style={{ padding: '9px 18px', background: satName && satTicker ? '#00FF88' : '#1E1E2E', color: satName && satTicker ? '#0A0A0F' : '#4B5563', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: satName && satTicker ? 'pointer' : 'not-allowed' }}
            >
              {satLoading ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          {saturation && (
            <div>
              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Exact Ticker Matches', value: String(saturation.exact_ticker_matches?.length || 0), color: saturation.exact_ticker_matches?.length > 2 ? '#FF3B3B' : saturation.exact_ticker_matches?.length > 0 ? '#FF9500' : '#00FF88' },
                  { label: 'Similar Name', value: String(saturation.similar_name_matches?.length || 0), color: '#9CA3AF' },
                  { label: 'Combined Vol 24h', value: `$${(saturation.total_volume_24h / 1000).toFixed(1)}K`, color: '#F9FAFB' },
                  { label: 'Saturation', value: saturation.saturation_level?.replace('_', ' ').toUpperCase(), color: saturation.saturation_level === 'low' ? '#00FF88' : saturation.saturation_level === 'medium' ? '#FF9500' : '#FF3B3B' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Exact ticker matches table */}
              {saturation.exact_ticker_matches?.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#FF3B3B', letterSpacing: '0.08em', marginBottom: 8 }}>
                    EXACT TICKER MATCHES — ${satTicker}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', background: '#0A0A0F', borderRadius: '6px 6px 0 0' }}>
                    {['Name', 'Chain', 'Price', 'Vol 24h', 'Link'].map(h => (
                      <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{h}</span>
                    ))}
                  </div>
                  {saturation.exact_ticker_matches.map((t: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 12px', background: i % 2 === 0 ? '#0A0A0F' : 'rgba(255,255,255,0.01)', borderTop: '1px solid #1E1E2E' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#F9FAFB' }}>{t.name}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const }}>{t.chain}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>${t.price_usd > 0.001 ? t.price_usd.toFixed(6) : t.price_usd.toExponential(2)}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>${(t.volume_24h / 1000).toFixed(1)}K</span>
                      <a href={t.dex_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', textDecoration: 'none' }}>View</a>
                    </div>
                  ))}
                </div>
              )}

              {saturation.exact_ticker_matches?.length === 0 && (
                <div style={{ padding: '12px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88' }}>
                  No exact ticker matches found — first mover advantage on ${satTicker}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
