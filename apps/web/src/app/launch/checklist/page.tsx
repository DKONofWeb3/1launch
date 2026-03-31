'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconRocket, IconChevronRight, IconSignal } from '@/components/ui/Icons'

// ── Checklist config ──────────────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  description: string
  required: boolean
  category: string
}

const CHECKLIST: CheckItem[] = [
  // Social Setup
  { id: 'tg_created',      label: 'Telegram group created',         description: 'Your token community group is live and link is ready',          required: true,  category: 'Social Setup' },
  { id: 'tg_bio_set',      label: 'Telegram bio + pinned message',  description: 'Copy from the Socials tab and paste into your group',           required: true,  category: 'Social Setup' },
  { id: 'twitter_created', label: 'Twitter/X account created',      description: 'Handle secured, bio set, banner uploaded',                      required: false, category: 'Social Setup' },

  // Content Ready
  { id: 'announcement',    label: 'Launch announcement written',    description: 'First tweet and Telegram post ready to go',                     required: true,  category: 'Content Ready' },
  { id: 'memes_ready',     label: 'At least 3 memes prepared',      description: 'Use the Meme Kit or prepare your own — memes drive early volume', required: true,  category: 'Content Ready' },
  { id: 'website_ready',   label: 'Website or link-in-bio ready',   description: 'A basic landing page or Linktree with token info',              required: false, category: 'Content Ready' },

  // Technical
  { id: 'tokenomics_ok',   label: 'Tokenomics reviewed',            description: 'Supply, taxes, and allocation look clean',                      required: true,  category: 'Technical' },
  { id: 'wallet_funded',   label: 'Wallet funded for gas + fees',   description: 'BSC: at least 0.1 BNB · Solana: at least 0.1 SOL',             required: true,  category: 'Technical' },
  { id: 'liquidity_ready', label: 'Initial liquidity planned',      description: 'Know how much you\'re adding to the DEX pool at launch',        required: true,  category: 'Technical' },
  { id: 'contract_ok',     label: 'Contract settings confirmed',     description: 'Tax, supply, LP lock settings reviewed and finalized',          required: true,  category: 'Technical' },
]

const CATEGORIES = ['Social Setup', 'Content Ready', 'Technical']

// ── Components ────────────────────────────────────────────────────────────────

