// apps/web/src/context/WalletContext.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'

type WalletContextType = {
  evmAddress:   string | null
  solAddress:   string | null
  address:      string | null      // EVM preferred, SOL fallback
  chain:        'bsc' | 'solana' | null
  isConnected:  boolean            // true if EITHER wallet connected
  isConnecting: boolean            // true while either wallet is auto-connecting
}

const WalletContext = createContext<WalletContextType>({
  evmAddress:   null,
  solAddress:   null,
  address:      null,
  chain:        null,
  isConnected:  false,
  isConnecting: false,
})

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const { address: evmAddr, isConnecting: evmConnecting } = useAccount()
  const { publicKey, connecting: solConnecting }          = useWallet()

  const evmAddress  = evmAddr   ? evmAddr.toLowerCase() : null
  const solAddress  = publicKey ? publicKey.toBase58()  : null
  const address     = evmAddress || solAddress
  const chain: 'bsc' | 'solana' | null =
    evmAddress ? 'bsc' : solAddress ? 'solana' : null
  const isConnected  = !!(evmAddress || solAddress)
  const isConnecting = evmConnecting || solConnecting

  return (
    <WalletContext.Provider value={{
      evmAddress, solAddress, address, chain, isConnected, isConnecting,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext() {
  return useContext(WalletContext)
}
