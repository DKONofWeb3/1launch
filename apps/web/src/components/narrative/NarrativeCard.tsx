'use client'

import { useState } from 'react'
import { HypeMeter } from '@/components/ui/HypeMeter'
import { SourceIcon, IconClock, IconRocket, IconChevronRight, IconTrendingUp } from '@/components/ui/Icons'
import type { Narrative } from '@/hooks/useNarratives'

interface NarrativeCardProps {
  narrative: Narrative
  index: number
  onLaunch: (narrative: Narrative) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#FF3B3B'
  if (score >= 60) return '#FF9500'
  if (score >= 40) return '#00FF88'
  return '#4B5563'
}

const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  google_trends: 'Google Trends',
  tiktok: 'TikTok',
  dexscreener: 'DexScreener',
  coingecko: 'CoinGecko',
}

export function NarrativeCard({ narrative, index, onLaunch }: NarrativeCardProps) {
  const [hovered, setHovered] = useState(false)
  const scoreColor = getScoreColor(narrative.hype_score)
  const isHot = narrative.hype_score >= 60

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: hovered ? '#12121C' : '#0E0E16',
        border: `1px solid ${hovered ? scoreColor + '50' : '#1E1E2E'}`,
        borderRadius: 12,
        padding: '18px 20px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? `0 0 28px ${scoreColor}12` : 'none',
        animation: `cardIn 0.4s cubic-bezier(0.4,0,0.2,1) ${index * 80}ms both`,
        cursor: 'default',
      }}
    >
      {/* Hot top border glow */}
      {isHot && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${scoreColor}80, transparent)`,
        }} />
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Hype meter */}
        <HypeMeter score={narrative.hype_score} size={72} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title + sources */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <h3 style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
              fontWeight: 700,
              color: hovered ? scoreColor : '#F9FAFB',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
              transition: 'color 0.2s',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {narrative.title}
            </h3>

            {/* Source badges */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {narrative.sources.map((source) => (
                <div
                  key={source}
                  title={SOURCE_LABELS[source] || source}
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid #1E1E2E',
                    borderRadius: 5,
                    color: '#6B7280',
                    flexShrink: 0,
                  }}
                >
                  <SourceIcon source={source} size={14} />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: '#9CA3AF',
            lineHeight: 1.65,
            marginBottom: 12,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
          }}>
            {narrative.summary || 'Narrative detected across multiple crypto sources.'}
          </p>

          {/* Ticker chips */}
          {narrative.suggested_tickers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {narrative.suggested_tickers.slice(0, 5).map((ticker) => (
                <span
                  key={ticker}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 8px',
                    background: 'rgba(0,255,136,0.07)',
                    border: '1px solid rgba(0,255,136,0.18)',
                    borderRadius: 4,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#00FF88',
                    letterSpacing: '0.05em',
                  }}
                >
                  ${ticker}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                <IconClock size={12} color="#6B7280" />
                {narrative.estimated_window}
              </span>
              {narrative.tokens_launched > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
                  <IconTrendingUp size={12} color="#6B7280" />
                  {narrative.tokens_launched} launched
                </span>
              )}
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>
                {timeAgo(narrative.created_at)}
              </span>
            </div>

            {/* Launch button */}
            <button
              onClick={() => onLaunch(narrative)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 13px',
                background: '#00FF88',
                color: '#0A0A0F',
                border: 'none',
                borderRadius: 6,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,255,136,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <IconRocket size={13} color="#0A0A0F" />
              Launch
              <IconChevronRight size={13} color="#0A0A0F" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
