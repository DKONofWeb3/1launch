// apps/web/src/components/ui/WalletGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useWalletContext } from '@/context/WalletContext'
import { MultiWalletButton } from './MultiWalletButton'

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWalletContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Loading...</div>
    </div>
  )

  if (isConnected) return <>{children}</>

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh',
      padding: '24px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 13, background: '#00FF88',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
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
        Connect a Wallet
      </h2>
      <p style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280',
        marginBottom: 28, maxWidth: 280, lineHeight: 1.7,
      }}>
        Connect a BSC or Solana wallet to access the feed and launch tokens.
      </p>
      <MultiWalletButton />
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#2A2A3E', marginTop: 20 }}>
        BSC + Solana supported · No KYC
      </p>
    </div>
  )
}
