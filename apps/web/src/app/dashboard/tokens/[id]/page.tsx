// apps/web/src/app/dashboard/tokens/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconBSC, IconSolana, IconTrendingUp, IconSignal } from '@/components/ui/Icons'
import { useSendTransaction, useAccount } from 'wagmi'
import { parseEther } from 'viem'

function formatNumber(n: number): string {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(6)}`
}

// ── Boost modal ───────────────────────────────────────────────────────────────
function BoostModal({ contractAddress, chain, onClose }: {
  contractAddress: string
  chain: string
  onClose: () => void
}) {
  const [tier,    setTier]    = useState<string | null>(null)
  const [step,    setStep]    = useState<'select' | 'pay' | 'done'>('select')
  const [payData, setPayData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)
  const { address }                        = useAccount()
  const { sendTransactionAsync: sendTransaction } = useSendTransaction()

  const tiers = [
    { id: 'starter', label: 'Starter', price: '$29', wallets: '3 wallets',  usd: 29  },
    { id: 'growth',  label: 'Growth',  price: '$79', wallets: '10 wallets', usd: 79, popular: true },
    { id: 'pro',     label: 'Pro',     price: '$149', wallets: '25 wallets', usd: 149 },
  ]

  async function payWithWallet() {
    if (!tier) return
    setLoading(true)
    setError(null)
    try {
      const selected = tiers.find(t => t.id === tier)!

      // Get BNB price to calculate amount
      const bnbPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd')
        .then(r => r.json()).then(d => d.binancecoin.usd).catch(() => 603)
      const bnbAmount = (selected.usd / bnbPrice).toFixed(6)

      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || ''
      if (!platformWallet) throw new Error('Platform wallet not configured')

      // Create payment record
      const initRes = await api.post('/api/subscriptions/initiate', {
        plan_id: `volbot_${tier}`, chain: 'bsc', token: 'BNB', wallet: address || 'user',
      })
      if (!initRes.data.success) throw new Error(initRes.data.error)
      const paymentId = initRes.data.data.id

      // Send BNB — MetaMask pops up
      const txHash = await sendTransaction({
        to:    platformWallet as `0x${string}`,
        value: parseEther(bnbAmount),
      })

      if (!txHash) throw new Error('Transaction was not confirmed')

      // Verify on backend
      await api.post('/api/payments/verify-tx', {
        tx_hash: txHash, chain: 'bsc', payment_id: paymentId,
      })

      setStep('done')
    } catch (err: any) {
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  function copyAddr() {
    navigator.clipboard.writeText(payData.payment_address)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (step !== 'pay' || !payData?.id) return
    const iv = setInterval(async () => {
      try {
        const res = await api.get(`/api/subscriptions/payment-status/${payData.id}`)
        if (res.data.data?.status === 'confirmed') { setStep('done'); clearInterval(iv) }
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [step, payData?.id])

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px',
  }
  const card: React.CSSProperties = {
    background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 16,
    padding: '24px', maxWidth: 440, width: '100%',
  }

  if (step === 'done') return (
    <div style={overlay}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#00FF88', marginBottom: 8 }}>Volume Bot activated.</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Trading activity will start within 2 minutes.</div>
        <button onClick={onClose} style={{ padding: '10px 24px', background: '#00FF88', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0A0A0F' }}>Done</button>
      </div>
    </div>
  )



  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 8 }}>VOLUME BOT</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#F9FAFB', marginBottom: 6 }}>Don't let your chart go quiet.</div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.7, marginBottom: 16 }}>
          Simulates real trading activity so your token doesn't look dead. First 5 minutes matter most.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {tiers.map(t => (
            <button key={t.id} onClick={() => setTier(t.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 14px',
              background: tier === t.id ? 'rgba(0,255,136,0.06)' : '#0A0A0F',
              border: `1.5px solid ${tier === t.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
              borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${tier === t.id ? '#00FF88' : '#2A2A3E'}`, background: tier === t.id ? '#00FF88' : 'transparent' }} />
                <div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{t.label}</span>
                  {t.popular && <span style={{ marginLeft: 8, padding: '1px 6px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#00FF88', fontWeight: 700 }}>most used</span>}
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', marginTop: 1 }}>{t.wallets}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{t.price}</span>
            </button>
          ))}
        </div>
        {error && <div style={{ padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={payWithWallet} disabled={!tier || loading} style={{ flex: 2, padding: '12px 0', background: tier && !loading ? '#00FF88' : '#1E1E2E', border: 'none', borderRadius: 8, cursor: tier && !loading ? 'pointer' : 'not-allowed', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: tier && !loading ? '#0A0A0F' : '#374151' }}>
            {loading ? 'Confirm in MetaMask...' : 'Boost My Token'}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [token,           setToken]           = useState<any>(null)
  const [audit,           setAudit]           = useState<any>(null)
  const [loading,         setLoading]         = useState(true)
  const [auditing,        setAuditing]        = useState(false)
  const [activeTab,       setActiveTab]       = useState<'overview' | 'audit' | 'socials' | 'copycats'>('overview')
  const [copycats,        setCopycats]        = useState<any[]>([])
  const [copycatsLoading, setCopycatsLoading] = useState(false)
  const [showBoost,       setShowBoost]       = useState(false)

  useEffect(() => {
    api.get(`/api/launched-tokens/${params.id}`)
      .then(res => { if (res.data.success) setToken(res.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  async function loadCopycats() {
    if (copycats.length > 0) return
    setCopycatsLoading(true)
    try {
      const res = await api.get(`/api/token-search/copycats/${params.id}`)
      if (res.data.success) setCopycats(res.data.data.live || [])
    } catch {}
    finally { setCopycatsLoading(false) }
  }

  async function runAudit() {
    setAuditing(true)
    try {
      const res = await api.post(`/api/launched-tokens/${params.id}/audit`)
      if (res.data.success) setAudit(res.data.data)
    } catch (err: any) { alert('Audit failed: ' + err.message) }
    finally { setAuditing(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
    </div>
  )

  if (!token) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280' }}>Token not found</p>
    </div>
  )

  const draft       = token.token_drafts
  const market      = token.market_data
  const isBoosted   = token.volume_bot_tier && token.volume_bot_tier !== 'none'

  // Contract address — use what's stored, but flag if it looks like a tx hash
  const contractAddr  = token.contract_address || ''
  const looksLikeTx   = contractAddr.length === 66 // tx hashes are 66 chars (0x + 64)
  const explorerBase  = token.chain === 'bsc' ? 'https://bscscan.com/token/' : 'https://solscan.io/token/'
  const explorerUrl   = looksLikeTx
    ? (token.chain === 'bsc' ? `https://bscscan.com/tx/${contractAddr}` : `https://solscan.io/tx/${contractAddr}`)
    : `${explorerBase}${contractAddr}`

  return (
    <div className="dashboard-layout">
      {showBoost && (
        <BoostModal
          contractAddress={contractAddr}
          chain={token.chain}
          onClose={() => setShowBoost(false)}
        />
      )}

      <button onClick={() => router.push('/dashboard/tokens')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to tokens
      </button>

      {/* Token header */}
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <TokenLogo url={draft?.logo_url} name={draft?.name || '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px' }}>{draft?.name}</span>
              {token.chain === 'bsc' ? <IconBSC size={20} /> : <IconSolana size={20} />}
              {isBoosted && (
                <span style={{ padding: '2px 8px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: '#00FF88' }}>BOOSTED</span>
              )}
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#00FF88', fontWeight: 600 }}>${draft?.ticker}</span>
          </div>
          <a href={explorerUrl} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#00FF88', textDecoration: 'none' }}>
            <IconTrendingUp size={13} color="#00FF88" />
            View on Explorer
          </a>
        </div>

        {looksLikeTx && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500', marginBottom: 14 }}>
            Contract address not available for this token — stored as tx hash. Go to the explorer and copy the token address from the transaction to update.
          </div>
        )}

        {market ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'PRICE',      value: formatNumber(market.price_usd), color: undefined },
              { label: 'MARKET CAP', value: formatNumber(market.market_cap_usd), color: undefined },
              { label: 'VOL 24H',    value: formatNumber(market.volume_24h), color: undefined },
              { label: '24H CHANGE', value: `${market.price_change_24h >= 0 ? '+' : ''}${market.price_change_24h?.toFixed(2)}%`, color: market.price_change_24h >= 0 ? '#00FF88' : '#FF3B3B' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '10px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700, color: color || '#F9FAFB' }}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px 16px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500' }}>
            No DEX pair detected yet. Add liquidity to PancakeSwap (BSC) or Raydium (Solana) to see live data.
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {!isBoosted && (
          <button onClick={() => setShowBoost(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 7, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88' }}>
            Boost Token
          </button>
        )}
        <a href={explorerUrl} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
          View on Explorer
        </a>
        <a href={token.chain === 'bsc' ? `https://pancakeswap.finance/add/${contractAddr}` : `https://raydium.io/liquidity/create-pool/`}
          target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
          Add Liquidity
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['overview', 'audit', 'socials', 'copycats'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'copycats') loadCopycats() }}
            style={{ padding: '7px 16px', background: activeTab === tab ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${activeTab === tab ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: activeTab === tab ? '#00FF88' : '#6B7280', textTransform: 'capitalize' as const }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 14 }}>TOKEN DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'CHAIN',    value: token.chain.toUpperCase() },
                { label: 'SUPPLY',   value: Number(draft?.total_supply).toLocaleString() },
                { label: 'BUY TAX', value: `${draft?.tax_buy}%` },
                { label: 'SELL TAX', value: `${draft?.tax_sell}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 10 }}>CONTRACT ADDRESS</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', wordBreak: 'break-all' as const, marginBottom: 10 }}>
              {looksLikeTx ? '(tx hash stored — see warning above)' : contractAddr}
            </div>
            {!looksLikeTx && (
              <button onClick={() => navigator.clipboard.writeText(contractAddr)}
                style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      {/* Audit */}
      {activeTab === 'audit' && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
          {audit ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>
                    Security Score: <span style={{ color: audit.score >= 80 ? '#00FF88' : audit.score >= 60 ? '#FF9500' : '#FF3B3B' }}>{audit.score}/100</span>
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>Last scanned: {new Date(audit.scanned_at).toLocaleString()}</div>
                </div>
                <button onClick={runAudit} disabled={auditing} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
                  {auditing ? 'Scanning...' : 'Re-scan'}
                </button>
              </div>
              {audit.risks?.map((risk: any, i: number) => (
                <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.15)', borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{risk.label}</div>
                  {risk.detail && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginTop: 2 }}>{risk.detail}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <IconSignal size={32} color="#1E1E2E" />
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151', marginTop: 12, marginBottom: 6 }}>No audit yet</p>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563', display: 'block', marginBottom: 16 }}>Run a free security scan powered by GoPlus</span>
              <button onClick={runAudit} disabled={auditing} style={{ padding: '10px 20px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {auditing ? 'Scanning...' : 'Run Free Audit Scan'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Socials */}
      {activeTab === 'socials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'TELEGRAM BIO', value: draft?.tg_bio },
            { label: 'TWITTER BIO',  value: draft?.twitter_bio },
          ].map(({ label, value }) => value && (
            <div key={label} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 10 }}>{value}</p>
              <button onClick={() => navigator.clipboard.writeText(value)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>Copy</button>
            </div>
          ))}
          {draft?.first_tweets?.map((tweet: string, i: number) => (
            <div key={i} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 10 }}>LAUNCH TWEET {i + 1}</div>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 10 }}>{tweet}</p>
              <button onClick={() => navigator.clipboard.writeText(tweet)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>Copy</button>
            </div>
          ))}
        </div>
      )}

      {/* Copycats */}
      {activeTab === 'copycats' && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 3 }}>Copycat Tracker</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>Tokens with similar name or ticker on any chain</div>
            </div>
            <button onClick={loadCopycats} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>Refresh</button>
          </div>
          {copycatsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Scanning DexScreener...</div>
          ) : copycats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#00FF88', marginBottom: 6 }}>No copycats detected</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>We scan hourly and alert you via Telegram when new ones appear</div>
            </div>
          ) : copycats.map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid #1E1E2E' }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{c.name} (${c.ticker})</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{c.chain.toUpperCase()} · ${(c.volume_24h / 1000).toFixed(1)}K vol</div>
              </div>
              <a href={c.dex_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', textDecoration: 'none' }}>View</a>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
