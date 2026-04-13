// apps/web/src/components/ui/MultiWalletButton.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'

const mono = 'IBM Plex Mono, monospace'

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

// ── Single wallet pill ────────────────────────────────────────────────────────
function WalletPill({
  chain, address, onDisconnect,
}: { chain: 'BSC' | 'SOL'; address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const chainColor = chain === 'BSC' ? '#F3BA2F' : '#9945FF'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          background: '#0E0E16',
          border: `1px solid ${chainColor}40`,
          borderRadius: 8, cursor: 'pointer',
        }}
      >
        {chain === 'BSC'
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 7H9.5L12 2Z" fill="#F3BA2F"/><path d="M7 5.5L9.5 7L7 9.5L4.5 7L7 5.5Z" fill="#F3BA2F"/><path d="M17 5.5L19.5 7L17 9.5L14.5 7L17 5.5Z" fill="#F3BA2F"/><path d="M12 7L17 9.5L19.5 12L17 14.5L12 17L7 14.5L4.5 12L7 9.5L12 7Z" fill="#F3BA2F"/><path d="M7 14.5L9.5 17L7 19.5L4.5 17L7 14.5Z" fill="#F3BA2F"/><path d="M17 14.5L19.5 17L17 19.5L14.5 17L17 14.5Z" fill="#F3BA2F"/><path d="M12 17L14.5 19L12 22L9.5 19L12 17Z" fill="#F3BA2F"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17.5H20L17 20H4V17.5Z" fill="url(#pill_sol1)"/><path d="M4 10.75H20L17 13.25H4V10.75Z" fill="url(#pill_sol2)"/><path d="M4 4H20L17 6.5H4V4Z" fill="url(#pill_sol3)"/><defs><linearGradient id="pill_sol1" x1="4" y1="18.75" x2="20" y2="18.75"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="pill_sol2" x1="4" y1="12" x2="20" y2="12"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="pill_sol3" x1="4" y1="5.25" x2="20" y2="5.25"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs></svg>
        }
        <span style={{ fontFamily: mono, fontSize: 11, color: '#9CA3AF' }}>
          {shortAddr(address)}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="#4B5563" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
          background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 8,
          minWidth: 180, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E2E' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#4B5563', marginBottom: 3 }}>
              CONNECTED ({chain})
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: '#F9FAFB', wordBreak: 'break-all' }}>
              {shortAddr(address)}
            </div>
          </div>
          <button
            onClick={() => { onDisconnect(); setOpen(false) }}
            style={{
              width: '100%', padding: '10px 12px', background: 'transparent',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontFamily: mono, fontSize: 11, color: '#FF6B6B',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add wallet dropdown ───────────────────────────────────────────────────────
function AddWalletButton({
  hasEVM, hasSOL,
  onConnectEVM, onConnectSOL,
}: {
  hasEVM: boolean; hasSOL: boolean
  onConnectEVM: () => void; onConnectSOL: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // If both connected, nothing to add
  if (hasEVM && hasSOL) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 12px',
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 8, cursor: 'pointer',
          fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#00FF88',
        }}
      >
        {hasEVM || hasSOL ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add wallet
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
          background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 10,
          minWidth: 220, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #1E1E2E' }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: '#4B5563', letterSpacing: '0.1em' }}>
              SELECT NETWORK
            </div>
          </div>

          {!hasEVM && (
            <button
              onClick={() => { onConnectEVM(); setOpen(false) }}
              style={{
                width: '100%', padding: '12px 14px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid #0A0A0F',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'rgba(243,186,47,0.1)', border: '1px solid rgba(243,186,47,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 7H9.5L12 2Z" fill="#F3BA2F"/><path d="M7 5.5L9.5 7L7 9.5L4.5 7L7 5.5Z" fill="#F3BA2F"/><path d="M17 5.5L19.5 7L17 9.5L14.5 7L17 5.5Z" fill="#F3BA2F"/><path d="M12 7L17 9.5L19.5 12L17 14.5L12 17L7 14.5L4.5 12L7 9.5L12 7Z" fill="#F3BA2F"/><path d="M7 14.5L9.5 17L7 19.5L4.5 17L7 14.5Z" fill="#F3BA2F"/><path d="M17 14.5L19.5 17L17 19.5L14.5 17L17 14.5Z" fill="#F3BA2F"/><path d="M12 17L14.5 19L12 22L9.5 19L12 17Z" fill="#F3BA2F"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>
                  BSC Wallet
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: '#4B5563' }}>
                  MetaMask, WalletConnect, Coinbase
                </div>
              </div>
            </button>
          )}

          {!hasSOL && (
            <button
              onClick={() => { onConnectSOL(); setOpen(false) }}
              style={{
                width: '100%', padding: '12px 14px', background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 17.5H20L17 20H4V17.5Z" fill="url(#add_sol1)"/><path d="M4 10.75H20L17 13.25H4V10.75Z" fill="url(#add_sol2)"/><path d="M4 4H20L17 6.5H4V4Z" fill="url(#add_sol3)"/><defs><linearGradient id="add_sol1" x1="4" y1="18.75" x2="20" y2="18.75"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="add_sol2" x1="4" y1="12" x2="20" y2="12"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient><linearGradient id="add_sol3" x1="4" y1="5.25" x2="20" y2="5.25"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs></svg>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>
                  Solana Wallet
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: '#4B5563' }}>
                  Phantom, Solflare, Backpack, any
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MultiWalletButton() {
  const { address: evmAddress }    = useAccount()
  const { disconnect: disconnectEVM } = useDisconnect()
  const { openConnectModal }       = useConnectModal()

  const { publicKey, disconnect: disconnectSOL } = useWallet()
  const { setVisible: openSolModal }             = useWalletModal()

  const solAddress = publicKey?.toBase58()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {evmAddress && (
        <WalletPill
          chain="BSC"
          address={evmAddress}
          onDisconnect={() => disconnectEVM()}
        />
      )}
      {solAddress && (
        <WalletPill
          chain="SOL"
          address={solAddress}
          onDisconnect={() => disconnectSOL()}
        />
      )}
      <AddWalletButton
        hasEVM={!!evmAddress}
        hasSOL={!!solAddress}
        onConnectEVM={() => openConnectModal?.()}
        onConnectSOL={() => openSolModal(true)}
      />
    </div>
  )
}
