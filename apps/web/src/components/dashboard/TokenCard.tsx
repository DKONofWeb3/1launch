'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconBSC, IconSolana, IconTrendingUp, IconPulse, IconSignal, IconRocket } from '@/components/ui/Icons'

interface TokenCardProps {
  token: any
}

function formatNumber(n: number): string {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(4)}`
}

function PriceChange({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
      color: positive ? '#00FF88' : '#FF3B3B',
    }}>
      {positive ? '+' : ''}{value?.toFixed(2)}%
    </span>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    low:      { color: '#00FF88', bg: 'rgba(0,255,136,0.1)' },
    medium:   { color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
    high:     { color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)' },
    critical: { color: '#FF3B3B', bg: 'rgba(255,59,59,0.15)' },
    unknown:  { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  }
  const c = config[risk] || config.unknown
  return (
    <span style={{
      padding: '2px 7px',
      background: c.bg,
      border: `1px solid ${c.color}40`,
      borderRadius: 4,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 9, fontWeight: 700,
      color: c.color, letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    }}>
      {risk} risk
    </span>
  )
}

export function TokenCard({ token }: TokenCardProps) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)
  const draft = token.token_drafts
  const market = token.market_data
  const isLive = !!market?.price_usd

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/dashboard/tokens/${token.id}`)}
      style={{
        background: hovered ? '#12121C' : '#0E0E16',
        border: `1px solid ${hovered ? '#2A2A3E' : '#1E1E2E'}`,
        borderRadius: 12, padding: '18px 20px',
        cursor: 'pointer', transition: 'all 0.2s',
        animation: 'cardIn 0.4s ease both',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <TokenLogo url={draft?.logo_url} name={draft?.name || '?'} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB' }}>
              {draft?.name || 'Unknown'}
            </span>
            {token.chain === 'bsc' ? <IconBSC size={16} /> : <IconSolana size={16} />}
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', fontWeight: 600 }}>
            ${draft?.ticker || '???'}
          </span>
        </div>

        {/* Audit badge */}
        {token.audit_scan_done && token.audit_risk && (
          <RiskBadge risk={token.audit_risk} />
        )}
      </div>

      {/* Market data */}
      {isLive ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'PRICE',   value: formatNumber(market.price_usd) },
            { label: 'MCAP',    value: formatNumber(market.market_cap_usd) },
            { label: 'VOL 24H', value: formatNumber(market.volume_24h) },
            { label: '24H',     value: <PriceChange value={market.price_change_24h} /> },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '8px 10px',
              background: '#0A0A0F',
              border: '1px solid #1E1E2E',
              borderRadius: 6,
            }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '10px 12px', marginBottom: 14,
          background: 'rgba(255,149,0,0.05)',
          border: '1px solid rgba(255,149,0,0.15)',
          borderRadius: 6,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500',
        }}>
          No DEX pair yet — add liquidity to see live data
        </div>
      )}

      {/* Contract address */}
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color: '#374151', wordBreak: 'break-all' as const,
        marginBottom: 14,
      }}>
        {token.contract_address}
      </div>

      {/* Add-on status row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
        <AddOnChip active={token.audit_scan_done} label="Audited" />
        <AddOnChip active={token.tg_setup_done} label="TG Setup" />
        <AddOnChip active={token.volume_bot_tier !== 'none'} label={`Vol Bot${token.volume_bot_tier !== 'none' ? ` (${token.volume_bot_tier})` : ''}`} />
      </div>
    </div>
  )
}

function AddOnChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      padding: '3px 8px',
      background: active ? 'rgba(0,255,136,0.08)' : '#0A0A0F',
      border: `1px solid ${active ? 'rgba(0,255,136,0.2)' : '#1E1E2E'}`,
      borderRadius: 4,
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 500,
      color: active ? '#00FF88' : '#374151',
    }}>
      {active ? '✓ ' : ''}{label}
    </span>
  )
}
