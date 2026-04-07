// apps/web/src/components/ui/ComingSoon.tsx

'use client'

import { useRouter } from 'next/navigation'

interface ComingSoonProps {
  feature: string
  description?: string
  backHref?: string
}

export function ComingSoon({ feature, description, backHref }: ComingSoonProps) {
  const router = useRouter()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(10,10,15,0.96)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      {/* Back button top left */}
      <button
        onClick={() => backHref ? router.push(backHref) : router.back()}
        style={{
          position: 'absolute', top: 20, left: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
          color: '#6B7280', padding: '8px 0',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back
      </button>

      {/* Card */}
      <div style={{
        background: '#0E0E16',
        border: '1.5px solid rgba(0,255,136,0.3)',
        borderRadius: 16,
        padding: '36px 28px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(0,255,136,0.08)',
        transform: 'rotate(-1.5deg)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px',
          background: 'rgba(0,255,136,0.08)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 20,
          marginBottom: 16,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700, color: '#00FF88', letterSpacing: '0.15em' }}>
            COMING SOON
          </span>
        </div>

        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(22px, 5vw, 30px)',
          fontWeight: 900, color: '#F9FAFB',
          letterSpacing: '-0.5px',
          marginBottom: 12,
        }}>
          {feature}
        </h2>

        {description && (
          <p style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, color: '#6B7280',
            lineHeight: 1.7, marginBottom: 24,
          }}>
            {description}
          </p>
        )}

        <button
          onClick={() => backHref ? router.push(backHref) : router.back()}
          style={{
            width: '100%',
            padding: '12px 0',
            background: 'transparent',
            border: '1px solid #1E1E2E',
            borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, fontWeight: 600,
            color: '#6B7280', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.color = '#F9FAFB' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.color = '#6B7280' }}
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
