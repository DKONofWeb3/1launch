// apps/web/src/app/dashboard/tokens/[id]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconBSC, IconSolana, IconTrendingUp, IconSignal } from '@/components/ui/Icons'

function formatNumber(n: number): string {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(6)}`
}

function RiskIcon({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: '#FF3B3B', high: '#FF3B3B', medium: '#FF9500', low: '#00FF88'
  }
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: colors[severity] || '#6B7280',
    }} />
  )
}

export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [token, setToken] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'socials' | 'copycats' | 'bubblemaps'>('overview')
  const [copycats, setCopycats] = useState<any[]>([])
  const [copycatsLoading, setCopycatsLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/api/launched-tokens/${params.id}`),
      api.get(`/api/launched-tokens/${params.id}/audit`),
    ]).then(([tokenRes, auditRes]) => {
      if (tokenRes.data.success) setToken(tokenRes.data.data)
      if (auditRes.data.success && auditRes.data.data) setAudit(auditRes.data.data)
    }).finally(() => setLoading(false))
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
    } catch (err: any) {
      alert('Audit failed: ' + err.message)
    } finally {
      setAuditing(false)
    }
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

  const draft = token.token_drafts
  const market = token.market_data
  const explorerBase = token.chain === 'bsc'
    ? 'https://testnet.bscscan.com/token/'
    : 'https://solscan.io/token/'

  return (
    <div className="dashboard-layout">
      <button
        onClick={() => router.push('/dashboard/tokens')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to tokens
      </button>

      {/* Token header card */}
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <TokenLogo url={draft?.logo_url} name={draft?.name || '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px' }}>
                {draft?.name}
              </span>
              {token.chain === 'bsc' ? <IconBSC size={20} /> : <IconSolana size={20} />}
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#00FF88', fontWeight: 600 }}>
              ${draft?.ticker}
            </span>
          </div>
          <a
            href={`${explorerBase}${token.contract_address}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#00FF88', textDecoration: 'none' }}
          >
            <IconTrendingUp size={13} color="#00FF88" />
            View on Explorer
          </a>
        </div>

        {market ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: 'PRICE',      value: formatNumber(market.price_usd),          color: undefined },
              { label: 'MARKET CAP', value: formatNumber(market.market_cap_usd),      color: undefined },
              { label: 'VOL 24H',    value: formatNumber(market.volume_24h),          color: undefined },
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
            No DEX pair detected yet. Add liquidity to PancakeSwap (BSC) or Raydium (Solana) to see live market data.
          </div>
        )}
      </div>

      {/* Quick action buttons */}
      <div className="quick-actions" style={{ marginBottom: 12 }}>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/roadmap`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#3B82F6' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 12h6M9 16h4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Roadmap
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/whitepaper`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#9CA3AF" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Whitepaper
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/lplock`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#FF9500' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#FF9500" strokeWidth="1.5"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          LP Lock
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/analytics`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#3B82F6' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 21H4.6A2.6 2.6 0 0 1 2 18.4V3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 16l4-5 4 3 4-6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Analytics
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/bot`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#8B5CF6' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a7 7 0 0 1 7 7v1h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a7 7 0 0 1-14 0h-1a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1V9a7 7 0 0 1 7-7z" stroke="#8B5CF6" strokeWidth="1.5"/>
            <path d="M9 12h.01M15 12h.01" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Vol Bot
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/memekit`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#FF9500' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#FF9500" strokeWidth="1.5"/>
            <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Meme Kit
        </button>
        <button
          onClick={() => router.push(`/dashboard/tokens/${params.id}/telegram`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: token.tg_setup_done ? 'rgba(0,255,136,0.08)' : 'rgba(39,174,230,0.08)', border: `1px solid ${token.tg_setup_done ? 'rgba(0,255,136,0.2)' : 'rgba(39,174,230,0.2)'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: token.tg_setup_done ? '#00FF88' : '#27AEE6' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          {token.tg_setup_done ? 'TG Setup Done' : 'Setup Telegram'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['overview', 'audit', 'socials', 'copycats', 'bubblemaps'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === 'copycats') loadCopycats() }}
            style={{ padding: '7px 16px', background: activeTab === tab ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${activeTab === tab ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: activeTab === tab ? '#00FF88' : '#6B7280', textTransform: 'capitalize' as const, transition: 'all 0.15s' }}
          >
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
                { label: 'CHAIN',     value: token.chain.toUpperCase() },
                { label: 'SUPPLY',    value: Number(draft?.total_supply).toLocaleString() },
                { label: 'BUY TAX',  value: `${draft?.tax_buy}%` },
                { label: 'SELL TAX', value: `${draft?.tax_sell}%` },
                { label: 'LP LOCK',  value: draft?.lp_lock ? 'Yes' : 'No' },
                { label: 'RENOUNCED', value: draft?.renounce ? 'Yes' : 'No' },
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
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', wordBreak: 'break-all' as const }}>{token.contract_address}</div>
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
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                    Last scanned: {new Date(audit.scanned_at).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" stroke="#00FF88" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M9 12l2 2 4-4" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>Powered by GoPlus Security</span>
                  </div>
                </div>
                <button onClick={runAudit} disabled={auditing} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
                  {auditing ? 'Scanning...' : 'Re-scan'}
                </button>
              </div>
              {audit.risks?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#FF3B3B', letterSpacing: '0.1em', marginBottom: 8 }}>RISKS DETECTED</div>
                  {audit.risks.map((risk: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.15)', borderRadius: 6, marginBottom: 6 }}>
                      <RiskIcon severity={risk.severity} />
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{risk.label}</div>
                        {risk.detail && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginTop: 2 }}>{risk.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {audit.passes?.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.1em', marginBottom: 8 }}>CHECKS PASSED</div>
                  {audit.passes.map((pass: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 6, marginBottom: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{pass.label}</span>
                    </div>
                  ))}
                </div>
              )}
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
          {draft?.first_tweets?.length > 0 && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 12 }}>LAUNCH TWEETS</div>
              {draft.first_tweets.map((tweet: string, i: number) => (
                <div key={i} style={{ padding: '12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 8 }}>{tweet}</p>
                  <button onClick={() => navigator.clipboard.writeText(tweet)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', cursor: 'pointer' }}>Copy</button>
                </div>
              ))}
            </div>
          )}
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
          ) : (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500', marginBottom: 12 }}>
                {copycats.length} similar token{copycats.length !== 1 ? 's' : ''} found — warn your community
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 8, padding: '8px 12px', background: '#0A0A0F', borderRadius: '6px 6px 0 0' }}>
                {['Name', 'Chain', 'Vol 24h', 'Match Type', 'Link'].map(h => (
                  <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{h}</span>
                ))}
              </div>
              {copycats.map((c: any, i: number) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px', gap: 8, padding: '10px 12px', borderTop: '1px solid #1E1E2E', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{c.name}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>${c.ticker}</div>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const, alignSelf: 'center' }}>{c.chain}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF', alignSelf: 'center' }}>${(c.volume_24h / 1000).toFixed(1)}K</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, alignSelf: 'center',
                    background: c.similarity === 'exact_ticker' ? 'rgba(255,59,59,0.1)' : 'rgba(255,149,0,0.1)',
                    border: `1px solid ${c.similarity === 'exact_ticker' ? 'rgba(255,59,59,0.3)' : 'rgba(255,149,0,0.3)'}`,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700,
                    color: c.similarity === 'exact_ticker' ? '#FF3B3B' : '#FF9500',
                    textTransform: 'uppercase' as const,
                  }}>
                    {c.similarity === 'exact_ticker' ? 'Same Ticker' : 'Similar Name'}
                  </span>
                  <a href={c.dex_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', textDecoration: 'none', alignSelf: 'center' }}>View</a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}