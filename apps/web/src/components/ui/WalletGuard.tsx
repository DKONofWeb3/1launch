// apps/web/src/components/ui/WalletGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { api } from '@/lib/api'

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const MOBILE_WALLETS = [
  {
    name: 'MetaMask',
    deepLink: (url: string) => `https://metamask.app.link/dapp/${url}`,
  },
  {
    name: 'Phantom',
    deepLink: (url: string) => `https://phantom.app/ul/browse/${url}?ref=${url}`,
  },
]

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { address, isConnecting } = useAccount()
  const [isTelegram,    setIsTelegram]    = useState(false)
  const [tgWallet,      setTgWallet]      = useState<string | null>(null) // wallet linked in bot
  const [tgChecked,     setTgChecked]     = useState(false)
  const [checked,       setChecked]       = useState(false)
  const [mobile,        setMobile]        = useState(false)

  useEffect(() => {
    setMobile(isMobile())

    async function detect() {
      const tg     = (window as any).Telegram?.WebApp
      const stored = (() => { try { return localStorage.getItem('tg_user') } catch { return null } })()

      let tgId: string | null = null

      if (tg?.initDataUnsafe?.user?.id) {
        tgId = String(tg.initDataUnsafe.user.id)
        try { tg.ready(); tg.expand() } catch {}
        if (tg.initDataUnsafe.user) {
          localStorage.setItem('tg_user', JSON.stringify(tg.initDataUnsafe.user))
        }
      } else if (stored) {
        try { tgId = String(JSON.parse(stored).id) } catch {}
      }

      if (tgId) {
        setIsTelegram(true)
        // Check if this TG user has a linked wallet in our DB
        try {
          const res = await api.get(`/api/telegram/wallet?telegram_id=${tgId}`)
          if (res.data.success && res.data.data?.wallet_address) {
            setTgWallet(res.data.data.wallet_address)
          }
        } catch {}
      }

      setTgChecked(true)
      setChecked(true)
    }

    const t = setTimeout(detect, 100)
    return () => clearTimeout(t)
  }, [])

  if (!checked || !tgChecked || isConnecting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>
      </div>
    )
  }

  // TG user with linked wallet — let them through (wallet address available via tgWallet)
  if (isTelegram && tgWallet) {
    return <>{children}</>
  }

  // TG user without linked wallet — let them through but show wallet prompt inline
  // (they can still browse narratives, just can't deploy)
  if (isTelegram && !tgWallet) {
    return <>{children}</>
  }

  // Regular web user with wallet connected
  if (address) return <>{children}</>

  // No wallet — show connect screen
  const currentUrl = typeof window !== 'undefined'
    ? window.location.host + window.location.pathname
    : '1launch-web.vercel.app/dashboard'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh',
      padding: '24px 20px', textAlign: 'center',
    }}>
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

      {mobile ? (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {MOBILE_WALLETS.map(w => (
            <a key={w.name} href={w.deepLink(currentUrl)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '13px 20px',
              background: '#0E0E16', border: '1px solid #1E1E2E',
              borderRadius: 10,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
              color: '#F9FAFB', textDecoration: 'none',
            }}>
              Open in {w.name}
            </a>
          ))}
          <div style={{ marginTop: 4 }}>
            <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
          </div>
        </div>
      ) : (
        <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
      )}

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#2A2A3E', marginTop: 16 }}>
        BSC + Solana supported · No KYC
      </p>
    </div>
  )
}

// Hook to get wallet address — works for both web wallet and TG linked wallet
export function useWalletAddress(): string | null {
  const { address } = useAccount()
  const [tgWallet, setTgWallet] = useState<string | null>(null)

  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem('tg_user') } catch { return null } })()
    if (!stored) return
    try {
      const user = JSON.parse(stored)
      if (user?.id) {
        api.get(`/api/telegram/wallet?telegram_id=${user.id}`)
          .then(res => { if (res.data.success && res.data.data?.wallet_address) setTgWallet(res.data.data.wallet_address) })
          .catch(() => {})
      }
    } catch {}
  }, [])

  return address || tgWallet
}
