// apps/web/src/app/launch/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'

type Chain  = 'bsc' | 'solana'
type Screen = 'confirm' | 'generating' | 'edit'

interface Narrative {
  id: string
  title: string
  summary: string
  hype_score: number
  estimated_window: string
  suggested_tickers: string[]
  why_it_works?: string
}

interface TokenDraft {
  name: string
  ticker: string
  description: string
  logo_url: string | null
  chain: Chain
  total_supply: string
  tax_buy: number
  tax_sell: number
  tg_bio: string
  twitter_bio: string
  first_tweets: string[]
}

function scoreColor(s: number) {
  if (s >= 80) return '#FF3B3B'
  if (s >= 60) return '#FF9500'
  return '#00FF88'
}

// ── Micro-confirmation overlay ────────────────────────────────────────────────
function ConfirmOverlay({ narrative, chain, onChainChange, onConfirm, onBack }: {
  narrative: Narrative
  chain: Chain
  onChainChange: (c: Chain) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const color = scoreColor(narrative.hype_score)
  const label = narrative.hype_score >= 80 ? 'NUKE' : narrative.hype_score >= 60 ? 'HOT' : 'WARM'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{
        background: '#0E0E16', border: '1px solid #1E1E2E',
        borderRadius: 16, padding: '28px 24px',
        maxWidth: 480, width: '100%',
        animation: 'slideUp 0.25s ease both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{
            padding: '3px 10px',
            background: `${color}15`, border: `1px solid ${color}30`,
            borderRadius: 20,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
            color, letterSpacing: '0.12em',
          }}>
            {label} — {narrative.hype_score}/100
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>
            Window: {narrative.estimated_window}
          </span>
        </div>

        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900,
          color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 10,
        }}>
          {narrative.title}
        </h2>

        <p style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
          color: '#6B7280', lineHeight: 1.7, marginBottom: 14,
        }}>
          {narrative.summary}
        </p>

        {narrative.why_it_works && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(0,255,136,0.04)',
            border: '1px solid rgba(0,255,136,0.12)',
            borderRadius: 8, marginBottom: 16,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
            color: '#00FF88', lineHeight: 1.6,
          }}>
            {narrative.why_it_works}
          </div>
        )}

        {narrative.suggested_tickers?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {narrative.suggested_tickers.slice(0, 4).map(t => (
              <span key={t} style={{
                padding: '3px 9px',
                background: 'rgba(0,255,136,0.07)',
                border: '1px solid rgba(0,255,136,0.15)',
                borderRadius: 4,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                fontWeight: 600, color: '#00FF88',
              }}>
                ${t}
              </span>
            ))}
          </div>
        )}

        {/* Chain selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 8 }}>
            DEPLOY CHAIN
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['bsc', 'solana'] as Chain[]).map(c => (
              <button key={c} onClick={() => onChainChange(c)} style={{
                flex: 1, padding: '10px 0',
                background: chain === c
                  ? (c === 'bsc' ? 'rgba(243,186,47,0.08)' : 'rgba(153,69,255,0.08)')
                  : '#0A0A0F',
                border: `1.5px solid ${chain === c
                  ? (c === 'bsc' ? 'rgba(243,186,47,0.4)' : 'rgba(153,69,255,0.4)')
                  : '#1E1E2E'}`,
                borderRadius: 8, cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
                color: chain === c
                  ? (c === 'bsc' ? '#F3BA2F' : '#9945FF')
                  : '#4B5563',
                transition: 'all 0.15s',
              }}>
                {c === 'bsc' ? 'BSC  —  $5' : 'Solana  —  $1'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{
            flex: 1, padding: '11px 0',
            background: 'transparent', border: '1px solid #1E1E2E',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280',
          }}>
            Back
          </button>
          <button onClick={onConfirm} style={{
            flex: 2, padding: '11px 0',
            background: '#00FF88', border: 'none',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
            color: '#0A0A0F',
          }}>
            Generate Token
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Generation animation ──────────────────────────────────────────────────────
function GeneratingScreen() {
  const steps = [
    'Analyzing narrative momentum...',
    'Finding viral angles...',
    'Generating token identity...',
    'Designing logo...',
    'Writing launch copy...',
  ]
  const [current, setCurrent] = useState(0)
  const [done, setDone]       = useState<number[]>([])

  useEffect(() => {
    const iv = setInterval(() => {
      setCurrent(prev => {
        if (prev >= steps.length - 1) return prev
        setDone(d => [...d, prev])
        return prev + 1
      })
    }, 900)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '70vh', padding: 40,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '2px solid #1E1E2E',
        borderTop: '2px solid #00FF88',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 32,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > current ? 0.2 : 1, transition: 'opacity 0.3s' }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: done.includes(i) ? '#00FF88' : i === current ? 'rgba(0,255,136,0.25)' : '#1E1E2E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
            }}>
              {done.includes(i) && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#0A0A0F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
              color: done.includes(i) ? '#00FF88' : i === current ? '#F9FAFB' : '#4B5563',
              transition: 'color 0.3s',
            }}>
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Edit screen ───────────────────────────────────────────────────────────────
function EditScreen({ draft, narrative, chain, onUpdate, onSaveDraft, onRegenerate, saving, regenerating, error }: {
  draft: TokenDraft
  narrative: Narrative | null
  chain: Chain
  onUpdate: (f: keyof TokenDraft, v: any) => void
  onSaveDraft: () => void
  onRegenerate: () => void
  saving: boolean
  regenerating: boolean
  error: string | null
}) {
  const [tab, setTab] = useState<'identity' | 'social'>('identity')

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: '#0A0A0F', border: '1px solid #1E1E2E',
    borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 12, color: '#F9FAFB', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
    color: '#4B5563', letterSpacing: '0.12em', marginBottom: 5,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Token header */}
      <div style={{
        background: '#0E0E16', border: '1px solid #1E1E2E',
        borderRadius: 12, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <TokenLogo url={draft.logo_url} name={draft.name} size={60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>
            {draft.name}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', fontWeight: 700, marginBottom: 6 }}>
            ${draft.ticker}
          </div>
          <span style={{
            padding: '2px 8px',
            background: chain === 'bsc' ? 'rgba(243,186,47,0.1)' : 'rgba(153,69,255,0.1)',
            border: `1px solid ${chain === 'bsc' ? 'rgba(243,186,47,0.3)' : 'rgba(153,69,255,0.3)'}`,
            borderRadius: 4, display: 'inline-block',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700,
            color: chain === 'bsc' ? '#F3BA2F' : '#9945FF',
          }}>
            {chain.toUpperCase()} — {chain === 'bsc' ? '$15' : '$6'}
          </span>
        </div>
        <button onClick={onRegenerate} disabled={regenerating} style={{
          padding: '7px 12px', flexShrink: 0,
          background: 'transparent', border: '1px solid #1E1E2E',
          borderRadius: 7, cursor: regenerating ? 'not-allowed' : 'pointer',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280',
        }}>
          {regenerating ? '...' : 'Regenerate'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 8, padding: 4, gap: 4 }}>
        {(['identity', 'social'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0',
            background: tab === t ? '#1E1E2E' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
            color: tab === t ? '#F9FAFB' : '#4B5563',
            transition: 'all 0.15s',
          }}>
            {t === 'identity' ? 'Token' : 'Social'}
          </button>
        ))}
      </div>

      {tab === 'identity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>NAME</div>
              <input value={draft.name} onChange={e => onUpdate('name', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>TICKER</div>
              <input value={draft.ticker} onChange={e => onUpdate('ticker', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>DESCRIPTION</div>
            <textarea value={draft.description} onChange={e => onUpdate('description', e.target.value)} rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <div style={labelStyle}>SUPPLY</div>
              <input value={draft.total_supply} onChange={e => onUpdate('total_supply', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>BUY TAX %</div>
              <input value={String(draft.tax_buy)} onChange={e => onUpdate('tax_buy', parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>SELL TAX %</div>
              <input value={String(draft.tax_sell)} onChange={e => onUpdate('tax_sell', parseFloat(e.target.value) || 0)} style={inputStyle} />
            </div>
          </div>
        </div>
      )}

      {tab === 'social' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>TELEGRAM BIO</div>
            <textarea value={draft.tg_bio} onChange={e => onUpdate('tg_bio', e.target.value)} rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <div style={labelStyle}>TWITTER BIO</div>
            <textarea value={draft.twitter_bio} onChange={e => onUpdate('twitter_bio', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
          {draft.first_tweets?.map((tweet, i) => (
            <div key={i}>
              <div style={labelStyle}>LAUNCH TWEET {i + 1}</div>
              <textarea value={tweet} rows={3}
                onChange={e => {
                  const t = [...draft.first_tweets]
                  t[i] = e.target.value
                  onUpdate('first_tweets', t)
                }}
                style={{ ...inputStyle, resize: 'none' }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 14px', background: 'rgba(255,59,59,0.08)',
          border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B',
        }}>
          {error}
        </div>
      )}

      <button onClick={onSaveDraft} disabled={saving} style={{
        width: '100%', padding: '14px 0',
        background: saving ? '#1E1E2E' : '#00FF88',
        border: 'none', borderRadius: 10,
        cursor: saving ? 'not-allowed' : 'pointer',
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700,
        color: saving ? '#4B5563' : '#0A0A0F',
        letterSpacing: '0.02em', transition: 'all 0.15s',
      }}>
        {saving ? 'Saving...' : `Deploy ${draft.name} on ${chain.toUpperCase()}`}
      </button>

      <p style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color: '#374151', textAlign: 'center', lineHeight: 1.6,
      }}>
        Saves your token and takes you to the deploy step.
      </p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
function LaunchPageContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { address }  = useAccount()
  const narrativeId  = searchParams.get('narrative')

  const [screen,       setScreen]       = useState<Screen>(narrativeId ? 'confirm' : 'edit')
  const [narrative,    setNarrative]    = useState<Narrative | null>(null)
  const [chain,        setChain]        = useState<Chain>('bsc')
  const [draft,        setDraft]        = useState<TokenDraft | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    if (!narrativeId) { setScreen('edit'); return }
    api.get(`/api/narratives/${narrativeId}`)
      .then(res => { if (res.data.success) setNarrative(res.data.data) })
      .catch(() => {})
  }, [narrativeId])

  function updateDraft(field: keyof TokenDraft, value: any) {
    setDraft(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function generate(narrativeOverride?: Narrative | null) {
    const n = narrativeOverride !== undefined ? narrativeOverride : narrative
    setScreen('generating')
    setError(null)
    try {
      const res = await api.post('/api/generate/token', {
        narrative_title:   n?.title   || 'Crypto Narrative',
        narrative_summary: n?.summary || '',
        chain,
      })
      if (res.data.success) {
        setDraft({ ...res.data.data, chain })
        setScreen('edit')
      } else {
        setError(res.data.error)
        setScreen(narrativeId ? 'confirm' : 'edit')
      }
    } catch (err: any) {
      setError(err.message)
      setScreen(narrativeId ? 'confirm' : 'edit')
    }
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const res = await api.post('/api/generate/token', {
        narrative_title:   narrative?.title   || 'Crypto Narrative',
        narrative_summary: narrative?.summary || '',
        chain,
      })
      if (res.data.success) setDraft({ ...res.data.data, chain })
    } catch {}
    finally { setRegenerating(false) }
  }

  async function saveDraft() {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.post('/api/generate/save-draft', {
        ...draft,
        narrative_id:   narrativeId || null,
        wallet_address: address     || null,
      })
      if (res.data.success) {
        router.push(`/deploy?draft=${res.data.data.id}&chain=${chain}`)
      } else {
        setError(res.data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F' }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #1E1E2E',
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(16px)',
        padding: '0 20px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => screen === 'edit' && draft ? setScreen('confirm') : router.push('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
            color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {screen === 'edit' && draft ? 'Back' : 'Feed'}
        </button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>
          1launch
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* Confirm overlay */}
      {screen === 'confirm' && narrative && (
        <ConfirmOverlay
          narrative={narrative}
          chain={chain}
          onChainChange={setChain}
          onConfirm={() => generate()}
          onBack={() => router.push('/dashboard')}
        />
      )}

      {/* Generating */}
      {screen === 'generating' && <GeneratingScreen />}

      {/* Edit */}
      {screen === 'edit' && (
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px 80px' }}>
          {!draft ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.5px' }}>
                Launch a Token
              </h1>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
                Pick a narrative from the feed or generate with your own idea.
              </p>
              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push('/dashboard')} style={{
                  flex: 1, padding: '12px 0',
                  background: '#00FF88', border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0A0A0F',
                }}>
                  Browse Feed
                </button>
                <button onClick={() => generate(null)} style={{
                  flex: 1, padding: '12px 0',
                  background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280',
                }}>
                  Generate Anyway
                </button>
              </div>
            </div>
          ) : (
            <EditScreen
              draft={draft}
              narrative={narrative}
              chain={chain}
              onUpdate={updateDraft}
              onSaveDraft={saveDraft}
              onRegenerate={regenerate}
              saving={saving}
              regenerating={regenerating}
              error={error}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function LaunchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
      </div>
    }>
      <LaunchPageContent />
    </Suspense>
  )
}
