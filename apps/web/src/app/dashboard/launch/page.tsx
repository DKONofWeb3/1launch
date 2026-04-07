'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { api } from '@/lib/api'
import { StepIndicator } from '@/components/launch/StepIndicator'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { EditableField } from '@/components/launch/EditableField'
import { ChainSelector } from '@/components/launch/ChainSelector'
import {
  IconRocket, IconPulse, IconChevronRight, IconFire,
  IconClock, IconWallet, IconSignal, IconTrendingUp
} from '@/components/ui/Icons'

// ── Types ─────────────────────────────────────────────────────────────────────

type Chain = 'bsc' | 'solana'

interface TokenDraft {
  name: string
  ticker: string
  description: string
  logo_url: string | null
  logo_prompt: string
  chain: Chain
  total_supply: string
  tax_buy: number
  tax_sell: number
  launch_mechanism: string
  lp_lock: boolean
  renounce: boolean
  tg_bio: string
  twitter_bio: string
  first_tweets: string[]
}

interface Narrative {
  id: string
  title: string
  summary: string
  hype_score: number
  estimated_window: string
  suggested_tickers: string[]
}

const STEPS = [
  { number: 1, label: 'Narrative' },
  { number: 2, label: 'Generate' },
  { number: 3, label: 'Identity' },
  { number: 4, label: 'Socials' },
  { number: 5, label: 'Confirm' },
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10, fontWeight: 600,
      color: '#6B7280', letterSpacing: '0.12em',
      textTransform: 'uppercase', marginBottom: 16,
      paddingBottom: 8, borderBottom: '1px solid #1E1E2E',
    }}>
      {children}
    </div>
  )
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0E0E16', border: '1px solid #1E1E2E',
      borderRadius: 12, padding: '20px 22px', ...style,
    }}>
      {children}
    </div>
  )
}

function PrimaryBtn({
  children, onClick, loading = false, disabled = false, style = {}
}: {
  children: React.ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '10px 20px',
        background: disabled || loading ? '#1E1E2E' : '#00FF88',
        color: disabled || loading ? '#4B5563' : '#0A0A0F',
        border: 'none', borderRadius: 8,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 13, fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.03em', transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,255,136,0.25)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {loading && (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="7" cy="7" r="5" stroke="#4B5563" strokeWidth="2" strokeDasharray="20 10"/>
        </svg>
      )}
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 18px',
        background: 'transparent', color: '#9CA3AF',
        border: '1px solid #1E1E2E', borderRadius: 8,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        letterSpacing: '0.02em', transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2A2A3E'
        e.currentTarget.style.color = '#F9FAFB'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1E1E2E'
        e.currentTarget.style.color = '#9CA3AF'
      }}
    >
      {children}
    </button>
  )
}

// ── Step 1: Narrative selection ───────────────────────────────────────────────

function Step1Narrative({
  narrative, chain, onChainChange, onNext
}: {
  narrative: Narrative | null
  chain: Chain
  onChainChange: (c: Chain) => void
  onNext: () => void
}) {
  function getScoreColor(score: number) {
    if (score >= 80) return '#FF3B3B'
    if (score >= 60) return '#FF9500'
    if (score >= 40) return '#00FF88'
    return '#4B5563'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Selected Narrative</SectionLabel>

      {narrative ? (
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 15, fontWeight: 700,
                  color: '#F9FAFB', letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {narrative.title}
                </span>
                <span style={{
                  padding: '2px 8px',
                  background: `${getScoreColor(narrative.hype_score)}18`,
                  border: `1px solid ${getScoreColor(narrative.hype_score)}40`,
                  borderRadius: 4,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  color: getScoreColor(narrative.hype_score),
                }}>
                  {narrative.hype_score} HYPE
                </span>
              </div>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 12 }}>
                {narrative.summary}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                  <IconClock size={12} color="#6B7280" />
                  Window: {narrative.estimated_window}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
            No narrative selected. You can still generate a token manually below.
          </p>
        </Card>
      )}

      <div style={{ marginTop: 8 }}>
        <ChainSelector value={chain} onChange={onChainChange} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <PrimaryBtn onClick={onNext}>
          Generate Token Identity
          <IconChevronRight size={14} color="#0A0A0F" />
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ── Step 2: AI Generation loading ────────────────────────────────────────────

function Step2Generating() {
  const messages = [
    'Scanning narrative signals...',
    'Consulting the degen oracle...',
    'Crafting token lore...',
    'Generating ticker options...',
    'Writing CT posts...',
    'Setting up social copy...',
  ]
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 24 }}>
      {/* Animated pulse ring */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid #00FF88',
          animation: 'pulseRing 1.5s ease-out infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          background: 'rgba(0,255,136,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconRocket size={24} color="#00FF88" />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800,
          color: '#F9FAFB', marginBottom: 8,
        }}>
          Generating Token Identity
        </div>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
          color: '#00FF88', letterSpacing: '0.04em',
          minHeight: 20, transition: 'opacity 0.3s',
        }}>
          {messages[msgIndex]}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Token Identity editor ─────────────────────────────────────────────

