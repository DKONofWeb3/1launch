// apps/web/src/app/admin/page.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || ''

function adminHeaders() {
  return { 'x-admin-key': ADMIN_KEY }
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function shortAddr(addr: string) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function StatCard({ label, value, sub, color = '#F9FAFB' }: any) {
  return (
    <div style={{ padding: '16px 18px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 900, color, marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{sub}</div>}
    </div>
  )
}

function RevenueChart({ data }: { data: any[] }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
        Revenue — Last 30 Days
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              title={`${d.date}: $${d.revenue}`}
              style={{
                width: '100%',
                height: `${Math.max((d.revenue / max) * 80, d.revenue > 0 ? 4 : 1)}px`,
                background: d.revenue > 0 ? '#00FF88' : '#1E1E2E',
                borderRadius: 2,
                transition: 'height 0.3s ease',
                cursor: 'default',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{data[0]?.date?.slice(5)}</span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563' }}>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = { free: '#6B7280', builder: '#3B82F6', pro: '#00FF88', agency: '#FF9500' }
  const color = colors[plan] || '#6B7280'
  return (
    <span style={{ padding: '2px 8px', background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase' as const }}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { active: '#00FF88', confirmed: '#00FF88', pending: '#FF9500', expired: '#6B7280', cancelled: '#FF3B3B', running: '#00FF88', stopped: '#6B7280' }
  const color = colors[status] || '#6B7280'
  return (
    <span style={{ padding: '2px 8px', background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase' as const }}>
      {status}
    </span>
  )
}

type Tab = 'overview' | 'users' | 'payments' | 'tokens' | 'subscriptions' | 'bots' | 'broadcast'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<any>(null)
  const [chart, setChart] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastFilter, setBroadcastFilter] = useState('all')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [manualActivate, setManualActivate] = useState({ user_id: '', plan_id: 'builder', tx_hash: '' })
  const [activating, setActivating] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = { 'x-admin-key': keyInput }

  async function loadOverview() {
    const [ovRes, chartRes] = await Promise.all([
      api.get('/api/admin/overview', { headers }),
      api.get('/api/admin/revenue-chart', { headers }),
    ])
    if (ovRes.data.success) setOverview(ovRes.data.data)
    if (chartRes.data.success) setChart(chartRes.data.data)
  }

  async function loadTab(t: Tab) {
    setLoading(true)
    try {
      if (t === 'overview') await loadOverview()
      else if (t === 'users') {
        const r = await api.get('/api/admin/users', { headers })
        if (r.data.success) setUsers(r.data.data || [])
      } else if (t === 'payments') {
        const r = await api.get('/api/admin/payments', { headers })
        if (r.data.success) setPayments(r.data.data || [])
      } else if (t === 'tokens') {
        const r = await api.get('/api/admin/tokens', { headers })
        if (r.data.success) setTokens(r.data.data || [])
      } else if (t === 'subscriptions') {
        const r = await api.get('/api/admin/subscriptions?status=all', { headers })
        if (r.data.success) setSubscriptions(r.data.data || [])
      } else if (t === 'bots') {
        const r = await api.get('/api/admin/bots', { headers })
        if (r.data.success) setBots(r.data.data || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAuth() {
    try {
      const r = await api.get('/api/admin/overview', { headers: { 'x-admin-key': keyInput } })
      if (r.data.success) {
        setAuthed(true)
        setOverview(r.data.data)
        const c = await api.get('/api/admin/revenue-chart', { headers: { 'x-admin-key': keyInput } })
        if (c.data.success) setChart(c.data.data)
        setLoading(false)
      } else {
        setError('Invalid admin key')
      }
    } catch {
      setError('Invalid admin key')
    }
  }

  useEffect(() => {
    if (authed) loadTab(tab)
  }, [tab, authed])

  async function handleBroadcast() {
    if (!broadcastMsg) return
    setBroadcasting(true)
    try {
      const r = await api.post('/api/admin/broadcast', { message: broadcastMsg, plan_filter: broadcastFilter }, { headers })
      if (r.data.success) {
        setBroadcastResult(`Sent to ${r.data.sent} users`)
        setBroadcastMsg('')
      }
    } catch {}
    finally { setBroadcasting(false) }
  }

  async function handleManualActivate() {
    if (!manualActivate.user_id || !manualActivate.plan_id) return
    setActivating(true)
    try {
      const r = await api.post('/api/admin/subscriptions/manual-activate', manualActivate, { headers })
      if (r.data.success) alert(r.data.message)
      else alert(r.data.error)
    } catch {}
    finally { setActivating(false) }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',      label: 'Overview'      },
    { id: 'users',         label: 'Users'         },
    { id: 'payments',      label: 'Payments'      },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'tokens',        label: 'Tokens'        },
    { id: 'bots',          label: 'Bots'          },
    { id: 'broadcast',     label: 'Broadcast'     },
  ]

  const inputStyle = { width: '100%', padding: '9px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB', outline: 'none' }
  const btnStyle = (color = '#00FF88') => ({ padding: '9px 18px', background: color, color: color === '#00FF88' ? '#0A0A0F' : '#F9FAFB', border: 'none', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' })

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '32px', width: 360 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#F9FAFB', marginBottom: 4 }}>Admin Panel</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 24 }}>1launch internal dashboard</div>
        <input
          type="password" placeholder="Admin key"
          value={keyInput} onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        {error && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 12 }}>{error}</div>}
        <button onClick={handleAuth} style={{ ...btnStyle(), width: '100%' }}>Enter</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB', marginBottom: 2 }}>Admin Panel</h1>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>1launch platform management</div>
          </div>
          <button onClick={() => loadTab(tab)} style={{ ...btnStyle('transparent' as any), border: '1px solid #1E1E2E', color: '#6B7280' }}>Refresh</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' as const }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 14px',
                background: tab === t.id ? 'rgba(0,255,136,0.1)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
                borderRadius: 6, cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
                color: tab === t.id ? '#00FF88' : '#6B7280',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && tab !== 'overview' && (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>
        )}

        {/* Overview */}
        {tab === 'overview' && overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <StatCard label="MRR"             value={fmt(overview.mrr)}             sub="active subscriptions"  color="#00FF88" />
              <StatCard label="Revenue This Mo" value={fmt(overview.revenue_month)}   sub="confirmed payments"    color="#00FF88" />
              <StatCard label="Total Users"     value={overview.total_users}          sub="registered wallets" />
              <StatCard label="Total Tokens"    value={overview.total_tokens}         sub="deployed on-chain" />
              <StatCard label="Active Subs"     value={overview.active_subs}          sub="paying customers"      color="#3B82F6" />
              <StatCard label="New Subs"        value={overview.new_subs_month}       sub="this month"            color="#3B82F6" />
              <StatCard label="Active Bots"     value={overview.active_bots}          sub="running sessions"      color="#8B5CF6" />
              <StatCard label="KOL Revenue"     value={fmt(overview.kol_revenue_month)} sub="15% commission"      color="#FF9500" />
            </div>

            {/* Plan breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>Active Subscriptions by Plan</div>
                {Object.entries(overview.plan_breakdown || {}).map(([plan, count]: any) => (
                  <div key={plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0A0A0F' }}>
                    <PlanBadge plan={plan} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{count}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
                     {fmt((count as number) * (({ free: 0, builder: 49, pro: 149, agency: 499 } as Record<string, number>)[plan as string] || 0))}/mo                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>New Subscriptions This Month</div>
                {Object.entries(overview.new_subs_breakdown || {}).length > 0
                  ? Object.entries(overview.new_subs_breakdown || {}).map(([plan, count]: any) => (
                    <div key={plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0A0A0F' }}>
                      <PlanBadge plan={plan} />
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{count}</span>
                    </div>
                  ))
                  : <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#374151' }}>No new subscriptions yet</div>
                }
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Wallet', 'Plan', 'Tokens', 'Joined'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {users.map((u, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{shortAddr(u.wallet_address)}</span>
                <PlanBadge plan={u.subscriptions?.[0]?.plan_id || 'free'} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{u.launched_tokens?.[0]?.count || 0}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{payments.length} Payments</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Plan', 'Amount', 'Token', 'Chain', 'Status', 'Date'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {payments.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <PlanBadge plan={p.plan_id} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 700 }}>${p.usd_amount}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{p.token}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const }}>{p.chain}</span>
                <StatusBadge status={p.status} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Subscriptions */}
        {tab === 'subscriptions' && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Manual activate */}
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
                Manual Activation (Support)
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                <input placeholder="User ID (uuid)" value={manualActivate.user_id} onChange={e => setManualActivate(p => ({ ...p, user_id: e.target.value }))} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
                <select value={manualActivate.plan_id} onChange={e => setManualActivate(p => ({ ...p, plan_id: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 120 }}>
                  {['builder', 'pro', 'agency'].map(pl => <option key={pl} value={pl}>{pl}</option>)}
                </select>
                <input placeholder="TX hash (optional)" value={manualActivate.tx_hash} onChange={e => setManualActivate(p => ({ ...p, tx_hash: e.target.value }))} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
                <button onClick={handleManualActivate} disabled={activating} style={btnStyle()}>
                  {activating ? 'Activating...' : 'Activate'}
                </button>
              </div>
            </div>

            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{subscriptions.length} Subscriptions</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
                {['Wallet', 'Plan', 'Status', 'Started', 'Expires'].map(h => (
                  <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
                ))}
              </div>
              {subscriptions.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{shortAddr(s.users?.wallet_address)}</span>
                  <PlanBadge plan={s.plan_id} />
                  <StatusBadge status={s.status} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: s.expires_at && new Date(s.expires_at) < new Date() ? '#FF3B3B' : '#4B5563' }}>
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tokens */}
        {tab === 'tokens' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{tokens.length} Tokens Launched</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr', gap: 8, padding: '10px 20px', background: '#0A0A0F', borderBottom: '1px solid #1E1E2E' }}>
              {['Name', 'Ticker', 'Chain', 'Contract', 'Launched'].map(h => (
                <span key={h} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{h}</span>
              ))}
            </div>
            {tokens.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr', gap: 8, padding: '10px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{t.token_drafts?.name}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 700 }}>${t.token_drafts?.ticker}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const }}>{t.chain}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{shortAddr(t.contract_address)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{t.launched_at ? new Date(t.launched_at).toLocaleDateString() : '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bots */}
        {tab === 'bots' && !loading && (
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #1E1E2E' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>
                {bots.length} Bot Sessions · {bots.filter(b => b.status === 'running').length} Active
              </span>
            </div>
            {bots.map((b, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 8, padding: '12px 20px', borderBottom: '1px solid #0A0A0F', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{b.launched_tokens?.token_drafts?.name || 'Unknown'}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>${b.launched_tokens?.token_drafts?.ticker}</div>
                </div>
                <PlanBadge plan={b.tier} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', textTransform: 'uppercase' as const }}>{b.chain}</span>
                <StatusBadge status={b.status} />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88' }}>${(b.stats?.volumeUSD || 0).toFixed(0)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{b.stats?.cycles || 0} cycles</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{b.started_at ? new Date(b.started_at).toLocaleDateString() : '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Broadcast */}
        {tab === 'broadcast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
                Broadcast Telegram Message
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Target</div>
                <select value={broadcastFilter} onChange={e => setBroadcastFilter(e.target.value)} style={{ ...inputStyle }}>
                  <option value="all">All users with TG linked</option>
                  <option value="free">Free plan only</option>
                  <option value="builder">Builder plan only</option>
                  <option value="pro">Pro plan only</option>
                  <option value="agency">Agency plan only</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 6 }}>Message (supports Markdown)</div>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="*Bold* _italic_ `code`"
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
              {broadcastResult && (
                <div style={{ padding: '10px 14px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', marginBottom: 12 }}>
                  {broadcastResult}
                </div>
              )}
              <button onClick={handleBroadcast} disabled={broadcasting || !broadcastMsg} style={{ ...btnStyle(), width: '100%' }}>
                {broadcasting ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}