function CheckRow({
  item,
  checked,
  onToggle,
}: {
  item: CheckItem
  checked: boolean
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        background: checked ? 'rgba(0,255,136,0.04)' : hovered ? '#0A0A0F' : 'transparent',
        border: `1px solid ${checked ? 'rgba(0,255,136,0.15)' : hovered ? '#2A2A3E' : '#1E1E2E'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 6,
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 5,
        border: `1.5px solid ${checked ? '#00FF88' : '#2A2A3E'}`,
        background: checked ? '#00FF88' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
        transition: 'all 0.15s',
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#0A0A0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13,
            fontWeight: 600,
            color: checked ? '#00FF88' : '#F9FAFB',
            textDecoration: checked ? 'line-through' : 'none',
            transition: 'all 0.15s',
          }}>
            {item.label}
          </span>
          {!item.required && (
            <span style={{
              padding: '1px 6px',
              background: 'rgba(107,114,128,0.1)',
              border: '1px solid #1E1E2E',
              borderRadius: 3,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 9,
              color: '#6B7280',
              letterSpacing: '0.06em',
            }}>
              OPTIONAL
            </span>
          )}
        </div>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: checked ? '#4B5563' : '#6B7280',
          lineHeight: 1.5,
        }}>
          {item.description}
        </span>
      </div>
    </div>
  )
}

function ProgressBar({ total, done, required, requiredDone }: {
  total: number; done: number; required: number; requiredDone: number
}) {
  const pct = Math.round((done / total) * 100)
  const allRequired = requiredDone >= required

  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>
          Launch Readiness
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 12,
          fontWeight: 700,
          color: allRequired ? '#00FF88' : '#FF9500',
        }}>
          {pct}%
        </span>
      </div>

      {/* Bar */}
      <div style={{ height: 6, background: '#1E1E2E', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: allRequired ? '#00FF88' : '#FF9500',
          borderRadius: 3,
          transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: allRequired ? '0 0 8px rgba(0,255,136,0.4)' : 'none',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280' }}>
          {done}/{total} complete
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: allRequired ? '#00FF88' : '#FF9500' }}>
          {allRequired ? '✓ Required items done' : `${required - requiredDone} required item${required - requiredDone !== 1 ? 's' : ''} remaining`}
        </span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ChecklistContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const draftId = searchParams.get('draft')
  const chain = searchParams.get('chain') || 'bsc'

  const [draft, setDraft] = useState<any>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!draftId) return
    api.get(`/api/tokens/draft/${draftId}`)
      .then(res => {
        if (res.data.success) {
          setDraft(res.data.data)
          // Restore saved checklist state if exists
          if (res.data.data.checklist) {
            setChecked(res.data.data.checklist)
          }
        }
      })
      .finally(() => setLoading(false))
  }, [draftId])

  function toggle(id: string) {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const requiredItems = CHECKLIST.filter(i => i.required)
  const checkedCount = Object.values(checked).filter(Boolean).length
  const requiredDone = requiredItems.filter(i => checked[i.id]).length
  const allRequiredDone = requiredDone >= requiredItems.length

  async function handleProceed() {
    setSaving(true)
    try {
      // Save checklist state to draft
      await api.post('/api/tokens/save-checklist', {
        draft_id: draftId,
        checklist: checked,
      })
      router.push(`/deploy?draft=${draftId}&chain=${chain}`)
    } catch {
      // Even if save fails, proceed to deploy
      router.push(`/deploy?draft=${draftId}&chain=${chain}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800,
          color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 6,
        }}>
          Pre-Launch Checklist
        </h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
          Complete required items before deploying
        </p>
      </div>

      {/* Token pill */}
      {draft && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', marginBottom: 24,
          background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10,
        }}>
          <TokenLogo url={draft.logo_url} name={draft.name} size={40} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#F9FAFB' }}>
              {draft.name}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
              ${draft.ticker} · {chain.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <ProgressBar
        total={CHECKLIST.length}
        done={checkedCount}
        required={requiredItems.length}
        requiredDone={requiredDone}
      />

      {/* Checklist by category */}
      {CATEGORIES.map(category => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10, fontWeight: 600,
            color: '#4B5563', letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid #1E1E2E',
          }}>
            {category}
          </div>
          {CHECKLIST.filter(item => item.category === category).map(item => (
            <CheckRow
              key={item.id}
              item={item}
              checked={!!checked[item.id]}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      ))}

      {/* Warning if not all required done */}
      {!allRequiredDone && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'rgba(255,149,0,0.06)',
          border: '1px solid rgba(255,149,0,0.2)',
          borderRadius: 8,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500',
        }}>
          Complete all required items to unlock deployment.
          {requiredDone > 0 && ` ${requiredDone}/${requiredItems.length} done.`}
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 18px', background: 'transparent',
            color: '#9CA3AF', border: '1px solid #1E1E2E', borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, cursor: 'pointer',
          }}
        >
          Back
        </button>

        <button
          onClick={handleProceed}
          disabled={!allRequiredDone || saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '11px 22px',
            background: allRequiredDone ? '#00FF88' : '#1E1E2E',
            color: allRequiredDone ? '#0A0A0F' : '#4B5563',
            border: 'none', borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13, fontWeight: 700,
            cursor: allRequiredDone ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            boxShadow: allRequiredDone ? '0 4px 20px rgba(0,255,136,0.2)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (allRequiredDone) e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
          }}
        >
          <IconRocket size={14} color={allRequiredDone ? '#0A0A0F' : '#4B5563'} />
          {saving ? 'Saving...' : allRequiredDone ? 'Proceed to Deploy' : 'Complete Required Items'}
          {allRequiredDone && <IconChevronRight size={14} color="#0A0A0F" />}
        </button>
      </div>
    </div>
  )
}

export default function ChecklistPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F' }}>
      <div style={{
        borderBottom: '1px solid #1E1E2E', padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,15,0.9)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>
          1launch
        </span>
      </div>

      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
        </div>
      }>
        <ChecklistContent />
      </Suspense>
    </div>
  )
}
