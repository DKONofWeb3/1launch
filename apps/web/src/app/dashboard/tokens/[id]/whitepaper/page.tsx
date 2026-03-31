// apps/web/src/app/dashboard/tokens/[id]/whitepaper/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function WhitepaperPage() {
  const params = useParams()
  const router = useRouter()

  const [token, setToken] = useState<any>(null)
  const [whitepaper, setWhitepaper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/api/launched-tokens/${params.id}`),
      api.get(`/api/whitepaper/${params.id}`),
    ]).then(([tokenRes, wpRes]) => {
      if (tokenRes.data.success) setToken(tokenRes.data.data)
      if (wpRes.data.success && wpRes.data.data) setWhitepaper(wpRes.data.data)
    }).finally(() => setLoading(false))
  }, [params.id])

  async function generate() {
    if (!token) return
    setGenerating(true)
    setError(null)
    const draft = token.token_drafts
    try {
      const res = await api.post('/api/whitepaper/generate', {
        token_id: params.id,
        name: draft?.name,
        ticker: draft?.ticker,
        chain: token.chain.toUpperCase(),
        description: draft?.description,
        total_supply: draft?.total_supply,
        narrative: '',
      })
      if (res.data.success) {
        setWhitepaper(res.data.data)
      } else {
        setError(res.data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function downloadPDF() {
    setDownloading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiUrl}/api/whitepaper/${params.id}/download`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${whitepaper?.meta?.name || 'token'}_litepaper.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err: any) {
      setError('PDF download failed: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  const draft = token?.token_drafts

  const sections = [
    'Abstract & Executive Summary',
    'Problem Statement',
    'The Solution',
    'Tokenomics & Distribution',
    '3-Phase Roadmap',
    'Community Vision',
    'Legal Disclaimer',
  ]

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
          <h1 className="page-title">Whitepaper</h1>
          <p className="page-subtitle">AI-generated litepaper for {draft?.name} (${draft?.ticker})</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {whitepaper && (
            <button
              onClick={downloadPDF}
              disabled={downloading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: downloading ? '#1E1E2E' : 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: downloading ? '#4B5563' : '#00FF88', cursor: downloading ? 'not-allowed' : 'pointer' }}
            >
              {downloading ? (
                <><svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="7" cy="7" r="5" stroke="#4B5563" strokeWidth="2" strokeDasharray="20 10"/></svg>Generating PDF...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M8 13l4 4 4-4" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20h16" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round"/></svg>Download PDF</>
              )}
            </button>
          )}
          <button
            onClick={generate}
            disabled={generating || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: generating || loading ? '#1E1E2E' : '#00FF88', color: generating || loading ? '#4B5563' : '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: generating || loading ? 'not-allowed' : 'pointer' }}
          >
            {generating ? (<><svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="7" cy="7" r="5" stroke="#4B5563" strokeWidth="2" strokeDasharray="20 10"/></svg>Generating...</>) : whitepaper ? 'Regenerate' : 'Generate Whitepaper'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Format',   value: 'PDF (Dark theme)' },
          { label: 'Sections', value: '7 sections' },
          { label: 'Includes', value: 'Roadmap + Tokenomics' },
          { label: 'Price',    value: 'Free (Basic)' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>What's Included</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sections.map((section, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke={whitepaper ? '#00FF88' : '#1E1E2E'} strokeWidth="1.2"/>
                {whitepaper && <path d="M4 7l2 2 4-4" stroke="#00FF88" strokeWidth="1.2" strokeLinecap="round"/>}
              </svg>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: whitepaper ? '#9CA3AF' : '#374151' }}>{section}</span>
            </div>
          ))}
        </div>
      </div>

      {!loading && !whitepaper && !generating && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 14, background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#1E1E2E" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#1E1E2E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>No whitepaper yet</p>
          <button onClick={generate} style={{ marginTop: 8, padding: '10px 22px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Generate Whitepaper
          </button>
        </div>
      )}

      {whitepaper && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#00FF88" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M14 2v6h6" stroke="#00FF88" strokeWidth="1.5"/>
            </svg>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#00FF88' }}>Whitepaper ready</span>
          </div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
            Generated {new Date(whitepaper.meta?.generated_at).toLocaleString()} — click Download PDF above.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
