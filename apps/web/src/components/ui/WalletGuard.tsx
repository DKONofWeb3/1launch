// apps/web/src/components/ui/WalletGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useWalletContext } from '@/context/WalletContext'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

const mono = 'IBM Plex Mono, monospace'
const syne = 'Syne, sans-serif'

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useWalletContext()
  const { openConnectModal }          = useConnectModal()
  const { setVisible: openSolModal }  = useWalletModal()

  // Wait for DOM + autoConnect to resolve before deciding to lock
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // Give autoConnect 800ms to fire before showing lock screen
    const t = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Show loading while hydrating or while wallets are auto-connecting
  if (!ready || isConnecting) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ fontFamily: mono, fontSize: 12, color: '#4B5563' }}>Loading...</div>
    </div>
  )

  // Either wallet connected — let through
  if (isConnected) return <>{children}</>

  // Nothing connected — show network choice
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
        fontFamily: syne, fontSize: 22, fontWeight: 900,
        color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 8,
      }}>
        Connect a Wallet
      </h2>
      <p style={{
        fontFamily: mono, fontSize: 12, color: '#6B7280',
        marginBottom: 32, maxWidth: 260, lineHeight: 1.7,
      }}>
        Choose BSC to launch with MetaMask, or Solana to launch with Phantom or any Solana wallet.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        {/* BSC */}
        <button
          onClick={() => openConnectModal?.()}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            background: '#0E0E16', border: '1px solid rgba(243,186,47,0.25)',
            borderRadius: 10, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(243,186,47,0.1)', border: '1px solid rgba(243,186,47,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 900, color: '#F3BA2F' }}>BSC</span>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>
              BSC Wallet
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#4B5563' }}>
              MetaMask · WalletConnect · Coinbase
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <path d="M5 3l4 4-4 4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Solana */}
        <button
          onClick={() => openSolModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px',
            background: '#0E0E16', border: '1px solid rgba(153,69,255,0.25)',
            borderRadius: 10, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 900, color: '#9945FF' }}>SOL</span>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>
              Solana Wallet
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: '#4B5563' }}>
              Phantom · Solflare · Backpack · any
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <path d="M5 3l4 4-4 4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <p style={{ fontFamily: mono, fontSize: 10, color: '#2A2A3E', marginTop: 20 }}>
        No KYC · Pay per launch
      </p>
    </div>
  )
}
