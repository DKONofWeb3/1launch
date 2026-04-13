// apps/web/src/context/WalletContext.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'

type WalletContextType = {
  // EVM
  evmAddress:    string | null
  // Solana
  solAddress:    string | null
  // Combined — whichever is connected
  address:       string | null   // EVM preferred, SOL fallback
  chain:         'bsc' | 'solana' | null
  isConnected:   boolean         // true if EITHER is connected
}

const WalletContext = createContext<WalletContextType>({
  evmAddress:  null,
  solAddress:  null,
  address:     null,
  chain:       null,
  isConnected: false,
})

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const { address: evmAddr } = useAccount()
  const { publicKey }        = useWallet()

  const evmAddress = evmAddr   ? evmAddr.toLowerCase()    : null
  const solAddress = publicKey ? publicKey.toBase58()      : null
  const address    = evmAddress || solAddress
  const chain: 'bsc' | 'solana' | null = evmAddress ? 'bsc' : solAddress ? 'solana' : null
  const isConnected = !!(evmAddress || solAddress)

  return (
    <WalletContext.Provider value={{ evmAddress, solAddress, address, chain, isConnected }}>
      {children}
    </WalletContext.Provider>
  )
}

// Use this everywhere instead of useAccount()
export function useWalletContext() {
  return useContext(WalletContext)
}