function Step3Identity({
  draft, onUpdate, onRegenerate, regenerating, onNext, onBack
}: {
  draft: TokenDraft
  onUpdate: (field: keyof TokenDraft, value: any) => void
  onRegenerate: () => void
  regenerating: boolean
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Token Identity</SectionLabel>

      {/* Logo + name/ticker side by side */}
      <Card>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <TokenLogo url={draft.logo_url} name={draft.name} size={88} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#374151', textAlign: 'center' }}>
              AI-generated
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EditableField
              label="Token Name"
              value={draft.name}
              onChange={(v) => onUpdate('name', v)}
              maxLength={32}
              mono={false}
            />
            <EditableField
              label="Ticker"
              value={draft.ticker}
              onChange={(v) => onUpdate('ticker', v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
              prefix="$"
              uppercase
              maxLength={6}
            />
          </div>
        </div>
      </Card>

      <Card>
        <EditableField
          label="Token Description / Lore"
          value={draft.description}
          onChange={(v) => onUpdate('description', v)}
          multiline
          maxLength={280}
        />
      </Card>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionLabel>Tokenomics</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <EditableField
              label="Total Supply"
              value={draft.total_supply}
              onChange={(v) => onUpdate('total_supply', v.replace(/[^0-9]/g, ''))}
            />
            <EditableField
              label="Buy Tax %"
              value={String(draft.tax_buy)}
              onChange={(v) => onUpdate('tax_buy', Math.min(25, Number(v.replace(/[^0-9]/g, ''))))}
              maxLength={2}
            />
            <EditableField
              label="Sell Tax %"
              value={String(draft.tax_sell)}
              onChange={(v) => onUpdate('tax_sell', Math.min(25, Number(v.replace(/[^0-9]/g, ''))))}
              maxLength={2}
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            {[
              { key: 'lp_lock', label: 'LP Lock' },
              { key: 'renounce', label: 'Renounce Contract' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onUpdate(key as keyof TokenDraft, !draft[key as keyof TokenDraft])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px',
                  background: draft[key as keyof TokenDraft] ? 'rgba(0,255,136,0.08)' : '#0A0A0F',
                  border: `1px solid ${draft[key as keyof TokenDraft] ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: draft[key as keyof TokenDraft] ? '#00FF88' : '#1E1E2E',
                  border: `1.5px solid ${draft[key as keyof TokenDraft] ? '#00FF88' : '#2A2A3E'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {draft[key as keyof TokenDraft] && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l2 2 3-3" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 500,
                  color: draft[key as keyof TokenDraft] ? '#00FF88' : '#6B7280',
                }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <GhostBtn onClick={onBack}>Back</GhostBtn>
          <GhostBtn onClick={onRegenerate}>
            {regenerating ? 'Regenerating...' : 'Regenerate All'}
          </GhostBtn>
        </div>
        <PrimaryBtn onClick={onNext}>
          Review Socials
          <IconChevronRight size={14} color="#0A0A0F" />
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ── Step 4: Social copy editor ────────────────────────────────────────────────

function Step4Socials({
  draft, onUpdate, onNext, onBack
}: {
  draft: TokenDraft
  onUpdate: (field: keyof TokenDraft, value: any) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Social Copy</SectionLabel>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <EditableField
            label="Telegram Group Bio"
            value={draft.tg_bio}
            onChange={(v) => onUpdate('tg_bio', v)}
            multiline
            maxLength={255}
          />
          <EditableField
            label="Twitter / X Bio"
            value={draft.twitter_bio}
            onChange={(v) => onUpdate('twitter_bio', v)}
            maxLength={160}
          />
        </div>
      </Card>

      <Card>
        <SectionLabel>Launch Tweets</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {draft.first_tweets.map((tweet, i) => (
            <EditableField
              key={i}
              label={`Tweet ${i + 1}`}
              value={tweet}
              onChange={(v) => {
                const updated = [...draft.first_tweets]
                updated[i] = v
                onUpdate('first_tweets', updated)
              }}
              multiline
              maxLength={240}
            />
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={onBack}>Back</GhostBtn>
        <PrimaryBtn onClick={onNext}>
          Confirm Launch
          <IconChevronRight size={14} color="#0A0A0F" />
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ── Step 5: Confirm & Save ────────────────────────────────────────────────────

function Step5Confirm({
  draft, narrative, onSave, onBack, saving
}: {
  draft: TokenDraft
  narrative: Narrative | null
  onSave: () => void
  onBack: () => void
  saving: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Launch Summary</SectionLabel>

      <Card>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
          <TokenLogo url={draft.logo_url} name={draft.name} size={72} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px' }}>
              {draft.name}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#00FF88', fontWeight: 600, marginTop: 2 }}>
              ${draft.ticker}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Chain', value: draft.chain.toUpperCase() },
            { label: 'Supply', value: Number(draft.total_supply).toLocaleString() },
            { label: 'Buy Tax', value: `${draft.tax_buy}%` },
            { label: 'Sell Tax', value: `${draft.tax_sell}%` },
            { label: 'LP Lock', value: draft.lp_lock ? 'Yes' : 'No' },
            { label: 'Renounce', value: draft.renounce ? 'Yes' : 'No' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '10px 12px', background: '#0A0A0F',
              border: '1px solid #1E1E2E', borderRadius: 6,
            }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.08em', marginBottom: 3 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: '#F9FAFB' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
          {draft.description}
        </p>
      </Card>

      <div style={{ padding: '12px 16px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', lineHeight: 1.6 }}>
        Your token will be saved and ready to deploy. Connect your wallet on the next step to deploy on-chain.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <GhostBtn onClick={onBack}>Back</GhostBtn>
        <PrimaryBtn onClick={onSave} loading={saving}>
          <IconRocket size={14} color="#0A0A0F" />
          {saving ? 'Saving...' : 'Save & Go to Deploy'}
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function LaunchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const narrativeId = searchParams.get('narrative')

  const { address } = useAccount()
  const [step, setStep] = useState(1)
  const [narrative, setNarrative] = useState<Narrative | null>(null)
  const [chain, setChain] = useState<Chain>('bsc')
  const [draft, setDraft] = useState<TokenDraft | null>(null)
  const [generating, setGenerating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch narrative if ID present
  useEffect(() => {
    if (!narrativeId) return
    api.get(`/api/narratives/${narrativeId}`)
      .then((res) => { if (res.data.success) setNarrative(res.data.data) })
      .catch(() => {})
  }, [narrativeId])

  function updateDraft(field: keyof TokenDraft, value: any) {
    setDraft((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  async function generate() {
    setGenerating(true)
    setStep(2)
    setError(null)
    try {
      const res = await api.post('/api/generate/token', {
        narrative_title: narrative?.title || 'Crypto Narrative',
        narrative_summary: narrative?.summary || '',
        chain,
      })
      if (res.data.success) {
        setDraft({ ...res.data.data, chain })
        setStep(3)
      } else {
        setError(res.data.error)
        setStep(1)
      }
    } catch (err: any) {
      setError(err.message)
      setStep(1)
    } finally {
      setGenerating(false)
    }
  }

  async function regenerate() {
    if (!narrative) return
    setRegenerating(true)
    try {
      const res = await api.post('/api/generate/token', {
        narrative_title: narrative.title,
        narrative_summary: narrative.summary,
        chain,
      })
      if (res.data.success) setDraft({ ...res.data.data, chain })
    } catch {}
    finally { setRegenerating(false) }
  }

  async function saveDraft() {
    if (!draft) return
    setSaving(true)
    try {
      const res = await api.post('/api/generate/save-draft', {
        ...draft,
        narrative_id: narrativeId || null,
        wallet_address: address || null,
      })
      if (res.data.success) {
        router.push('/dashboard/tokens')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', position: 'relative', zIndex: 1 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #1E1E2E',
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
            color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Feed
        </button>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>
          1launch
        </div>

        <div style={{ width: 80 }} />
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800,
            color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 6,
          }}>
            Token Generator
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
            AI builds your full token identity in seconds
          </p>
        </div>

        {/* Step indicator */}
        {step !== 2 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <StepIndicator steps={STEPS} current={step} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '12px 16px', marginBottom: 20,
            background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)',
            borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, color: '#FF6B6B',
          }}>
            {error}
          </div>
        )}

        {/* Step content */}
        <div style={{ animation: 'cardIn 0.3s ease both' }}>
          {step === 1 && (
            <Step1Narrative
              narrative={narrative}
              chain={chain}
              onChainChange={setChain}
              onNext={generate}
            />
          )}
          {step === 2 && <Step2Generating />}
          {step === 3 && draft && (
            <Step3Identity
              draft={draft}
              onUpdate={updateDraft}
              onRegenerate={regenerate}
              regenerating={regenerating}
              onNext={() => setStep(4)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 4 && draft && (
            <Step4Socials
              draft={draft}
              onUpdate={updateDraft}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && draft && (
            <Step5Confirm
              draft={draft}
              narrative={narrative}
              onSave={saveDraft}
              onBack={() => setStep(4)}
              saving={saving}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
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
