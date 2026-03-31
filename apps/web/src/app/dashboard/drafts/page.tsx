'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconRocket, IconChevronRight, IconBSC, IconSolana, IconClock } from '@/components/ui/Icons'

interface Draft {
  id: string
  name: string
  ticker: string
  chain: string
  logo_url: string | null
  status: 'draft' | 'confirmed' | 'deploying' | 'live' | 'failed'
  total_supply: string
  tax_buy: number
  tax_sell: number
  lp_lock: boolean
  renounce: boolean
  created_at: string
  narrative_id: string | null
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

function StatusBadge({ status }: { status: Draft['status'] }) {
  const config = {
    draft:     { color: '#6B7280', bg: 'rgba(107,114,128,0.1)',  label: 'DRAFT'     },
    confirmed: { color: '#00FF88', bg: 'rgba(0,255,136,0.1)',   label: 'CONFIRMED' },
    deploying: { color: '#FF9500', bg: 'rgba(255,149,0,0.1)',   label: 'DEPLOYING' },
    live:      { color: '#00FF88', bg: 'rgba(0,255,136,0.1)',   label: 'LIVE'      },
    failed:    { color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)',   label: 'FAILED'    },
  }[status] || { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: status.toUpperCase() }

  return (
    <span style={{
      padding: '2px 8px',
      background: config.bg,
      border: `1px solid ${config.color}40`,
      borderRadius: 4,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10, fontWeight: 700,
      color: config.color,
      letterSpacing: '0.06em',
    }}>
      {config.label}
    </span>
  )
}

function DraftRow({ draft, onDeploy, onContinue }: {
  draft: Draft
  onDeploy: (draft: Draft) => void
  onContinue: (draft: Draft) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 80px 80px 100px 160px',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: hovered ? '#12121C' : 'transparent',
        borderBottom: '1px solid #1E1E2E',
        transition: 'background 0.15s',
      }}
    >
      {/* Logo */}
      <TokenLogo url={draft.logo_url} name={draft.name} size={40} />

      {/* Name + ticker */}
      <div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800,
          color: '#F9FAFB', letterSpacing: '-0.3px',
        }}>
          {draft.name}
        </div>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          color: '#00FF88', fontWeight: 600, marginTop: 2,
        }}>
          ${draft.ticker}
        </div>
      </div>

      {/* Chain */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {draft.chain === 'bsc'
          ? <IconBSC size={16} />
          : <IconSolana size={16} />
        }
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
          color: draft.chain === 'bsc' ? '#F3BA2F' : '#9945FF',
        }}>
          {draft.chain.toUpperCase()}
        </span>
      </div>

      {/* Status */}
      <StatusBadge status={draft.status} />

      {/* Time */}
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <IconClock size={11} color="#374151" />
        {timeAgo(draft.created_at)}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {draft.status !== 'live' && (
          <button
            onClick={() => onDeploy(draft)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px',
              background: '#00FF88', color: '#0A0A0F',
              border: 'none', borderRadius: 5,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.3)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <IconRocket size={11} color="#0A0A0F" />
            Deploy
          </button>
        )}
        <button
          onClick={() => onContinue(draft)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 12px',
            background: 'transparent', color: '#9CA3AF',
            border: '1px solid #1E1E2E', borderRadius: 5,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2A2A3E'
            e.currentTarget.style.color = '#F9FAFB'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1E1E2E'
            e.currentTarget.style.color = '#9CA3AF'
          }}
        >
          {draft.status === 'live' ? 'View' : 'Edit'}
          <IconChevronRight size={11} color="currentColor" />
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  const router = useRouter()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 20px', gap: 12,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: '#0E0E16', border: '1px solid #1E1E2E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconRocket size={22} color="#1E1E2E" />
      </div>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>
        No drafts yet
      </p>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#1E1E2E' }}>
        Launch a token from the narrative feed to get started
      </span>
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          marginTop: 8, padding: '8px 18px',
          background: '#00FF88', color: '#0A0A0F',
          border: 'none', borderRadius: 6,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Go to Feed
      </button>
    </div>
  )
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch all drafts — in production this would be wallet-gated
    // For now fetches all drafts for testing
    api.get('/api/tokens/drafts')
      .then((res) => {
        if (res.data.success) setDrafts(res.data.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleDeploy(draft: Draft) {
    router.push(`/launch/checklist?draft=${draft.id}&chain=${draft.chain}`)
  }

  function handleContinue(draft: Draft) {
    if (draft.status === 'live') {
      router.push(`/dashboard/tokens`)
    } else {
      router.push(`/launch?draft=${draft.id}`)
    }
  }

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Token Drafts</h1>
          <p className="page-subtitle">
            Saved token identities ready to deploy
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: '#00FF88', color: '#0A0A0F',
            border: 'none', borderRadius: 6,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <IconRocket size={13} color="#0A0A0F" />
          New Token
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: '#0E0E16', border: '1px solid #1E1E2E',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 80px 80px 100px 160px',
          gap: 16,
          padding: '10px 20px',
          borderBottom: '1px solid #1E1E2E',
        }}>
          {['', 'TOKEN', 'CHAIN', 'STATUS', 'CREATED', 'ACTIONS'].map((h) => (
            <span key={h} style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9, fontWeight: 600, color: '#4B5563',
              letterSpacing: '0.1em',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 68, background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
                borderRadius: 8, marginBottom: 8,
              }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '24px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
            Failed to load drafts — {error}
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState />
        ) : (
          drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              onDeploy={handleDeploy}
              onContinue={handleContinue}
            />
          ))
        )}
      </div>
    </div>
  )
}
