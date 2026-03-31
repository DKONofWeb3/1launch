// apps/web/src/app/pricing/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { api } from '@/lib/api'

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    0,
    color:    '#6B7280',
    border:   '#1E1E2E',
    launches: '1 token',
    features: [
      { label: 'BSC + Solana deployment',  included: true  },
      { label: 'Auto audit scan (GoPlus)', included: true  },
      { label: 'Pre-launch checklist',     included: true  },
      { label: 'Telegram setup guide',     included: true  },
      { label: 'Launch timing engine',     included: true  },
      { label: 'Bubblemaps integration',   included: true  },
      { label: 'Meme kit generator',       included: false, addon: '$9' },
      { label: 'Post-launch roadmap',      included: false, addon: '$19' },
      { label: 'Whitepaper generator',     included: false, addon: '$29' },
      { label: 'LP lock',                  included: false, addon: '$19' },
      { label: 'Sniper + whale tracker',   included: false },
      { label: 'Copycat tracker + alerts', included: false },
    ],
    cta: 'Get Started Free',
  },
  {
    id:       'builder',
    name:     'Builder',
    price:    49,
    color:    '#3B82F6',
    border:   'rgba(59,130,246,0.3)',
    launches: '5 tokens/mo',
    features: [
      { label: 'BSC + Solana deployment',  included: true  },
      { label: 'Auto audit scan (GoPlus)', included: true  },
      { label: 'Pre-launch checklist',     included: true  },
      { label: 'Telegram setup guide',     included: true  },
      { label: 'Launch timing engine',     included: true  },
      { label: 'Bubblemaps integration',   included: true  },
      { label: 'Meme kit generator',       included: true  },
      { label: 'Post-launch roadmap',      included: true  },
      { label: 'Whitepaper generator',     included: false, addon: '$29' },
      { label: 'LP lock (basic)',          included: true  },
      { label: 'On-chain analytics',       included: true  },
      { label: 'Sniper + whale tracker',   included: false, addon: '$14/mo' },
      { label: 'Copycat tracker + alerts', included: false, addon: '$14/mo' },
      { label: 'KOL marketplace access',   included: true  },
    ],
    cta: 'Subscribe — $49/mo',
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    149,
    color:    '#00FF88',
    border:   'rgba(0,255,136,0.4)',
    badge:    'Most Popular',
    launches: 'Unlimited',
    features: [
      { label: 'BSC + Solana deployment',   included: true  },
      { label: 'Auto audit scan (GoPlus)',  included: true  },
      { label: 'Pre-launch checklist',      included: true  },
      { label: 'Telegram setup guide',      included: true  },
      { label: 'Launch timing engine',      included: true  },
      { label: 'Bubblemaps integration',    included: true  },
      { label: 'Meme kit generator',        included: true  },
      { label: 'Post-launch roadmap',       included: true  },
      { label: 'Whitepaper generator',      included: true  },
      { label: 'LP lock (basic)',           included: true  },
      { label: 'Full on-chain analytics',   included: true  },
      { label: 'Sniper + whale tracker',    included: true  },
      { label: 'Copycat tracker + alerts',  included: true  },
      { label: 'KOL marketplace access',    included: true  },
      { label: 'Volume bot (Starter tier)', included: true  },
    ],
    cta: 'Subscribe — $149/mo',
  },
  {
    id:       'agency',
    name:     'Agency',
    price:    499,
    color:    '#FF9500',
    border:   'rgba(255,149,0,0.3)',
    launches: 'Unlimited',
    features: [
      { label: 'Everything in Pro',         included: true  },
      { label: 'Volume bot (Growth tier)',  included: true  },
      { label: 'White-label dashboard',     included: true  },
      { label: 'Priority support',          included: true  },
      { label: 'Agency client management',  included: true  },
      { label: 'Custom branding',           included: true  },
    ],
    cta: 'Subscribe — $499/mo',
  },
]

