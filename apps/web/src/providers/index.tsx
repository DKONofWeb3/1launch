'use client'

import { ReactNode, useMemo } from 'react'

// ── EVM / BSC ─────────────────────────────────────────────────────────────────
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

// ── Solana ────────────────────────────────────────────────────────────────────
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

// ── Wallet context — unifies EVM + Solana ─────────────────────────────────────
import { WalletContextProvider } from '@/context/WalletContext'

const wagmiConfig = getDefaultConfig({
  appName:   '1launch',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains:    [bsc],
  ssr:       true,
})

const queryClient = new QueryClient()
const solanaEndpoint = process.env.NEXT_PUBLIC_HELIUS_RPC || clusterApiUrl('mainnet-beta')

// Cast to any — fixes React 18/19 type mismatch with @solana/wallet-adapter-react
const SolConnection = ConnectionProvider  as any
const SolWallet     = WalletProvider      as any
const SolModal      = WalletModalProvider as any

export function Providers({ children }: { children: ReactNode }) {
  const solanaWallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], [])

  return (
    <SolConnection endpoint={solanaEndpoint}>
      <SolWallet wallets={solanaWallets} autoConnect>
        <SolModal>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor:           '#00FF88',
                  accentColorForeground: '#0A0A0F',
                })}
              >
                <WalletContextProvider>
                  {children}
                </WalletContextProvider>
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </SolModal>
      </SolWallet>
    </SolConnection>
  )
}