// apps/web/src/app/page.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [wordIdx, setWordIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, text.length + 1))
        if (text.length === word.length - 1) setTimeout(() => setDeleting(true), 1800)
      } else {
        setText(word.slice(0, text.length - 1))
        if (text.length === 0) { setDeleting(false); setWordIdx(i => (i + 1) % words.length) }
      }
    }, deleting ? 40 : 80)
    return () => clearTimeout(timeout)
  }, [text, deleting, wordIdx, words])

  return <span>{text}<span style={{ color: '#00FF88', animation: 'blink 1s step-end infinite' }}>|</span></span>
}

// ── Counter ───────────────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = Date.now()
      const tick = () => {
        const p = Math.min((Date.now() - start) / 2000, 1)
        setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

// ── Animated feature showcase ─────────────────────────────────────────────────
function NarrativeDemo() {
  const [active, setActive] = useState(0)
  const narratives = [
    { title: 'AI Agents taking over crypto', score: 94, tickers: ['$AGENT', '$AIAI', '$TAKEOVER'] },
    { title: 'Bitcoin ETF approval wave', score: 87, tickers: ['$ETFKING', '$WAVE', '$BTCGO'] },
    { title: 'Solana meme season returns', score: 81, tickers: ['$SOLFOMO', '$BACK', '$SEASON'] },
  ]
  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % narratives.length), 2500)
    return () => clearInterval(t)
  }, [])
  const n = narratives[active]
  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px', fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 12 }}>LIVE NARRATIVE FEED</div>
      {narratives.map((n2, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: 8, background: active === i ? 'rgba(0,255,136,0.06)' : '#0A0A0F', border: `1px solid ${active === i ? 'rgba(0,255,136,0.2)' : '#1E1E2E'}`, transition: 'all 0.4s' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${active === i ? '#00FF88' : '#1E1E2E'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 900, color: active === i ? '#00FF88' : '#374151' }}>{n2.score}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: active === i ? '#F9FAFB' : '#4B5563', fontWeight: 600, transition: 'color 0.4s', lineHeight: 1.4 }}>{n2.title}</div>
            {active === i && (
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                {n2.tickers.map(t => <span key={t} style={{ padding: '1px 6px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, fontSize: 9, color: '#00FF88', fontWeight: 700 }}>{t}</span>)}
              </div>
            )}
          </div>
          <div style={{ width: 50, height: 3, background: '#1E1E2E', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${n2.score}%`, background: '#00FF88', borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DeployDemo() {
  const [step, setStep] = useState(0)
  const steps = ['Generating identity...', 'Compiling contract...', 'Deploying to BSC...', 'Token live!']
  useEffect(() => {
    const t = setInterval(() => setStep(i => (i + 1) % steps.length), 1500)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px', fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 16 }}>ONE-CLICK DEPLOY</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(0,255,136,0.1)', border: '2px solid #00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="1.5"/>
            <path d="M12 6v6l4 2" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB', fontFamily: 'Syne, sans-serif' }}>$AGENT</div>
          <div style={{ fontSize: 10, color: '#4B5563' }}>AI Agent Takeover · 1B supply</div>
        </div>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < steps.length - 1 ? '1px solid #0A0A0F' : 'none' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${i < step ? '#00FF88' : i === step ? '#FF9500' : '#1E1E2E'}`, background: i < step ? '#00FF88' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', flexShrink: 0 }}>
            {i < step && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            {i === step && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FF9500', animation: 'pulse2 1s infinite' }} />}
          </div>
          <span style={{ fontSize: 11, color: i < step ? '#00FF88' : i === step ? '#F9FAFB' : '#374151', transition: 'color 0.3s' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

function BotDemo() {
  const [visible, setVisible] = useState<number[]>([])
  const msgs = [
    { from: 'bot', text: 'Copycat detected: $AGENT2 launched on BSC' },
    { from: 'bot', text: 'Wallet 0x3f2a... sold 5% of supply' },
    { from: 'bot', text: 'Price alert: $AGENT hit $0.0001' },
    { from: 'bot', text: 'Volume bot: 47 cycles complete · $12,400 vol' },
  ]
  useEffect(() => {
    msgs.forEach((_, i) => {
      setTimeout(() => setVisible(v => [...v, i]), i * 1000)
    })
    const t = setInterval(() => {
      setVisible([])
      msgs.forEach((_, i) => setTimeout(() => setVisible(v => [...v, i]), i * 1000))
    }, msgs.length * 1000 + 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '20px', fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,149,255,0.15)', border: '1px solid rgba(0,149,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#0095FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F9FAFB' }}>1launch Bot</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00FF88' }} />
            <span style={{ fontSize: 9, color: '#00FF88' }}>Online</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ opacity: visible.includes(i) ? 1 : 0, transform: visible.includes(i) ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s ease', padding: '8px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: '4px 10px 10px 10px', fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chain logos (inline SVG) ──────────────────────────────────────────────────
function BSCLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="26" fill="#F0B90B"/>
      <path d="M26 13l4.5 4.5-4.5 4.5-4.5-4.5L26 13z" fill="white"/>
      <path d="M17.5 21.5l4.5 4.5-4.5 4.5-4.5-4.5 4.5-4.5z" fill="white"/>
      <path d="M34.5 21.5l4.5 4.5-4.5 4.5-4.5-4.5 4.5-4.5z" fill="white"/>
      <path d="M26 30l4.5 4.5-4.5 4.5-4.5-4.5L26 30z" fill="white"/>
      <path d="M26 24.5l1.5 1.5-1.5 1.5-1.5-1.5L26 24.5z" fill="white"/>
    </svg>
  )
}

function SolanaLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="26" fill="#9945FF"/>
      <path d="M16 33h16.5l3.5-3H19.5L16 33z" fill="url(#solgrad1)"/>
      <path d="M16 26h16.5l3.5-3H19.5L16 26z" fill="url(#solgrad2)"/>
      <path d="M19.5 19H36l-3.5-3H16l3.5 3z" fill="url(#solgrad3)"/>
      <defs>
        <linearGradient id="solgrad1" x1="16" y1="31.5" x2="36" y2="31.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
        <linearGradient id="solgrad2" x1="16" y1="24.5" x2="36" y2="24.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
        <linearGradient id="solgrad3" x1="16" y1="17.5" x2="36" y2="17.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Sticky nav ───────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrollY > 20 ? '1px solid #1E1E2E' : '1px solid transparent',
        background: scrollY > 20 ? 'rgba(10,10,15,0.96)' : 'transparent',
        backdropFilter: scrollY > 20 ? 'blur(12px)' : 'none',
        transition: 'all 0.3s',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.3px' }}>1launch</span>
          <span style={{ padding: '2px 7px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 700, color: '#00FF88', letterSpacing: '0.08em' }}>BETA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {[['Features', '#features'], ['How It Works', '#how'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
            >{label}</a>
          ))}
          <Link href="/dashboard" style={{ padding: '8px 18px', background: '#00FF88', color: '#0A0A0F', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >Launch Now</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', overflow: 'hidden' }}>

        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />

        {/* Radial gradient over grid */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,255,136,0.07) 0%, rgba(10,10,15,0) 70%)',
        }} />

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to bottom, transparent, #0A0A0F)' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 20, marginBottom: 28, animation: 'fadeUp 0.5s ease both' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 6px #00FF88', animation: 'pulseGlow 2s infinite' }} />
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
              AI-Powered Memecoin Launch Platform
            </span>
          </div>

          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(42px, 7vw, 82px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 14, animation: 'fadeUp 0.5s ease both 100ms' }}>
            Narrative to Token.<br />
            <span style={{ color: '#00FF88' }}>Under 5 Minutes.</span>
          </h1>

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 'clamp(14px, 2vw, 18px)', color: '#6B7280', marginBottom: 36, height: 28, animation: 'fadeUp 0.5s ease both 200ms' }}>
            {'> '}
            <Typewriter words={['Deploy on BSC in one click', 'Launch on Solana in seconds', 'AI generates your token identity', 'Lock liquidity. Renounce. Go.', 'Volume bot. KOLs. Trending.']} />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', animation: 'fadeUp 0.5s ease both 300ms', flexWrap: 'wrap' }}>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#00FF88', color: '#0A0A0F', borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 30px rgba(0,255,136,0.25)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(0,255,136,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.25)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Start Launching Free
            </Link>
            <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'transparent', color: '#9CA3AF', border: '1px solid #2A2A3E', borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4B5563'; e.currentTarget.style.color = '#F9FAFB' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.color = '#9CA3AF' }}
            >How It Works</a>
          </div>

          <div style={{ marginTop: 48, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', animation: 'fadeUp 0.5s ease both 400ms' }}>
            {['BSC', 'SOL', 'AI-Powered', 'Crypto Payments', 'No KYC'].map(tag => (
              <span key={tag} style={{ padding: '3px 10px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', fontWeight: 700 }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid #1E1E2E', borderBottom: '1px solid #1E1E2E', background: '#0E0E16', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {[
            { label: 'Tokens Deployed',  value: 2847, suffix: '+' },
            { label: 'Chains Supported', value: 2,    suffix: ''  },
            { label: 'Avg Deploy Time',  value: 5,    suffix: 'min' },
            { label: 'Features Built',   value: 25,   suffix: '+'  },
          ].map(({ label, value, suffix }) => (
            <div key={label}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color: '#00FF88', marginBottom: 4 }}>
                <Counter to={value} suffix={suffix} />
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature showcases ────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>What You Get</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 14 }}>
              Three features that make<br />everyone else obsolete
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', maxWidth: 460, margin: '0 auto' }}>
              See them in action. Live. Not mockups.
            </p>
          </div>

          {/* Feature 1 */}
          <div className="feature-showcase-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', marginBottom: 100 }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>01 — Narrative Intelligence</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 16, lineHeight: 1.2 }}>
                Know what's trending before everyone else does
              </h3>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 24 }}>
                Live narrative feed pulls signals from Reddit, DexScreener, CoinGecko and Google Trends every 30 minutes. Each narrative is scored 0-100 by hype velocity. First mover wins.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Reddit + DexScreener + CoinGecko signals', 'Hype score updated every 30 minutes', 'AI ticker suggestions per narrative'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="rgba(0,255,136,0.15)"/><path d="M4 7l2 2 4-4" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <NarrativeDemo />
          </div>

          {/* Feature 2 */}
          <div className="feature-showcase-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', marginBottom: 100 }}>
            <DeployDemo />
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>02 — One-Click Deploy</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 16, lineHeight: 1.2 }}>
                From wallet connect to live token in 60 seconds
              </h3>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 24 }}>
                AI generates your name, ticker, logo and lore. Our factory contract handles deployment on BSC or Solana. No Solidity knowledge. No switching tabs. Just sign and go.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['AI generates full token identity', 'BSC via PancakeSwap factory', 'Solana SPL via Jupiter', 'GoPlus audit scan on launch'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="rgba(0,255,136,0.15)"/><path d="M4 7l2 2 4-4" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="feature-showcase-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>03 — Post-Launch Intelligence</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 16, lineHeight: 1.2 }}>
                Your Telegram bot never sleeps
              </h3>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 24 }}>
                Copycat tracker alerts you the moment someone clones your token. Whale monitor catches big wallet moves. Volume bot keeps your chart alive. All firing through Telegram.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Copycat detection every hour', 'Whale wallet movement alerts', 'Volume bot across 3-50 wallets', 'Price alerts via Telegram'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="rgba(0,255,136,0.15)"/><path d="M4 7l2 2 4-4" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <BotDemo />
          </div>

          {/* Explore more CTA */}
          <div style={{ marginTop: 80, textAlign: 'center', padding: '48px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 16 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>And That's Just 3 Of 25+ Features</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 10 }}>LP Lock. KOL Marketplace. Whitepaper Generator.<br />Bubblemaps. Launch Timing. Vesting. And more.</h3>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 28 }}>Everything a memecoin launcher needs. One platform. No duct tape.</p>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 26px', background: '#00FF88', color: '#0A0A0F', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              Explore the Platform
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#0A0A0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px 24px', background: '#0E0E16', borderTop: '1px solid #1E1E2E', borderBottom: '1px solid #1E1E2E' }}>
        <div className="how-grid" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 16 }}>
              Narrative to live token in under 5 minutes
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>
              1launch collapses the entire memecoin launch pipeline into a single flow. No Solidity knowledge. No hopping between 8 tools.
            </p>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#00FF88', color: '#0A0A0F', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Try It Free
            </Link>
          </div>
          <div>
            {[
              { n: '1', title: 'Pick a Narrative',         desc: 'Browse live signals ranked by hype score. Reddit, DexScreener, CoinGecko feeding into one ranked feed.' },
              { n: '2', title: 'Generate Token Identity',  desc: 'AI creates name, ticker, logo, description, TG bio, Twitter bio and 5 launch tweets.' },
              { n: '3', title: 'Review & Configure',       desc: 'Set supply, taxes, LP lock. Run through the pre-launch checklist. Saturation scan for your ticker.' },
              { n: '4', title: 'Deploy On-Chain',          desc: 'One click. BSC or Solana. Wallet signs. Token is live in under 60 seconds.' },
            ].map((step, i, arr) => (
              <div key={step.n} style={{ display: 'flex', gap: 20, marginBottom: i < arr.length - 1 ? 0 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,255,136,0.1)', border: '1.5px solid rgba(0,255,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 900, color: '#00FF88' }}>{step.n}</div>
                  {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: 'linear-gradient(to bottom, rgba(0,255,136,0.3), transparent)', minHeight: 40, marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 32 : 0, paddingTop: 8 }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>{step.title}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Multi-chain ───────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 14 }}>Multi-Chain</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 48 }}>
            Deploy anywhere degens live
          </h2>
          <div className="chain-grid" style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 48 }}>
            {[
              { Logo: BSCLogo,     name: 'BNB Smart Chain', color: '#F0B90B', dex: 'PancakeSwap', speed: 'Fast · Low fees',       status: 'Live' },
              { Logo: SolanaLogo,  name: 'Solana',          color: '#9945FF', dex: 'Jupiter',     speed: 'Instant · Ultra cheap', status: 'Live' },
            ].map(({ Logo, name, color, dex, speed, status }) => (
              <div key={name} style={{ padding: '32px 36px', background: '#0E0E16', border: `1px solid ${color}25`, borderRadius: 16, minWidth: 260, transition: 'all 0.2s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${color}50`; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${color}25`; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <Logo />
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>{name}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', marginBottom: 16 }}>{dex} · {speed}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 20 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00FF88' }} />
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700, color: '#00FF88' }}>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>
            Base · Ethereum · Arbitrum — coming in v2.0
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 24px', background: '#0E0E16', borderTop: '1px solid #1E1E2E' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 14 }}>Pay with crypto. No cards.</h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', maxWidth: 440, margin: '0 auto' }}>
              USDT, USDC, BNB, or SOL. Subscriptions activate automatically within 2 minutes of payment.
            </p>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                id: 'free', name: 'Free', price: '$0', color: '#6B7280', border: '#1E1E2E', badge: null, launches: '1 token launch',
                features: ['BSC + Solana deployment', 'Auto GoPlus audit scan', 'Pre-launch checklist', 'Telegram setup guide', 'Launch timing engine', 'Bubblemaps viewer'],
                locked: ['Meme kit — $9', 'Post-launch roadmap — $19', 'Whitepaper — $29'],
                cta: 'Start Free', ctaStyle: 'ghost',
              },
              {
                id: 'builder', name: 'Builder', price: '$49', color: '#3B82F6', border: 'rgba(59,130,246,0.25)', badge: null, launches: '5 launches / month',
                features: ['Everything in Free', 'Meme kit generator', 'Post-launch roadmap', 'LP lock (basic)', 'On-chain analytics', 'KOL marketplace access'],
                locked: ['Whitepaper — $29 add-on', 'Sniper tracker — $14/mo', 'Copycat tracker — $14/mo'],
                cta: 'Get Builder', ctaStyle: 'blue',
              },
              {
                id: 'pro', name: 'Pro', price: '$149', color: '#00FF88', border: 'rgba(0,255,136,0.35)', badge: 'Most Popular', launches: 'Unlimited launches',
                features: ['Everything in Builder', 'Whitepaper generator', 'Sniper + whale tracker', 'Copycat tracker + alerts', 'Volume bot (Starter tier)', 'Priority in KOL marketplace'],
                locked: [],
                cta: 'Get Pro', ctaStyle: 'green',
              },
              {
                id: 'agency', name: 'Agency', price: '$499', color: '#FF9500', border: 'rgba(255,149,0,0.25)', badge: null, launches: 'Unlimited + white-label',
                features: ['Everything in Pro', 'Volume bot (Growth tier)', 'White-label dashboard', 'Agency client management', 'Custom branding', 'Priority support'],
                locked: [],
                cta: 'Get Agency', ctaStyle: 'orange',
              },
            ].map(plan => (
              <div key={plan.id} style={{ background: plan.badge ? 'rgba(0,255,136,0.03)' : '#0A0A0F', border: `1.5px solid ${plan.border}`, borderRadius: 14, padding: '28px 24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '3px 12px', background: '#00FF88', borderRadius: 20, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 800, color: '#0A0A0F', whiteSpace: 'nowrap' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 900, color: plan.color }}>{plan.price}</span>
                    {plan.price !== '$0' && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>/mo</span>}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 16 }}>{plan.launches}</div>
                  <div style={{ height: 1, background: '#1E1E2E', marginBottom: 16 }} />
                </div>

                <div style={{ flex: 1, marginBottom: 20 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6" fill={`${plan.color}20`}/><path d="M4 7l2 2 4-4" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#9CA3AF' }}>{f}</span>
                    </div>
                  ))}
                  {plan.locked.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, opacity: 0.4 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#6B7280" strokeWidth="1.2"/><path d="M5 6V4.5a2 2 0 1 1 4 0V6" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/pricing" style={{
                  display: 'block', textAlign: 'center', padding: '11px 0',
                  background: plan.ctaStyle === 'green' ? '#00FF88' : plan.ctaStyle === 'ghost' ? 'transparent' : `${plan.color}15`,
                  color: plan.ctaStyle === 'green' ? '#0A0A0F' : plan.color,
                  border: `1px solid ${plan.ctaStyle === 'ghost' ? '#1E1E2E' : `${plan.color}40`}`,
                  borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/pricing" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563', textDecoration: 'none' }}>
              View full pricing with all add-ons →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1.5px', marginBottom: 16 }}>
            The narrative is live.<br /><span style={{ color: '#00FF88' }}>Are you?</span>
          </h2>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', marginBottom: 40, lineHeight: 1.7 }}>
            Every minute you wait, someone else is launching the same narrative.<br />1launch gets you from idea to on-chain in under 5 minutes.
          </p>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 32px', background: '#00FF88', color: '#0A0A0F', borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 40px rgba(0,255,136,0.25)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,255,136,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,255,136,0.25)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Launch Your First Token
          </Link>
          <div style={{ marginTop: 20, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>Free to start · No card required · BSC + Solana</div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #1E1E2E', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>1launch</span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151' }}>© 2025</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Dashboard', '/dashboard'], ['KOLs', '/kols'], ['Timing', '/timing'], ['Pricing', '/pricing']].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6B7280'}
              onMouseLeave={e => e.currentTarget.style.color = '#374151'}
            >{label}</Link>
          ))}
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#1E1E2E' }}>Not financial advice. DYOR.</div>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 6px #00FF88; } 50% { box-shadow: 0 0 14px #00FF88; } }
        @keyframes pulse2 { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @media (max-width: 768px) {
          .feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
