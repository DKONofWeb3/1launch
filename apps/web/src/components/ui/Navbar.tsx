// apps/web/src/components/ui/Navbar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MultiWalletButton } from './MultiWalletButton'

const links = [
  { href: '/dashboard',        label: 'Feed'      },
  { href: '/launch',           label: 'Launch'    },
  { href: '/dashboard/tokens', label: 'My Tokens' },
]

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'))

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <Link href="/dashboard" className="logo-mark">
            <div className="logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">1launch</span>
            <span className="logo-tag">BETA</span>
          </Link>

          {/* Desktop links */}
          <div className="nav-links">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`nav-link ${isActive(l.href) ? 'active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right — multi wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="nav-wallet">
              <MultiWalletButton />
            </div>
            <button className="mobile-menu-btn" onClick={() => setOpen(o => !o)} aria-label="Menu">
              {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, top: 56, zIndex: 49,
          background: 'rgba(10,10,15,0.98)',
          backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column',
          padding: '20px 16px 40px',
          overflowY: 'auto',
        }}>
          {/* Wallet section */}
          <div style={{ marginBottom: 24, padding: '16px', background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12 }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginBottom: 12 }}>CONNECTED WALLETS</div>
            <MultiWalletButton />
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {links.map(l => (
              <Link key={l.href} href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '14px 18px',
                  background: isActive(l.href) ? 'rgba(0,255,136,0.06)' : '#0E0E16',
                  border: `1px solid ${isActive(l.href) ? 'rgba(0,255,136,0.2)' : '#1E1E2E'}`,
                  borderRadius: 10, textDecoration: 'none',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 600,
                  color: isActive(l.href) ? '#00FF88' : '#9CA3AF',
                }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
