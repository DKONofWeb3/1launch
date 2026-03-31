// apps/web/src/app/page.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, prefix = '', suffix = '', duration = 2000 }: any) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = Date.now()
      const tick = () => {
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        setVal(Math.floor(ease * to))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to, duration])

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

// ── Typewriter effect ─────────────────────────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [wordIdx, setWordIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const word = words[wordIdx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, text.length + 1))
        if (text.length === word.length - 1) {
          setTimeout(() => setDeleting(true), 1800)
        }
      } else {
        setText(word.slice(0, text.length - 1))
        if (text.length === 0) {
          setDeleting(false)
          setWordIdx(i => (i + 1) % words.length)
        }
      }
    }, deleting ? 40 : 80)
    return () => clearTimeout(timeout)
  }, [text, deleting, wordIdx, words])

  return (
    <span>
      {text}
      <span style={{ color: '#00FF88', animation: 'blink 1s step-end infinite' }}>|</span>
    </span>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay = 0 }: any) {
  return (
    <div style={{
      padding: '24px',
      background: '#0E0E16',
      border: '1px solid #1E1E2E',
      borderRadius: 12,
      animation: `fadeUp 0.6s ease both ${delay}ms`,
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(0,255,136,0.25)'
      e.currentTarget.style.transform = 'translateY(-3px)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#1E1E2E'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: 'rgba(0,255,136,0.08)',
        border: '1px solid rgba(0,255,136,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        fontSize: 20,
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#F9FAFB', marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>{desc}</div>
    </div>
  )
}

// ── Step item ─────────────────────────────────────────────────────────────────
function Step({ num, title, desc, last = false }: any) {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(0,255,136,0.1)',
          border: '1.5px solid rgba(0,255,136,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 900, color: '#00FF88',
        }}>{num}</div>
        {!last && <div style={{ width: 1, flex: 1, background: 'linear-gradient(to bottom, rgba(0,255,136,0.3), transparent)', minHeight: 40, marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 32, paddingTop: 8 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>{title}</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Grid texture overlay ─────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,136,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrollY > 20 ? '1px solid #1E1E2E' : '1px solid transparent',
        background: scrollY > 20 ? 'rgba(10,10,15,0.95)' : 'transparent',
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
          {[['Features', '#features'], ['How It Works', '#how'], ['Pricing', '/pricing']].map(([label, href]) => (
            <a key={label} href={href} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
            >{label}</a>
          ))}
          <Link href="/dashboard" style={{
            padding: '8px 18px',
            background: '#00FF88', color: '#0A0A0F',
            borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Launch Now
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px',
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 20,
          marginBottom: 28,
          animation: 'fadeUp 0.5s ease both',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', boxShadow: '0 0 6px #00FF88', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
            AI-Powered Memecoin Launch Platform
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(42px, 7vw, 80px)',
          fontWeight: 900,
          color: '#F9FAFB',
          letterSpacing: '-2px',
          lineHeight: 1.05,
          marginBottom: 14,
          maxWidth: 900,
          animation: 'fadeUp 0.5s ease both 100ms',
        }}>
          Narrative to Token.<br />
          <span style={{ color: '#00FF88' }}>Under 5 Minutes.</span>
        </h1>

        {/* Typewriter */}
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 'clamp(14px, 2vw, 18px)',
          color: '#6B7280',
          marginBottom: 36,
          height: 28,
          animation: 'fadeUp 0.5s ease both 200ms',
        }}>
          {'> '}
          <Typewriter words={[
            'Deploy on BSC in one click',
            'Launch on Solana in seconds',
            'AI generates your token identity',
            'Lock liquidity. Renounce. Go.',
            'Volume bot. KOLs. Trending.',
          ]} />
        </div>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          animation: 'fadeUp 0.5s ease both 300ms',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Link href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px',
            background: '#00FF88', color: '#0A0A0F',
            borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 0 30px rgba(0,255,136,0.25)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,255,136,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,136,0.25)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Start Launching Free
          </Link>
          <Link href="/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px',
            background: 'transparent', color: '#9CA3AF',
            border: '1px solid #2A2A3E',
            borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4B5563'; e.currentTarget.style.color = '#F9FAFB' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.color = '#9CA3AF' }}
          >
            View Pricing
          </Link>
        </div>

        {/* Social proof */}
        <div style={{
          marginTop: 48,
          display: 'flex', gap: 8, alignItems: 'center',
          animation: 'fadeUp 0.5s ease both 400ms',
        }}>
          {['BSC', 'SOL', 'AI'].map(tag => (
            <span key={tag} style={{ padding: '3px 10px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 5, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', fontWeight: 700 }}>{tag}</span>
          ))}
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>· Pay with crypto · No KYC</span>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid #1E1E2E',
        borderBottom: '1px solid #1E1E2E',
        background: '#0E0E16',
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' as const }}>
          {[
            { label: 'Tokens Deployed',    value: 2847,   suffix: '+' },
            { label: 'Chains Supported',   value: 2,      suffix: ''  },
            { label: 'Avg Deploy Time',    value: 5,      suffix: 'min' },
            { label: 'Features Built',     value: 25,     suffix: '+'  },
          ].map(({ label, value, suffix }) => (
            <div key={label}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 900, color: '#00FF88', marginBottom: 4 }}>
                <Counter to={value} suffix={suffix} />
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Everything You Need</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 12 }}>
              The Full Stack.<br />From Idea to On-Chain.
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', maxWidth: 500, margin: '0 auto' }}>
              Every tool a memecoin launcher needs. No duct tape. No switching tabs. One platform.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            <FeatureCard delay={0}   icon="🧠" title="AI Token Identity"       desc="Gemini + Groq generates your token name, ticker, logo, lore, and social content from any trending narrative in seconds." />
            <FeatureCard delay={60}  icon="⚡" title="One-Click Deploy"        desc="Deploy ERC-20 on BSC or SPL tokens on Solana directly from your wallet. Factory contract handles everything." />
            <FeatureCard delay={120} icon="📊" title="Narrative Feed"          desc="Live hype signals from Reddit, DexScreener, CoinGecko, and Google Trends. Know what's hot before anyone else does." />
            <FeatureCard delay={180} icon="🔒" title="LP Lock"                 desc="Lock liquidity on Unicrypt directly from the dashboard. Publicly verifiable. Builds trust with buyers immediately." />
            <FeatureCard delay={240} icon="📈" title="Volume Bot"              desc="Automated market activity across 3-50 wallets. Keeps your chart alive on DEX screeners. 3 tiers from $29/mo." />
            <FeatureCard delay={300} icon="🎯" title="KOL Marketplace"         desc="Browse vetted crypto influencers by chain, niche, and engagement rate. Book directly. We handle the escrow." />
            <FeatureCard delay={360} icon="🔍" title="Sniper Tracker"          desc="See exactly who sniped your launch in the first 3 blocks. Know who's holding what and plan accordingly." />
            <FeatureCard delay={420} icon="🐋" title="Whale Monitor"           desc="Get alerted on Telegram when wallets holding 1%+ of supply make a move. Never be the last to know." />
            <FeatureCard delay={480} icon="🕵️" title="Copycat Tracker"         desc="Hourly scans detect tokens using your name or ticker. Instant TG alert when a copycat launches." />
            <FeatureCard delay={540} icon="⏱️" title="Launch Timing Engine"    desc="AI analyzes Fear & Greed, gas prices, narrative heat, and market sentiment to recommend your launch window." />
            <FeatureCard delay={600} icon="📄" title="Whitepaper Generator"    desc="AI writes a full litepaper with tokenomics, roadmap, and disclaimer. Exports as a dark-themed PDF." />
            <FeatureCard delay={660} icon="🫧" title="Bubblemaps Integration"  desc="Interactive holder concentration visualization embedded directly on your token dashboard. Powered by Bubblemaps." />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" style={{
        position: 'relative', zIndex: 1,
        padding: '100px 24px',
        background: '#0E0E16',
        borderTop: '1px solid #1E1E2E',
        borderBottom: '1px solid #1E1E2E',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.8px', marginBottom: 16 }}>
              Narrative to Live Token in Under 5 Minutes
            </h2>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>
              1launch collapses the entire memecoin launch pipeline into a single flow. No Solidity knowledge needed. No hopping between 8 tools. Just pick a narrative and go.
            </p>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px',
              background: '#00FF88', color: '#0A0A0F',
              borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}>
              Try It Now — Free
            </Link>
          </div>

          <div>
            <Step num="1" title="Pick a Narrative"       desc="Browse the live narrative feed — trending topics ranked by hype score. Reddit, DexScreener, CoinGecko all feeding into one ranked list." />
            <Step num="2" title="Generate Token Identity" desc="AI instantly creates a name, ticker, logo, description, TG bio, Twitter bio, and 5 launch tweets tailored to the narrative." />
            <Step num="3" title="Review & Configure"     desc="Adjust supply, taxes, LP lock settings. Run through the pre-launch checklist to make sure you're ready." />
            <Step num="4" title="Deploy On-Chain"        desc="One click deploys your token to BSC or Solana. Wallet signs the transaction. Token is live in under 60 seconds." last />
          </div>
        </div>
      </section>

      {/* ── Chains ───────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px', textAlign: 'center' as const }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 20 }}>
            Multi-Chain Support
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' as const, marginBottom: 32 }}>
            {[
              { name: 'BNB Smart Chain', color: '#F0B90B', desc: 'PancakeSwap · Low fees · Factory contract' },
              { name: 'Solana',          color: '#9945FF', desc: 'Jupiter · Instant finality · SPL tokens'  },
            ].map(chain => (
              <div key={chain.name} style={{
                padding: '20px 28px',
                background: '#0E0E16',
                border: `1px solid ${chain.color}30`,
                borderRadius: 12,
                minWidth: 240,
              }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: chain.color, marginBottom: 6 }}>{chain.name}</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>{chain.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>
            More chains coming in v2.0 — Base, Ethereum, Arbitrum
          </div>
        </div>
      </section>

      {/* ── Pricing preview ──────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '100px 24px',
        background: '#0E0E16',
        borderTop: '1px solid #1E1E2E',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' as const }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Pricing</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1px', marginBottom: 14 }}>
            Pay With Crypto. No Cards.
          </h2>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', marginBottom: 48, maxWidth: 440, margin: '0 auto 48px' }}>
            USDT, USDC, BNB, or SOL. Subscriptions activate within 2 minutes of payment — automatically.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
            {[
              { plan: 'Free',    price: '$0',    color: '#6B7280', desc: '1 launch · Core tools'          },
              { plan: 'Builder', price: '$49',   color: '#3B82F6', desc: '5 launches · Full toolkit'      },
              { plan: 'Pro',     price: '$149',  color: '#00FF88', desc: 'Unlimited · Vol bot included',  badge: 'Popular' },
              { plan: 'Agency',  price: '$499',  color: '#FF9500', desc: 'White-label · Priority support' },
            ].map(({ plan, price, color, desc, badge }) => (
              <div key={plan} style={{
                padding: '22px',
                background: badge ? 'rgba(0,255,136,0.03)' : '#0A0A0F',
                border: `1.5px solid ${badge ? 'rgba(0,255,136,0.25)' : '#1E1E2E'}`,
                borderRadius: 12,
                position: 'relative',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {badge && (
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', background: '#00FF88', borderRadius: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, fontWeight: 800, color: '#0A0A0F', whiteSpace: 'nowrap' as const }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8 }}>{plan}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 900, color, marginBottom: 8 }}>{price}<span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 400, color: '#4B5563' }}>{price !== '$0' ? '/mo' : ''}</span></div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{desc}</div>
              </div>
            ))}
          </div>

          <Link href="/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '12px 26px',
            background: 'transparent', color: '#9CA3AF',
            border: '1px solid #2A2A3E', borderRadius: 8,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4B5563'; e.currentTarget.style.color = '#F9FAFB' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A3E'; e.currentTarget.style.color = '#9CA3AF' }}
          >
            See Full Pricing →
          </Link>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '120px 24px',
        textAlign: 'center' as const,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800, height: 400,
          background: 'radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 900, color: '#F9FAFB', letterSpacing: '-1.5px', marginBottom: 16 }}>
            The narrative is live.<br />
            <span style={{ color: '#00FF88' }}>Are you?</span>
          </h2>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#6B7280', marginBottom: 40, lineHeight: 1.7 }}>
            Every minute you wait, someone else is launching the same narrative.<br />
            1launch gets you from idea to on-chain in under 5 minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '15px 32px',
              background: '#00FF88', color: '#0A0A0F',
              borderRadius: 9, fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 40px rgba(0,255,136,0.25)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,255,136,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,255,136,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Launch Your First Token
            </Link>
          </div>
          <div style={{ marginTop: 20, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>
            Free to start · No card required · BSC + Solana
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid #1E1E2E',
        padding: '32px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap' as const, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#1E1E2E' }}>
          Not financial advice. DYOR.
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #00FF88; }
          50%       { opacity: 0.5; box-shadow: 0 0 12px #00FF88; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