const PAYMENT_OPTIONS = [
  { chain: 'bsc',    token: 'USDT', label: 'USDT on BSC',    icon: '💵' },
  { chain: 'bsc',    token: 'BUSD', label: 'BUSD on BSC',    icon: '💵' },
  { chain: 'bsc',    token: 'BNB',  label: 'BNB',            icon: '🟡' },
  { chain: 'solana', token: 'USDC', label: 'USDC on Solana', icon: '💵' },
  { chain: 'solana', token: 'SOL',  label: 'SOL',            icon: '🟣' },
]

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill={`${color}20`}/>
      <path d="M4 7l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="rgba(107,114,128,0.1)"/>
      <path d="M5 5l4 4M9 5l-4 4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function PaymentModal({ plan, onClose, walletAddress }: { plan: any; onClose: () => void; walletAddress: string }) {
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_OPTIONS[0])
  const [paymentData, setPaymentData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function initiatePayment() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/subscriptions/initiate', {
        plan_id: plan.id,
        chain:   selectedPayment.chain,
        token:   selectedPayment.token,
        wallet:  walletAddress,
      })
      if (res.data.success) {
        setPaymentData(res.data.data)
        startPolling(res.data.data.id)
      } else {
        setError(res.data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startPolling(paymentId: string) {
    setPolling(true)
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/subscriptions/payment/${paymentId}`)
        if (res.data.data?.status === 'confirmed') {
          setConfirmed(true)
          setPolling(false)
          clearInterval(interval)
        }
      } catch {}
    }, 10000) // poll every 10 seconds
    // Stop after 2 hours
    setTimeout(() => { clearInterval(interval); setPolling(false) }, 2 * 60 * 60 * 1000)
  }

  function copyAddress() {
    if (!paymentData?.payment_address) return
    navigator.clipboard.writeText(paymentData.payment_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 14, padding: '28px 32px', maxWidth: 480, width: '100%' }}>

        {confirmed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }}>
              <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-5" stroke="#00FF88" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#00FF88', marginBottom: 8 }}>Payment Confirmed!</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
              Your {plan.name} plan is now active for 30 days.
            </div>
            <button onClick={onClose} style={{ padding: '10px 24px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Start Building
            </button>
          </div>
        ) : !paymentData ? (
          <>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>
              Subscribe to {plan.name}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 24 }}>
              ${plan.price}/month · 30-day access · renews manually
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                Pay With
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PAYMENT_OPTIONS.map(opt => (
                  <div
                    key={`${opt.chain}_${opt.token}`}
                    onClick={() => setSelectedPayment(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', cursor: 'pointer', borderRadius: 8,
                      background: selectedPayment === opt ? 'rgba(0,255,136,0.06)' : '#0A0A0F',
                      border: `1px solid ${selectedPayment === opt ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{opt.icon}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: selectedPayment === opt ? '#00FF88' : '#9CA3AF' }}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B' }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', cursor: 'pointer' }}>Cancel</button>
              <button onClick={initiatePayment} disabled={loading} style={{ flex: 2, padding: '10px 0', background: loading ? '#1E1E2E' : plan.color === '#6B7280' ? '#1E1E2E' : '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Generating payment...' : `Pay $${plan.price} in ${selectedPayment.token}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>Send Payment</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 20 }}>
              Send exactly the amount below to activate your subscription. We monitor automatically.
            </div>

            <div style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 4 }}>AMOUNT</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#00FF88' }}>
                    {paymentData.crypto_amount} {selectedPayment.token}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>${plan.price} USD</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 4 }}>NETWORK</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{selectedPayment.chain.toUpperCase()}</div>
                </div>
              </div>

              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 6 }}>SEND TO</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', wordBreak: 'break-all' as const }}>
                    {paymentData.payment_address}
                  </div>
                  <button
                    onClick={copyAddress}
                    style={{ padding: '5px 10px', background: copied ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: copied ? '#00FF88' : '#6B7280', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)', borderRadius: 8, marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500' }}>
              Send the exact amount shown. Your subscription activates within 2 minutes of payment detection. This payment link expires in 2 hours.
            </div>

            {polling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '10px 0' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="7" cy="7" r="5" stroke="#1E1E2E" strokeWidth="2" fill="none"/>
                  <path d="M7 2a5 5 0 0 1 5 5" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
                  Waiting for payment confirmation...
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PricingPage() {
  const { address } = useAccount()
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<string>('free')

  useEffect(() => {
    if (!address) return
    api.get(`/api/subscriptions/me?wallet=${address}`)
      .then(res => { if (res.data.success) setCurrentPlan(res.data.data.plan.id) })
      .catch(() => {})
  }, [address])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '60px 24px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            Pricing
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 12 }}>
            Launch faster. Earn more.
          </h1>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', maxWidth: 480, margin: '0 auto 20px' }}>
            Pay with crypto. No cards. No KYC. Subscriptions activate automatically within 2 minutes of payment.
          </p>
          {!address && (
            <div style={{ display: 'inline-block' }}>
              <ConnectButton showBalance={false} accountStatus="avatar" />
            </div>
          )}
          {address && currentPlan !== 'free' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00FF88' }} />
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
                Active: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </span>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 60 }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              style={{
                background: plan.badge ? 'rgba(0,255,136,0.03)' : '#0E0E16',
                border: `1.5px solid ${plan.border}`,
                borderRadius: 14, padding: '24px',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', background: '#00FF88', borderRadius: 20, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 800, color: '#0A0A0F', whiteSpace: 'nowrap' as const }}>
                  {plan.badge}
                </div>
              )}

              {currentPlan === plan.id && (
                <div style={{ position: 'absolute', top: 12, right: 12, padding: '2px 8px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: '#00FF88' }}>
                  Current
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color: plan.color }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>/month</span>}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                  {plan.launches} · crypto payment
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {plan.features.map((f: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {f.included ? <CheckIcon color={plan.color} /> : <CrossIcon />}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: f.included ? '#9CA3AF' : '#374151' }}>
                      {f.label}
                    </span>
                    {f.addon && !f.included && (
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginLeft: 'auto' as const }}>{f.addon}</span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  if (plan.price === 0) return
                  if (!address) { alert('Connect your wallet first'); return }
                  setSelectedPlan(plan)
                }}
                disabled={currentPlan === plan.id}
                style={{
                  padding: '11px 0', borderRadius: 8, border: 'none', cursor: plan.price === 0 || currentPlan === plan.id ? 'default' : 'pointer',
                  background: currentPlan === plan.id ? '#1E1E2E' : plan.price === 0 ? '#1E1E2E' : plan.color === '#00FF88' ? '#00FF88' : `${plan.color}20`,
                  border: currentPlan !== plan.id && plan.price > 0 ? `1px solid ${plan.color}40` : '1px solid transparent',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
                  color: plan.color === '#00FF88' && currentPlan !== plan.id && plan.price > 0 ? '#0A0A0F' : plan.color === '#6B7280' ? '#4B5563' : currentPlan === plan.id ? '#4B5563' : plan.color,
                  transition: 'all 0.15s',
                }}
              >
                {currentPlan === plan.id ? 'Current Plan' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Add-ons section */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F9FAFB', marginBottom: 6, textAlign: 'center' as const }}>À La Carte Add-Ons</h2>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 24, textAlign: 'center' as const }}>Only pay for what you need</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[
              { label: 'BSC Token Deploy',         price: '$9',   type: 'one-time' },
              { label: 'Solana Token Deploy',       price: '$6',   type: 'one-time' },
              { label: 'Extra Launch',              price: '$15',  type: 'one-time' },
              { label: 'Meme Kit',                  price: '$9',   type: 'one-time' },
              { label: 'Post-Launch Roadmap',       price: '$19',  type: 'one-time' },
              { label: 'Whitepaper (Basic)',         price: '$29',  type: 'one-time' },
              { label: 'Whitepaper (Premium DOCX)', price: '$99',  type: 'one-time' },
              { label: 'LP Lock (Basic)',            price: '$19',  type: 'one-time' },
              { label: 'LP Lock (Unicrypt)',         price: '$49',  type: 'one-time' },
              { label: 'Sniper Tracker',             price: '$14',  type: 'monthly'  },
              { label: 'Whale Monitor',             price: '$14',  type: 'monthly'  },
              { label: 'Copycat Tracker',            price: '$14',  type: 'monthly'  },
              { label: 'Renounce Contract',          price: '$19',  type: 'one-time' },
              { label: 'CoinGecko/CMC Submission',  price: '$149', type: 'one-time' },
              { label: 'Meme Site Listings',        price: '$79',  type: 'one-time' },
              { label: 'TG Trending (Alpha)',       price: '$299', type: 'one-time' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px 14px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{item.type}</div>
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00FF88' }}>{item.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#F9FAFB', marginBottom: 20, textAlign: 'center' as const }}>Common Questions</h2>
          {[
            { q: 'How does crypto payment work?', a: 'Select your plan and preferred token. We generate a payment address and exact amount. Send the crypto and your subscription activates automatically within 2 minutes — no manual confirmation needed.' },
            { q: 'What happens when my plan expires?', a: 'Your account automatically reverts to the Free plan. You keep all your launched tokens and their data. You can renew any time and your history stays intact.' },
            { q: 'Can I use add-ons on the Free plan?', a: 'Yes. Most add-ons are available as one-time purchases on any plan. Some features like the volume bot require a paid subscription tier.' },
            { q: 'Is there a refund policy?', a: 'All payments are final — crypto transactions are irreversible. We recommend starting with the Free plan to test the platform before upgrading.' },
          ].map((faq, i) => (
            <div key={i} style={{ marginBottom: 16, padding: '16px 20px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedPlan && address && (
        <PaymentModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} walletAddress={address} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
