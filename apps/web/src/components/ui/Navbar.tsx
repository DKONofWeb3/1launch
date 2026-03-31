// apps/web/src/components/ui/Navbar.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { IconRocket, IconPulse, IconSignal, IconTrendingUp } from '@/components/ui/Icons'

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: '/dashboard',        label: 'Narratives', icon: <IconPulse size={14} />      },
    { href: '/dashboard/drafts', label: 'Drafts',     icon: <IconSignal size={14} />     },
    { href: '/dashboard/tokens', label: 'Tokens',     icon: <IconRocket size={14} />     },
    { href: '/kols',             label: 'KOLs',       icon: <IconSignal size={14} />     },
    { href: '/timing',           label: 'Timing',     icon: <IconPulse size={14} />      },
    { href: '/pricing',          label: 'Pricing',    icon: <IconTrendingUp size={14} /> },
    { href: '/launch',           label: 'Launch',     icon: <IconRocket size={14} />     },
  ]

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link href="/" className="logo-mark group" onClick={() => setMobileOpen(false)}>
            <div className="logo-icon">
              <IconRocket size={15} color="#0A0A0F" />
            </div>
            <span className="logo-text">1launch</span>
            <span className="logo-tag">BETA</span>
          </Link>

          {/* Desktop nav */}
          <div className="nav-links">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href || pathname.startsWith(link.href + '/') ? 'active' : ''}`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Desktop wallet */}
            <div className="nav-wallet">
              <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
            </div>

            {/* Mobile hamburger */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
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

      {/* Mobile menu overlay */}
      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        {/* Wallet in mobile menu */}
        <div style={{ marginBottom: 16 }}>
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
        </div>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`mobile-nav-link ${pathname === link.href ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </>
  )
}
