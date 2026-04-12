// apps/web/src/app/admin/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'

function fmt(n: number) {
  if (!n) return '$0'
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}
function shortAddr(a: string) { return a ? `${a.slice(0,6)}...${a.slice(-4)}` : '—' }
function Badge({ label, color = '#6B7280' }: { label: string; color?: string }) {
  return <span style={{ padding: '2px 8px', background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase' as const }}>{label}</span>
}
function StatCard({ label, value, sub, color = '#F9FAFB' }: any) {
  return (
    <div style={{ padding: '16px 18px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 900, color, marginBottom: 3 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{sub}</div>}
    </div>
  )
}
function RevenueChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Revenue — Last 30 Days</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {data.map((d, i) => <div key={i} title={`${d.date}: $${d.revenue}`} style={{ flex: 1 }}><div style={{ width: '100%', height: `${Math.max((d.revenue / max) * 80, d.revenue > 0 ? 4 : 1)}px`, background: d.revenue > 0 ? '#00FF88' : '#1E1E2E', borderRadius: 2 }} /></div>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{data[0]?.date?.slice(5)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{data[data.length-1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

type Tab = 'overview' | 'users' | 'payments' | 'tokens' | 'broadcast'

export default function AdminPage() {
  const [tab,             setTab]             = useState<Tab>('overview')
  const [keyInput,        setKeyInput]        = useState('')
  const [authed,          setAuthed]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [overview,        setOverview]        = useState<any>(null)
  const [chart,           setChart]           = useState<any[]>([])
  const [users,           setUsers]           = useState<any[]>([])
  const [payments,        setPayments]        = useState<any[]>([])
  const [tokens,          setTokens]          = useState<any[]>([])
  const [broadcastMsg,    setBroadcastMsg]    = useState('')
  const [broadcastFilter, setBroadcastFilter] = useState('all')
  const [broadcasting,    setBroadcasting]    = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)

  // useRef so loadTab always gets fresh key even after re-renders
  const keyRef = useRef('')
  keyRef.current = keyInput

  function h() { return { 'x-admin-key': keyRef.current } }

  async function handleAuth() {
    setError(null)
    try {
      const r = await api.get('/api/admin/overview', { headers: { 'x-admin-key': keyInput } })
      if (r.data.success) {
        setAuthed(true)
        setOverview(r.data.data)
        api.get('/api/admin/revenue-chart', { headers: { 'x-admin-key': keyInput } })
          .then(c => { if (c.data.success) setChart(c.data.data) })
      } else {
        setError(r.data.error || 'Invalid admin key')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid admin key — check ADMIN_KEY env var in Render')
    }
  }

  async function loadTab(t: Tab) {
    setLoading(true)
    setError(null)
    try {
      if (t === 'overview') {
        const [ov, ch] = await Promise.all([
          api.get('/api/admin/overview', { headers: h() }),
          api.get('/api/admin/revenue-chart', { headers: h() }),
        ])
        if (ov.data.success) setOverview(ov.data.data)
        if (ch.data.success) setChart(ch.data.data)
      } else if (t === 'users') {
        const r = await api.get('/api/admin/users', { headers: h() })
        if (r.data.success) setUsers(r.data.data || [])
      } else if (t === 'payments') {
        const r = await api.get('/api/admin/payments', { headers: h() })
        if (r.data.success) setPayments(r.data.data || [])
      } else if (t === 'tokens') {
        const r = await api.get('/api/admin/tokens', { headers: h() })
        if (r.data.success) setTokens(r.data.data || [])
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleBroadcast() {
    if (!broadcastMsg) return
    setBroadcasting(true); setBroadcastResult(null)
    try {
      const r = await api.post('/api/admin/broadcast', { message: broadcastMsg, plan_filter: broadcastFilter }, { headers: h() })
      if (r.data.success) { setBroadcastResult(`Sent to ${r.data.sent} users`); setBroadcastMsg('') }
    } catch {}
    finally { setBroadcasting(false) }
  }

  useEffect(() => { if (authed) loadTab(tab) }, [tab, authed])

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }
  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'users', label: 'Users' },
    { id: 'payments', label: 'Payments' }, { id: 'tokens', label: 'Tokens' },
    { id: 'broadcast', label: 'Broadcast' },
  ]

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '32px', width: 360 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>Admin Panel</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 24 }}>1launch internal dashboard</div>
        <input type="password" placeholder="Admin key" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} style={{ ...inp, marginBottom: 12 }} />
        {error && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 12 }}>{error}</div>}
        <button onClick={handleAuth} style={{ width: '100%', padding: '10px', background: '#00FF88', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0A0A0F', cursor: 'pointer' }}>Enter</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>Admin</h1>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>1launch platform management</div>
          </div>
          <button onClick={() => loadTab(tab)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', background: tab === t.id ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${tab === t.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: tab === t.id ? '#00FF88' : '#6B7280' }}>{t.label}</button>
          ))}
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B', marginBottom: 16 }}>{error}</div>}
        {loading && <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>}

        {/* Overview */}
        {tab === 'overview' && !loading && overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <StatCard label="Revenue This Month" value={fmt(overview.revenue_month  || 0)} sub="confirmed payments"  color="#00FF88" />
              <StatCard label="Revenue All Time"   value={fmt(overview.revenue_total  || 0)} sub="total collected"     color="#00FF88" />
              <StatCard label="Tokens Launched"    value={overview.total_tokens || 0}         sub="all time" />
              <StatCard label="This Month"         value={overview.tokens_month || 0}         sub="new tokens" />
              <StatCard label="BSC Launches"       value={overview.bsc_tokens   || 0}         sub={`${fmt((overview.bsc_tokens||0)*2)} collected`} color="#F3BA2F" />
              <StatCard label="SOL Launches"       value={overview.sol_tokens   || 0}         sub={`${fmt((overview.sol_tokens||0)*1)} collected`}  color="#9945FF" />
              <StatCard label="Total Users"        value={overview.total_users  || 0}         sub="connected wallets" />
              <StatCard label="TG Linked"          value={overview.tg_linked_users || 0}      sub="wallet + TG synced" color="#27AEE6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>Revenue Breakdown</div>
                {[
                  { label: 'BSC Launches ($2)', value: fmt((overview.bsc_tokens||0)*2),       color: '#F3BA2F' },
                  { label: 'SOL Launches ($1)', value: fmt((overview.sol_tokens||0)*1),        color: '#9945FF' },
                  { label: 'Volume Bots',        value: fmt(overview.volbot_revenue    || 0),  color: '#8B5CF6' },
                  { label: 'Audit Scans ($4)',   value: fmt(overview.audit_revenue     || 0),  color: '#3B82F6' },
                  { label: 'Whitepapers ($15)',  value: fmt(overview.whitepaper_revenue|| 0),  color: '#FF9500' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0A0A0F' }}>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{r.label}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>Recent Launches</div>
                {(overview.recent_tokens || []).map((t: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0A0A0F' }}>
                    <div>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{t.name}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', marginLeft: 6 }}>${t.ticker}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge label={t.chain} color={t.chain === 'bsc' ? '#F3BA2F' : '#9945FF'} />
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{new Date(t.launched_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {!overview.recent_tokens?.length && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>No tokens yet</div>}
              </div>
            </div>
            <RevenueChart data={chart} />
          </div>
        )}

        {/* Users */}
        {tab === 'users' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{users.length} Users</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 0.8fr 1fr 1fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Wallet', 'Telegram', 'Tokens', 'TG', 'Spent', 'Joined'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {users.map((u, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 0.8fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{shortAddr(u.wallet_address)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: u.telegram_username ? '#27AEE6' : '#374151' }}>{u.telegram_username ? `@${u.telegram_username}` : '—'}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: u.token_count > 0 ? '#00FF88' : '#374151' }}>{u.token_count || 0}</span>
                <span>{u.telegram_id ? <Badge label="yes" color="#00FF88" /> : <Badge label="no" color="#374151" />}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 700 }}>{fmt(u.total_spent || 0)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {!users.length && <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>No users yet</div>}
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{payments.length} Payments</span>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 700 }}>Confirmed: {fmt(payments.filter(p => p.status === 'confirmed').reduce((s: number, p: any) => s + (p.usd_amount || 0), 0))}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1.5fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Type', 'Amount', 'Crypto', 'Chain', 'Status', 'Date'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {payments.map((p, i) => {
              const lbl = p.plan_id === 'deploy_fee_bsc' ? 'BSC Deploy' : p.plan_id === 'deploy_fee_sol' ? 'SOL Deploy' : p.plan_id?.startsWith('volbot') ? `Vol Bot (${p.plan_id.split('_')[1]})` : p.plan_id === 'audit_scan' ? 'Audit Scan' : p.plan_id === 'whitepaper' ? 'Whitepaper' : p.plan_id || 'Unknown'
              const col = p.plan_id?.includes('bsc') ? '#F3BA2F' : p.plan_id?.includes('sol') ? '#9945FF' : p.plan_id?.includes('volbot') ? '#8B5CF6' : p.plan_id === 'audit_scan' ? '#3B82F6' : p.plan_id === 'whitepaper' ? '#FF9500' : '#6B7280'
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1.5fr', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
                  <Badge label={lbl} color={col} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88' }}>${p.usd_amount}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{p.crypto_amount ? `${parseFloat(p.crypto_amount).toFixed(4)} ${p.token}` : '—'}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const }}>{p.chain}</span>
                  <Badge label={p.status} color={p.status === 'confirmed' ? '#00FF88' : p.status === 'pending' ? '#FF9500' : '#6B7280'} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{new Date(p.created_at).toLocaleString()}</span>
                </div>
              )
            })}
            {!payments.length && <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>No payments yet</div>}
          </div>
        )}

        {/* Tokens */}
        {tab === 'tokens' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{tokens.length} Tokens</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Name', 'Ticker', 'Chain', 'Contract', 'Owner', 'MCap', 'Launched'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {tokens.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 1.5fr 1fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{t.token_drafts?.name || '—'}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 700 }}>${t.token_drafts?.ticker || '—'}</span>
                <Badge label={t.chain} color={t.chain === 'bsc' ? '#F3BA2F' : '#9945FF'} />
                <a href={t.chain === 'bsc' ? `https://bscscan.com/token/${t.contract_address}` : `https://solscan.io/token/${t.contract_address}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textDecoration: 'none' }}>{shortAddr(t.contract_address)}</a>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{shortAddr(t.users?.wallet_address)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: t.market_cap_usd > 0 ? '#F9FAFB' : '#374151' }}>{t.market_cap_usd > 0 ? fmt(t.market_cap_usd) : '—'}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{t.launched_at ? new Date(t.launched_at).toLocaleDateString() : '—'}</span>
              </div>
            ))}
            {!tokens.length && <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>No tokens yet</div>}
          </div>
        )}

        {/* Broadcast */}
        {tab === 'broadcast' && (
          <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Broadcast Telegram Message</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Target</div>
                <select value={broadcastFilter} onChange={e => setBroadcastFilter(e.target.value)} style={inp}>
                  <option value="all">All users with TG linked</option>
                  <option value="launched">Users who launched tokens</option>
                  <option value="no_launch">Users with no launches</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Message (supports Markdown)</div>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="*Bold* _italic_ `code`" rows={5} style={{ ...inp, resize: 'vertical' as const }} />
              </div>
              {broadcastResult && <div style={{ padding: '10px 14px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', marginBottom: 12 }}>{broadcastResult}</div>}
              <button onClick={handleBroadcast} disabled={broadcasting || !broadcastMsg} style={{ width: '100%', padding: '10px', background: broadcasting || !broadcastMsg ? '#1E1E2E' : '#00FF88', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: broadcasting || !broadcastMsg ? '#374151' : '#0A0A0F', cursor: 'pointer' }}>
                {broadcasting ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
