// apps/web/src/components/dashboard/TokenCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconBSC, IconSolana } from '@/components/ui/Icons'

interface TokenCardProps {
  token: any
}

function fmt(n: number): string {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(4)}`
}

export function TokenCard({ token }: TokenCardProps) {
  const router  = useRouter()
  const draft   = token.token_drafts
  const market  = token.market_data
  const isLive  = !!market?.price_usd
  const isBoosted = token.volume_bot_tier && token.volume_bot_tier !== 'none'

  function goToToken(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/dashboard/tokens/${token.id}`)
  }

  function goToBoost(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/dashboard/tokens/${token.id}`)
  }

  return (
    <div
      onClick={goToToken}
      style={{
        background: '#0E0E16',
        border: '1px solid #1E1E2E',
        borderRadius: 12, padding: '18px 20px',
        cursor: 'pointer', transition: 'border-color 0.2s',
        animation: 'cardIn 0.4s ease both',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#2A2A3E')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <TokenLogo url={draft?.logo_url} name={draft?.name || '?'} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB' }}>
              {draft?.name || 'Unknown'}
            </span>
            {token.chain === 'bsc' ? <IconBSC size={15} /> : <IconSolana size={15} />}
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#00FF88', fontWeight: 600 }}>
            ${draft?.ticker || '???'}
          </span>
        </div>
        {isBoosted && (
          <span style={{
            padding: '2px 8px',
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 4,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700,
            color: '#00FF88', letterSpacing: '0.08em',
          }}>
            BOOSTED
          </span>
        )}
      </div>

      {/* Market data */}
      {isLive ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'PRICE',   value: fmt(market.price_usd) },
            { label: 'MCAP',    value: fmt(market.market_cap_usd) },
            { label: 'VOL 24H', value: fmt(market.volume_24h) },
            { label: '24H',     value: market.price_change_24h != null
              ? `${market.price_change_24h >= 0 ? '+' : ''}${market.price_change_24h.toFixed(2)}%`
              : '--'
            },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 10px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', marginBottom: 2 }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
                color: label === '24H'
                  ? (market.price_change_24h >= 0 ? '#00FF88' : '#FF3B3B')
                  : '#F9FAFB',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '10px 12px', marginBottom: 14,
          background: 'rgba(255,149,0,0.04)',
          border: '1px solid rgba(255,149,0,0.12)',
          borderRadius: 6,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280',
        }}>
          No DEX pair yet — add liquidity to see live data
        </div>
      )}

      {/* Contract */}
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color: '#2A2A3E', wordBreak: 'break-all',
        marginBottom: 14,
      }}>
        {token.contract_address}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={goToToken}
          style={{
            flex: 1, padding: '8px 0',
            background: 'transparent', border: '1px solid #1E1E2E',
            borderRadius: 7, cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.color = '#F9FAFB' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.color = '#6B7280' }}
        >
          View
        </button>

        {!isBoosted && (
          <button
            onClick={goToBoost}
            style={{
              flex: 1, padding: '8px 0',
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 7, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
              color: '#00FF88',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.06)' }}
          >
            Boost
          </button>
        )}
      </div>
    </div>
  )
}
