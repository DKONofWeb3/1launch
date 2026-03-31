// apps/web/src/app/dashboard/tokens/[id]/roadmap/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  community: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  marketing:  { color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
  trading:    { color: '#00FF88', bg: 'rgba(0,255,136,0.1)' },
  technical:  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  listings:   { color: '#FF3B3B', bg: 'rgba(255,59,59,0.1)' },
}

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] || { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' }
  return (
    <span style={{
      padding: '2px 8px',
      background: c.bg,
      border: `1px solid ${c.color}30`,
      borderRadius: 4,
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 9, fontWeight: 700,
      color: c.color, letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      flexShrink: 0,
    }}>
      {category}
    </span>
  )
}

function WeekCard({ week, index }: { week: any; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div style={{
      background: '#0E0E16',
      border: '1px solid #1E1E2E',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: expanded ? '1px solid #1E1E2E' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' as const }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(0,255,136,0.1)',
            border: '1.5px solid rgba(0,255,136,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#00FF88',
            flexShrink: 0,
          }}>
            W{week.week}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB', marginBottom: 2 }}>
              {week.title}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
              {week.focus}
            </div>
          </div>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(week.tasks || []).map((task: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 14, padding: '12px 14px',
                background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 3 }}>
                  {task.day}
                </div>
                <CategoryBadge category={task.category} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}>
                  {task.task}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                  {task.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RoadmapPage() {
  const params = useParams()
  const router = useRouter()

  const [token, setToken] = useState<any>(null)
  const [roadmap, setRoadmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get(`/api/launched-tokens/${params.id}`),
      api.get(`/api/roadmap/${params.id}`),
    ]).then(([tokenRes, roadmapRes]) => {
      if (tokenRes.data.success) setToken(tokenRes.data.data)
      if (roadmapRes.data.success && roadmapRes.data.data) setRoadmap(roadmapRes.data.data)
    }).finally(() => setLoading(false))
  }, [params.id])

  async function generate() {
    if (!token) return
    setGenerating(true)
    setError(null)
    const draft = token.token_drafts
    try {
      const res = await api.post('/api/roadmap/generate', {
        token_id: params.id,
        name: draft?.name,
        ticker: draft?.ticker,
        chain: token.chain?.toUpperCase(),
        description: draft?.description,
        narrative: '',
      })
      if (res.data.success) setRoadmap(res.data.data)
      else setError(res.data.error)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  function copyAll() {
    if (!roadmap) return
    const lines = [
      `${roadmap.meta?.name} ($${roadmap.meta?.ticker}) — 30-Day Post-Launch Plan`,
      '',
      roadmap.overview,
      '',
      ...roadmap.weeks.flatMap((w: any) => [
        `== WEEK ${w.week}: ${w.title.toUpperCase()} ==`,
        w.focus,
        ...w.tasks.map((t: any) => `[${t.day}] [${t.category.toUpperCase()}] ${t.task}\n  → ${t.detail}`),
        '',
      ]),
      '== MILESTONES ==',
      ...(roadmap.milestones || []).map((m: any) => `Day ${m.day}: ${m.milestone}`),
      '',
      '== KPIs ==',
      ...(roadmap.kpis || []).map((k: any) => `${k.metric}: ${k.target} (${k.how})`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const draft = token?.token_drafts

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
          <h1 className="page-title">Post-Launch Roadmap</h1>
          <p className="page-subtitle">30-day action plan for {draft?.name} (${draft?.ticker})</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {roadmap && (
            <button
              onClick={copyAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="#6B7280" strokeWidth="1.5"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#6B7280" strokeWidth="1.5"/>
              </svg>
              Copy All
            </button>
          )}
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
            }}
          >
            {generating ? (
              <><svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="7" cy="7" r="5" stroke="#4B5563" strokeWidth="2" strokeDasharray="20 10"/></svg>Generating...</>
            ) : roadmap ? 'Regenerate' : 'Generate Roadmap'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {!loading && !roadmap && !generating && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 14, background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#1E1E2E" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 12h6M9 16h4" stroke="#1E1E2E" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#374151' }}>No roadmap yet</p>
          <button onClick={generate} style={{ padding: '10px 22px', background: '#00FF88', color: '#0A0A0F', border: 'none', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Generate 30-Day Plan
          </button>
        </div>
      )}

      {roadmap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overview */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Strategy Overview</div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#9CA3AF', lineHeight: 1.7 }}>{roadmap.overview}</p>
          </div>

          {/* Milestones timeline */}
          {roadmap.milestones?.length > 0 && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Milestones</div>
              <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, right: 12, height: 1, background: '#1E1E2E' }} />
                {roadmap.milestones.map((m: any, i: number) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#0A0A0F', border: '2px solid #00FF88',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: '#00FF88',
                    }}>
                      {m.day}
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#9CA3AF', textAlign: 'center' as const, lineHeight: 1.4, padding: '0 8px' }}>
                      {m.milestone}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week cards */}
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            Weekly Breakdown
          </div>
          {(roadmap.weeks || []).map((week: any, i: number) => (
            <WeekCard key={i} week={week} index={i} />
          ))}

          {/* KPIs */}
          {roadmap.kpis?.length > 0 && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>KPIs</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {roadmap.kpis.map((kpi: any, i: number) => (
                  <div key={i} style={{ padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8 }}>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{kpi.metric}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00FF88', marginBottom: 4 }}>{kpi.target}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{kpi.how}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#1E1E2E', textAlign: 'center' as const, paddingBottom: 20 }}>
            Generated {new Date(roadmap.meta?.generated_at).toLocaleDateString()} · 1launch
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
