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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 7H9.5L12 2Z" fill="#F3BA2F"/><path d="M7 5.5L9.5 7L7 9.5L4.5 7L7 5.5Z" fill="#F3BA2F"/><path d="M17 5.5L19.5 7L17 9.5L14.5 7L17 5.5Z" fill="#F3BA2F"/><path d="M12 7L17 9.5L19.5 12L17 14.5L12 17L7 14.5L4.5 12L7 9.5L12 7Z" fill="#F3BA2F"/><path d="M7 14.5L9.5 17L7 19.5L4.5 17L7 14.5Z" fill="#F3BA2F"/><path d="M17 14.5L19.5 17L17 19.5L14.5 17L17 14.5Z" fill="#F3BA2F"/><path d="M12 17L14.5 19L12 22L9.5 19L12 17Z" fill="#F3BA2F"/></svg>
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 17.5H20L17 20H4V17.5Z" fill="url(#wg_sol1)"/><path d="M4 10.75H20L17 13.25H4V10.75Z" fill="url(#wg_sol2)"/><path d="M4 4H20L17 6.5H4V4Z" fill="url(#wg_sol3)"/><defs><linearGradient id="wg_sol1" x1="4" y1="18.75" x2="20" y2="18.75"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="wg_sol2" x1="4" y1="12" x2="20" y2="12"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="wg_sol3" x1="4" y1="5.25" x2="20" y2="5.25"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs></svg>
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
