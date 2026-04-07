// apps/web/src/app/dashboard/tokens/[id]/bot/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { BOT_TIERS } from './botTiers'

type Tier = 'starter' | 'growth' | 'pro'
type Step = 'tos' | 'tier' | 'payment' | 'wallets' | 'running'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 18, fontWeight: 700, color: '#00FF88' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function TierCard({ tier, selected, onSelect }: { tier: any; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '20px', cursor: 'pointer',
        background: selected ? 'rgba(0,255,136,0.06)' : '#0A0A0F',
        border: `1.5px solid ${selected ? 'rgba(0,255,136,0.4)' : '#1E1E2E'}`,
        borderRadius: 10, transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#F9FAFB' }}>{tier.name}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00FF88' }}>${tier.price}/mo</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          `${tier.walletCount} wallets`,
          `${tier.intervalMin}-${tier.intervalMax} min intervals`,
          `$${tier.tradeMin}-$${tier.tradeMax} per trade`,
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: selected ? '#00FF88' : '#374151', flexShrink: 0 }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: selected ? '#9CA3AF' : '#4B5563' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BotPage() {
  const params = useParams()
  const router = useRouter()

  const [token, setToken] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState<Step>('tos')
  const [selectedTier, setSelectedTier] = useState<Tier>('starter')
  const [tosChecked, setTosChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    api.get(`/api/launched-tokens/${params.id}`)
      .then(res => { if (res.data.success) setToken(res.data.data) })

    // Check for existing session
    api.get(`/api/bot/sessions?token_id=${params.id}`)
      .then(res => {
        if (res.data.success && res.data.data?.length > 0) {
          const existing = res.data.data[0]
          setSession(existing)
          setSelectedTier(existing.tier)
          if (existing.status === 'running') {
            setStep('running')
            startPolling(existing.id)
          } else if (existing.tos_accepted) {
            setStep('wallets')
          }
        }
      })
      .finally(() => setLoading(false))

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [params.id])

  function startPolling(sessionId: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/api/bot/status/${sessionId}`)
        if (res.data.success) setStats(res.data.data)
      } catch {}
    }, 5000)
  }

  async function handleAcceptToS() {
    if (!tosChecked) return
    setStep('tier')
  }

  async function handleCreateSession() {
    setWorking(true)
    setError(null)
    try {
      const res = await api.post('/api/bot/create', {
        token_id: params.id,
        chain:    token.chain,
        tier:     selectedTier,
        network:  'mainnet',
      })
      if (!res.data.success) throw new Error(res.data.error)
      const newSession = res.data.data
      setSession(newSession)

      // Accept ToS
      await api.post(`/api/bot/tos/${newSession.session_id}`)
      setStep('wallets')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleStart() {
    setWorking(true)
    setError(null)
    try {
      const sessionId = session?.session_id || session?.id
      await api.post(`/api/bot/start/${sessionId}`)
      setStep('running')
      startPolling(sessionId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  async function handleStop() {
    setWorking(true)
    try {
      const sessionId = session?.session_id || session?.id
      await api.post(`/api/bot/stop/${sessionId}`)
      if (pollRef.current) clearInterval(pollRef.current)
      setStep('wallets')
      setStats(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  const draft = token?.token_drafts

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
    </div>
  )

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
          <h1 className="page-title">Market Activity Bot</h1>
          <p className="page-subtitle">Automated market activity for {draft?.name} (${draft?.ticker})</p>
        </div>
        {step === 'running' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 8px #00FF88', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#00FF88' }}>ACTIVE</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* Step 1: ToS */}
      {step === 'tos' && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '28px 32px', maxWidth: 640 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Terms of Service</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 24 }}>
            <p style={{ marginBottom: 12 }}>The Market Activity Bot automates buy and sell transactions to simulate organic trading activity on decentralized exchanges.</p>
            <p style={{ marginBottom: 12 }}>By using this feature you acknowledge and agree that:</p>
            <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'You are solely responsible for all transactions executed by the bot',
                'You understand artificial trading activity may be restricted in your jurisdiction',
                '1launch is a tooling provider only and bears no responsibility for trading outcomes',
                'You will fund the bot wallets yourself and accept all associated financial risk',
                'This feature is not financial advice and does not guarantee any trading results',
              ].map((item, i) => (
                <li key={i} style={{ color: '#9CA3AF' }}>{item}</li>
              ))}
            </ul>
          </div>

          <div
            onClick={() => setTosChecked(!tosChecked)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 24 }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${tosChecked ? '#00FF88' : '#2A2A3E'}`,
              background: tosChecked ? '#00FF88' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {tosChecked && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#0A0A0F" strokeWidth="1.8" strokeLinecap="round"/></svg>}
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
              I have read and agree to the terms above. I understand I am solely responsible for all bot activity.
            </span>
          </div>

          <button
            onClick={handleAcceptToS}
            disabled={!tosChecked}
            style={{ padding: '10px 22px', background: tosChecked ? '#00FF88' : '#1E1E2E', color: tosChecked ? '#0A0A0F' : '#4B5563', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: tosChecked ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
          >
            Accept and Continue
          </button>
        </div>
      )}

      {/* Step 2: Tier selection */}
      {step === 'tier' && (
        <div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Select Tier</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {BOT_TIERS.map(tier => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                onSelect={() => setSelectedTier(tier.id as Tier)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('tos')} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Back</button>
            <button
              onClick={() => setStep('payment')}
              style={{ padding: '10px 22px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 2b: Payment */}
      {step === 'payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
              Subscription Required
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>
                  Volume Bot — {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
                  {selectedTier === 'starter' ? '$29/mo · 3 wallets' : selectedTier === 'growth' ? '$99/mo · 15 wallets' : '$299/mo · 50 wallets'}
                </div>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 900, color: '#00FF88' }}>
                {selectedTier === 'starter' ? '$29' : selectedTier === 'growth' ? '$99' : '$299'}
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>/mo</span>
              </div>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 20 }}>
              Pay with USDT, USDC, BNB or SOL. Subscription activates automatically within 2 minutes of payment confirmation.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep('tier')}
                style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  // Redirect to pricing page with bot plan pre-selected
                  window.open(`/pricing?bot=${selectedTier}`, '_blank')
                }}
                style={{ flex: 2, padding: '10px 0', background: '#FF9500', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Pay ${selectedTier === 'starter' ? '29' : selectedTier === 'growth' ? '99' : '299'}/mo
              </button>
            </div>
            <div style={{ textAlign: 'center' as const, marginTop: 12 }}>
              <button
                onClick={handleCreateSession}
                disabled={working}
                style={{ background: 'none', border: 'none', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {working ? 'Creating...' : 'I already paid — activate bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Fund wallets */}
      {step === 'wallets' && session && (
        <div>
          <div style={{ background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500', fontWeight: 600, marginBottom: 6 }}>Fund these wallets before starting</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
              Each wallet needs at least {token?.chain === 'solana' ? '0.5 SOL' : '0.05 BNB'} to cover gas and trade amounts. The bot will not start if wallets are unfunded.
            </div>
          </div>

          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
              Bot Wallets — {session.tier_config?.walletCount || '?'} wallets · {(session.tier || selectedTier).toUpperCase()} tier
            </div>
            {(session.deposit_wallets || []).map((w: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < session.deposit_wallets.length - 1 ? '1px solid #0A0A0F' : 'none' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', width: 24, flexShrink: 0 }}>#{i + 1}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', flex: 1, wordBreak: 'break-all' as const }}>{w.address}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(w.address)}
                  style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}
                >
                  Copy
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleStart}
              disabled={working}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 24px', background: working ? '#1E1E2E' : '#00FF88', color: working ? '#4B5563' : '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, cursor: working ? 'not-allowed' : 'pointer' }}
            >
              {working ? 'Starting...' : 'Start Bot'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Running */}
      {step === 'running' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <StatCard label="Volume Generated" value={`$${(stats?.volumeUSD || 0).toFixed(2)}`} sub="USD equivalent" />
            <StatCard label="Total Trades" value={String((stats?.buys || 0) + (stats?.sells || 0))} sub={`${stats?.buys || 0} buys · ${stats?.sells || 0} sells`} />
            <StatCard label="Cycles" value={String(stats?.cycles || 0)} />
            <StatCard label="Last Trade" value={stats?.lastTrade ? new Date(stats.lastTrade).toLocaleTimeString() : '—'} />
          </div>

          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Session Info</div>
            {[
              { label: 'Tier',    value: (session?.tier || selectedTier).toUpperCase() },
              { label: 'Chain',   value: (token?.chain || '').toUpperCase() },
              { label: 'Status',  value: 'Running' },
              { label: 'Errors',  value: String(stats?.errors || 0) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0A0A0F' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>{label}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleStop}
              disabled={working}
              style={{ padding: '10px 22px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#FF6B6B', cursor: working ? 'not-allowed' : 'pointer' }}
            >
              {working ? 'Stopping...' : 'Stop Bot'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}