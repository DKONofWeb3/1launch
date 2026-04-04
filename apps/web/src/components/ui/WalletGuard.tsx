// apps/web/src/components/ui/WalletGuard.tsx

'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { address, isConnecting } = useAccount()

  if (isConnecting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>
          Connecting...
        </div>
      </div>
    )
  }

  if (!address) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', padding: '24px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#00FF88', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A0A0F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 900, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 10 }}>
          Connect Your Wallet
        </h2>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 32, maxWidth: 280, lineHeight: 1.7 }}>
          Connect your wallet to access the dashboard and launch tokens. Your tokens are tied to your wallet address.
        </p>

        <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />

        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151', marginTop: 20 }}>
          BSC + Solana supported · No KYC
        </p>
      </div>
    )
  }

  return <>{children}</>
}
