// apps/web/src/app/dashboard/tokens/[id]/whitepaper/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import { api } from '@/lib/api'

const mono = 'IBM Plex Mono, monospace'
const syne = 'Syne, sans-serif'

export default function WhitepaperPage() {
  const params  = useParams()
  const router  = useRouter()
  const { address }               = useAccount()
  const { sendTransactionAsync }  = useSendTransaction()

  const [token,      setToken]      = useState<any>(null)
  const [whitepaper, setWhitepaper] = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [paying,     setPaying]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloading,setDownloading]= useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [hasPaid,    setHasPaid]    = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/api/launched-tokens/${params.id}`),
      api.get(`/api/whitepaper/${params.id}`),
    ]).then(([tokenRes, wpRes]) => {
      if (tokenRes.data.success) setToken(tokenRes.data.data)
      if (wpRes.data.success && wpRes.data.data) {
        setWhitepaper(wpRes.data.data)
        setHasPaid(true) // already generated = already paid
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [params.id])

  async function payAndGenerate() {
    if (!address) { setError('Connect your wallet first'); return }
    setPaying(true)
    setError(null)
    try {
      // Live BNB price
      const bnbPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd')
        .then(r => r.json()).then(d => d.binancecoin.usd).catch(() => 603)
      const bnbAmount = (15 / bnbPrice).toFixed(6)

      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as `0x${string}`
      if (!platformWallet) throw new Error('Platform wallet not configured')

      // Create payment record
      const initRes = await api.post('/api/subscriptions/initiate', {
        plan_id: 'whitepaper', chain: 'bsc', token: 'BNB', wallet: address,
      })
      if (!initRes.data.success) throw new Error(initRes.data.error)
      const paymentId = initRes.data.data.id

      // MetaMask popup
      const txHash = await sendTransactionAsync({ to: platformWallet, value: parseEther(bnbAmount) })
      if (!txHash) throw new Error('Transaction cancelled')

      // Verify on backend
      await api.post('/api/payments/verify-tx', { tx_hash: txHash, chain: 'bsc', payment_id: paymentId })

      setHasPaid(true)
      setPaying(false)
      await generate()
    } catch (err: any) {
      setError(err.message || 'Payment failed')
      setPaying(false)
    }
  }

  async function generate() {
    if (!token) return
    setGenerating(true)
    setError(null)
    const draft = token.token_drafts
    try {
      const res = await api.post('/api/whitepaper/generate', {
        token_id:     params.id,
        name:         draft?.name,
        ticker:       draft?.ticker,
        chain:        token.chain.toUpperCase(),
        description:  draft?.description,
        total_supply: draft?.total_supply,
        narrative:    '',
      })
      if (res.data.success) setWhitepaper(res.data.data)
      else setError(res.data.error)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPDF() {
    setDownloading(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://onelaunch-api.onrender.com'
      const res    = await fetch(`${apiUrl}/api/whitepaper/${params.id}/download`)
      if (!res.ok) throw new Error('Download failed — try again')
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href  = URL.createObjectURL(blob)
      link.download = `${whitepaper?.meta?.name || 'token'}_litepaper.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  const draft = token?.token_drafts
  const sections = [
    'Abstract & Executive Summary',
    'Problem Statement',
    'The Solution',
    'Tokenomics & Distribution',
    '3-Phase Roadmap',
    'Community Vision',
    'Legal Disclaimer',
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: mono, color: '#6B7280', fontSize: 12 }}>Loading...</span>
    </div>
  )

  return (
    <div className="dashboard-layout">

      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Back to token
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: syne, fontSize: 22, fontWeight: 900, color: '#F9FAFB', marginBottom: 4 }}>Whitepaper</h1>
          <p style={{ fontFamily: mono, fontSize: 12, color: '#6B7280' }}>
            AI-generated litepaper for {draft?.name} (${draft?.ticker})
          </p>
        </div>
        {whitepaper && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={downloadPDF} disabled={downloading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: downloading ? '#1E1E2E' : 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, fontFamily: mono, fontSize: 12, fontWeight: 700, color: downloading ? '#4B5563' : '#00FF88', cursor: downloading ? 'not-allowed' : 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M8 13l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button onClick={generate} disabled={generating} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, fontFamily: mono, fontSize: 12, color: '#6B7280', cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: mono, fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Format',   value: 'PDF — Dark theme'      },
          { label: 'Sections', value: '7 sections'            },
          { label: 'Includes', value: 'Roadmap + Tokenomics'  },
          { label: 'Price',    value: hasPaid ? 'Paid' : '$15' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: label === 'Price' && hasPaid ? '#00FF88' : '#F9FAFB' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* What's included */}
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>What's Included</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sections.map((section, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke={whitepaper ? '#00FF88' : '#1E1E2E'} strokeWidth="1.2"/>
                {whitepaper && <path d="M4 7l2 2 4-4" stroke="#00FF88" strokeWidth="1.2" strokeLinecap="round"/>}
              </svg>
              <span style={{ fontFamily: mono, fontSize: 11, color: whitepaper ? '#9CA3AF' : '#374151' }}>{section}</span>
            </div>
          ))}
        </div>
      </div>

      {/* State: generating */}
      {generating && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '50px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #1E1E2E', borderTop: '2px solid #00FF88', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ fontFamily: mono, fontSize: 12, color: '#6B7280' }}>Generating your whitepaper...</p>
        </div>
      )}

      {/* State: not paid, no whitepaper */}
      {!hasPaid && !whitepaper && !generating && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 18px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#2A2A3E" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#2A2A3E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontFamily: syne, fontSize: 17, fontWeight: 800, color: '#F9FAFB', marginBottom: 8 }}>No whitepaper yet</p>
          <p style={{ fontFamily: mono, fontSize: 12, color: '#6B7280', maxWidth: 340, margin: '0 auto 28px', lineHeight: 1.7 }}>
            Generate a professional litepaper — tokenomics, roadmap, legal disclaimer. Exports as a styled PDF you can share anywhere.
          </p>
          <div style={{ fontFamily: syne, fontSize: 30, fontWeight: 900, color: '#F9FAFB', marginBottom: 4 }}>$15</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#4B5563', marginBottom: 24 }}>One-time · BNB · MetaMask</div>
          <button
            onClick={payAndGenerate}
            disabled={paying}
            style={{ padding: '13px 36px', background: paying ? '#1E1E2E' : '#00FF88', border: 'none', borderRadius: 8, fontFamily: mono, fontSize: 13, fontWeight: 700, color: paying ? '#374151' : '#0A0A0F', cursor: paying ? 'not-allowed' : 'pointer' }}
          >
            {paying ? 'Confirm in MetaMask...' : 'Pay $15 & Generate'}
          </button>
        </div>
      )}

      {/* State: ready */}
      {whitepaper && !generating && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#00FF88" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 2v6h6" stroke="#00FF88" strokeWidth="1.5"/>
            </svg>
            <span style={{ fontFamily: syne, fontSize: 15, fontWeight: 800, color: '#00FF88' }}>Whitepaper ready</span>
          </div>
          <p style={{ fontFamily: mono, fontSize: 11, color: '#6B7280' }}>
            Generated {whitepaper.meta?.generated_at ? new Date(whitepaper.meta.generated_at).toLocaleString() : 'just now'} — click Download PDF above.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
