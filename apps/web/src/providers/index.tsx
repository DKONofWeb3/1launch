'use client'

import { ReactNode } from 'react'

// ── EVM / BSC ─────────────────────────────────────────────────────────────────
import { RainbowKitProvider, getDefaultConfig, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { bsc } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

// ── Solana ────────────────────────────────────────────────────────────────────
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

const wagmiConfig = getDefaultConfig({
  appName: '1launch',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [bsc],
  ssr: true,
})

const queryClient = new QueryClient()

const solanaWallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
]

const solanaEndpoint = clusterApiUrl('devnet')

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={solanaEndpoint}>
      <WalletProvider wallets={solanaWallets} autoConnect>
        <WalletModalProvider>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor: '#00FF88',
                  accentColorForeground: '#0A0A0F',
                })}
              >
                {children}
              </RainbowKitProvider>
            </QueryClientProvider>
          </WagmiProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
