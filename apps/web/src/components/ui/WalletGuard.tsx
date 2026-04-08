// apps/web/src/components/ui/WalletGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Deep links for mobile wallets
const MOBILE_WALLETS = [
  {
    name: 'MetaMask',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21.5 2L13.5 8l1.5-5.5L21.5 2z" fill="#E2761B"/>
        <path d="M2.5 2l7.9 6.1L9 2.5 2.5 2z" fill="#E4761B"/>
        <path d="M18.5 16.5l-2.1 3.2 4.5 1.2 1.3-4.3-3.7-.1z" fill="#E4761B"/>
        <path d="M2.3 16.6l1.3 4.3 4.5-1.2-2.1-3.2-3.7.1z" fill="#E4761B"/>
      </svg>
    ),
    deepLink: (url: string) => `https://metamask.app.link/dapp/${url}`,
  },
  {
    name: 'Phantom',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#AB9FF2"/>
        <path d="M20 12c0-4.4-3.6-8-8-8S4 7.6 4 12s3.6 8 8 8 8-3.6 8-8z" fill="#AB9FF2"/>
        <path d="M16.5 10.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5S14.2 9 15 9s1.5.7 1.5 1.5z" fill="white"/>
        <path d="M10.5 10.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5S8.2 9 9 9s1.5.7 1.5 1.5z" fill="white"/>
      </svg>
    ),
    deepLink: (url: string) => `https://phantom.app/ul/browse/${url}?ref=${url}`,
  },
]

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { address, isConnecting } = useAccount()
  const [isTelegram, setIsTelegram] = useState(false)
  const [checked,    setChecked]    = useState(false)
  const [mobile,     setMobile]     = useState(false)

  useEffect(() => {
    setMobile(isMobile())

    function detect() {
      const tg = (window as any).Telegram?.WebApp

      if (tg?.initDataUnsafe?.user) {
        setIsTelegram(true)
        try { tg.ready(); tg.expand() } catch {}
        localStorage.setItem('tg_user', JSON.stringify(tg.initDataUnsafe.user))
        setChecked(true)
        return
      }

      if (tg?.initData && tg.initData.length > 0) {
        setIsTelegram(true)
        try { tg.ready(); tg.expand() } catch {}
        setChecked(true)
        return
      }

      try {
        const stored = localStorage.getItem('tg_user')
        if (stored) { setIsTelegram(true); setChecked(true); return }
      } catch {}

      setChecked(true)
    }

    const t = setTimeout(detect, 100)
    return () => clearTimeout(t)
  }, [])

  if (!checked || isConnecting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>
      </div>
    )
  }

  if (isTelegram) return <>{children}</>

  if (!address) {
    const currentUrl = typeof window !== 'undefined'
      ? window.location.host + window.location.pathname
      : '1launch-web.vercel.app/dashboard'

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh',
        padding: '24px 20px', textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: 13,
          background: '#00FF88',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900,
          color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          Connect Your Wallet
        </h2>
        <p style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
          color: '#6B7280', marginBottom: 28, maxWidth: 260, lineHeight: 1.7,
        }}>
          Connect to access the feed and launch tokens.
        </p>

        {/* Mobile: show deep link buttons first */}
        {mobile ? (
          <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {MOBILE_WALLETS.map(w => (
              <a
                key={w.name}
                href={w.deepLink(currentUrl)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '13px 20px',
                  background: '#0E0E16',
                  border: '1px solid #1E1E2E',
                  borderRadius: 10,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
                  color: '#F9FAFB', textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                {w.icon}
                Open in {w.name}
              </a>
            ))}
            {/* WalletConnect fallback */}
            <div style={{ marginTop: 4 }}>
              <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
            </div>
          </div>
        ) : (
          /* Desktop: just RainbowKit */
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
        )}

        <p style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
          color: '#2A2A3E', marginTop: 16,
        }}>
          BSC + Solana supported · No KYC
        </p>
      </div>
    )
  }

  return <>{children}</>
}