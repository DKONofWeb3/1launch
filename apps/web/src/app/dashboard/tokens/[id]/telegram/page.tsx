'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface SetupStep {
  step: number
  title: string
  instructions: string[]
  copyValue: string
  copyLabel: string
}

interface TelegramSetup {
  groupName: string
  groupBio: string
  pinnedMessage: string
  steps: SetupStep[]
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px',
        background: copied ? 'rgba(0,255,136,0.1)' : 'transparent',
        border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
        borderRadius: 6,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11, fontWeight: 600,
        color: copied ? '#00FF88' : '#6B7280',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#00FF88" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="4" y="4" width="7" height="7" rx="1" stroke="#6B7280" strokeWidth="1.2"/>
            <path d="M1 8V2a1 1 0 0 1 1-1h6" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

function StepCard({ step, isLast }: { step: SetupStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(step.step === 1)

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Step number + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(0,255,136,0.1)',
          border: '1.5px solid rgba(0,255,136,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88',
          flexShrink: 0,
        }}>
          {step.step}
        </div>
        {!isLast && (
          <div style={{ width: 1, flex: 1, background: '#1E1E2E', marginTop: 4, marginBottom: 4, minHeight: 20 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 10px 0', marginBottom: expanded ? 12 : 0,
          }}
        >
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
            color: '#F9FAFB',
          }}>
            {step.title}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
          >
            <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {expanded && (
          <div>
            {/* Instructions */}
            <ol style={{ paddingLeft: 0, margin: '0 0 14px 0', listStyle: 'none' }}>
              {step.instructions.map((inst, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '6px 0',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF',
                  lineHeight: 1.5,
                  borderBottom: i < step.instructions.length - 1 ? '1px solid #0A0A0F' : 'none',
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#1E1E2E',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: '#6B7280',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  {inst}
                </li>
              ))}
            </ol>

            {/* Copy content box */}
            <div style={{
              background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px',
                borderBottom: '1px solid #1E1E2E',
                background: '#0E0E16',
              }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.08em' }}>
                  COPY THIS
                </span>
                <CopyButton value={step.copyValue} label={step.copyLabel} />
              </div>
              <pre style={{
                margin: 0, padding: '12px',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word' as const,
                maxHeight: 160, overflowY: 'auto' as const,
              }}>
                {step.copyValue}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TelegramSetupPage() {
  const params = useParams()
  const router = useRouter()
  const [setup, setSetup] = useState<TelegramSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [tgLink, setTgLink] = useState('')
  const [marking, setMarking] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get(`/api/telegram/setup/${params.id}`)
      .then(res => { if (res.data.success) setSetup(res.data.data) })
      .finally(() => setLoading(false))
  }, [params.id])

  async function markComplete() {
    setMarking(true)
    try {
      await api.post(`/api/telegram/setup/${params.id}/complete`, { tg_link: tgLink })
      setDone(true)
    } catch {}
    finally { setMarking(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading setup guide...</span>
    </div>
  )

  if (!setup) return null

  return (
    <div className="dashboard-layout">
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to token
      </button>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Telegram Setup</h1>
          <p className="page-subtitle">5 steps to get your community live in under 2 minutes</p>
        </div>
        <a
          href="https://t.me/MissRose_bot"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'rgba(39,174,230,0.1)',
            border: '1px solid rgba(39,174,230,0.2)',
            borderRadius: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
            color: '#27AEE6', textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="#27AEE6" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#27AEE6" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Get @Rose Bot
        </a>
      </div>

      {done ? (
        <div style={{
          padding: '32px', textAlign: 'center',
          background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12,
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 12 }}>
            <circle cx="20" cy="20" r="19" stroke="#00FF88" strokeWidth="2"/>
            <path d="M12 20l6 6 10-12" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#00FF88', marginBottom: 6 }}>
            Telegram setup complete
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
            Your community is live. Time to shill.
          </div>
        </div>
      ) : (
        <>
          {/* Steps */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            {setup.steps.map((step, i) => (
              <StepCard key={step.step} step={step} isLast={i === setup.steps.length - 1} />
            ))}
          </div>

          {/* Mark complete */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
              Done setting up? Paste your group link to mark it complete on your token dashboard.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={tgLink}
                onChange={e => setTgLink(e.target.value)}
                placeholder="https://t.me/yourgrouplink"
                style={{
                  flex: 1, padding: '9px 12px',
                  background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#F9FAFB',
                  outline: 'none',
                }}
              />
              <button
                onClick={markComplete}
                disabled={marking}
                style={{
                  padding: '9px 18px',
                  background: '#00FF88', color: '#0A0A0F',
                  border: 'none', borderRadius: 6,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {marking ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
