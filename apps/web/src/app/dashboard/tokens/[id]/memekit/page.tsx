// apps/web/src/app/dashboard/tokens/[id]/memekit/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface Meme {
  id: string
  title: string
  caption: string
  concept: string
  image_url: string
  type: string
}

function MemeCard({ meme }: { meme: Meme }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyCaption() {
    navigator.clipboard.writeText(meme.caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function downloadImage() {
    try {
      const res = await fetch(meme.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meme.title.replace(/\s+/g, '_')}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(meme.image_url, '_blank')
    }
  }

  return (
    <div style={{
      background: '#0E0E16',
      border: '1px solid #1E1E2E',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = '#2A2A3E')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}
    >
      {/* Image */}
      <div style={{
        width: '100%', aspectRatio: '1',
        background: '#0A0A0F',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!imgLoaded && !imgError && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        )}
        {imgError ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: 20,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#1E1E2E" strokeWidth="1.5"/>
              <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#1E1E2E" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151', textAlign: 'center' }}>
              Image generating...{'\n'}Click download to view
            </span>
          </div>
        ) : (
          <img
            src={meme.image_url}
            alt={meme.title}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        )}

        {/* Type badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          padding: '2px 8px',
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid #1E1E2E',
          borderRadius: 4,
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 600,
          color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        }}>
          {meme.type}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
          color: '#F9FAFB', marginBottom: 6,
        }}>
          {meme.title}
        </div>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          color: '#9CA3AF', lineHeight: 1.5, marginBottom: 12,
        }}>
          "{meme.caption}"
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyCaption}
            style={{
              flex: 1, padding: '7px 0',
              background: copied ? 'rgba(0,255,136,0.1)' : 'transparent',
              border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
              borderRadius: 6,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600,
              color: copied ? '#00FF88' : '#6B7280',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {copied ? 'Copied' : 'Copy Caption'}
          </button>
          <button
            onClick={downloadImage}
            style={{
              flex: 1, padding: '7px 0',
              background: 'transparent',
              border: '1px solid #1E1E2E',
              borderRadius: 6,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 600,
              color: '#6B7280',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#2A2A3E'
              e.currentTarget.style.color = '#F9FAFB'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1E1E2E'
              e.currentTarget.style.color = '#6B7280'
            }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MemeKitPage() {
  const params = useParams()
  const router = useRouter()

  const [token, setToken] = useState<any>(null)
  const [memes, setMemes] = useState<Meme[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load token data + any existing meme kit
    Promise.all([
      api.get(`/api/launched-tokens/${params.id}`),
      api.get(`/api/memekit/${params.id}`),
    ]).then(([tokenRes, memesRes]) => {
      if (tokenRes.data.success) setToken(tokenRes.data.data)
      if (memesRes.data.success && memesRes.data.data?.memes) {
        setMemes(memesRes.data.data.memes)
      }
    }).finally(() => setLoading(false))
  }, [params.id])

  async function generate() {
    if (!token) return
    setGenerating(true)
    setError(null)
    const draft = token.token_drafts
    try {
      const res = await api.post('/api/memekit/generate', {
        token_id: params.id,
        name: draft?.name,
        ticker: draft?.ticker,
        narrative: '',
        description: draft?.description,
      })
      if (res.data.success) {
        setMemes(res.data.data.memes)
      } else {
        setError(res.data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const draft = token?.token_drafts

  return (
    <div className="dashboard-layout">
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280',
          marginBottom: 8,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to token
      </button>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Meme Kit</h1>
          <p className="page-subtitle">
            {draft ? `AI-generated launch memes for ${draft.name} ($${draft.ticker})` : 'AI-generated launch memes'}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating || loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 18px',
            background: generating || loading ? '#1E1E2E' : '#00FF88',
            color: generating || loading ? '#4B5563' : '#0A0A0F',
            border: 'none', borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
            cursor: generating || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {generating ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="7" cy="7" r="5" stroke="#4B5563" strokeWidth="2" strokeDasharray="20 10"/>
              </svg>
              Generating...
            </>
          ) : memes.length > 0 ? 'Regenerate' : 'Generate Meme Kit'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 20,
          background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)',
          borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B',
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && memes.length === 0 && !generating && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 20px', gap: 14,
          background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12,
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="#1E1E2E" strokeWidth="1.5"/>
            <path d="M3 15l5-5 4 4 3-3 6 6" stroke="#1E1E2E" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="#1E1E2E"/>
          </svg>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>
            No memes generated yet
          </p>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#1E1E2E', textAlign: 'center' }}>
            Click Generate to create 5 AI-powered launch memes
          </span>
          <button
            onClick={generate}
            style={{
              marginTop: 8, padding: '10px 22px',
              background: '#00FF88', color: '#0A0A0F',
              border: 'none', borderRadius: 8,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Generate Meme Kit
          </button>
        </div>
      )}

      {/* Generating skeleton */}
      {generating && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                width: '100%', aspectRatio: '1',
                background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)',
                backgroundSize: '200% 100%',
                animation: `shimmer 1.5s infinite ${i * 0.15}s`,
              }} />
              <div style={{ padding: 16 }}>
                <div style={{ height: 12, background: '#1E1E2E', borderRadius: 4, marginBottom: 8, width: '60%', animation: 'shimmer 1.5s infinite' }} />
                <div style={{ height: 10, background: '#1E1E2E', borderRadius: 4, width: '90%', animation: 'shimmer 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Meme grid */}
      {!generating && memes.length > 0 && (
        <>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563',
            marginBottom: 16,
          }}>
            {memes.length} memes generated — images load from Pollinations.ai (may take 10-30 seconds)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {memes.map(meme => <MemeCard key={meme.id} meme={meme} />)}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
