// apps/web/src/app/deploy/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEventLogs } from 'viem'
import { parseEther } from 'viem'
import { useSendTransaction } from 'wagmi'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconRocket } from '@/components/ui/Icons'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { MultiWalletButton } from '@/components/ui/MultiWalletButton'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWalletContext } from '@/context/WalletContext'

type DeployStatus = 'idle' | 'waiting_wallet' | 'pending' | 'confirming' | 'success' | 'error'

interface DeployResult {
  contractAddress: string
  txHash: string
  explorerUrl: string
  txUrl: string
}

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createToken',
    stateMutability: 'payable',
    inputs: [
      { name: '_name',        type: 'string'  },
      { name: '_symbol',      type: 'string'  },
      { name: '_totalSupply', type: 'uint256' },
      { name: '_owner',       type: 'address' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'deployFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { name: 'token',   type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
    ],
  },
] as const

// ── Solana direct payment hook ───────────────────────────────────────────────
function useSolanaPayment() {
  const { publicKey, sendTransaction, connected, wallet } = useWallet()
  const { connection }                                     = useConnection()

  async function paySOL(amountSOL: number, toAddress: string): Promise<string> {
    if (!publicKey)  throw new Error('Solana wallet not connected')
    if (!connected)  throw new Error('Wallet not connected. Please connect Phantom or Solflare.')
    if (!wallet)     throw new Error('No Solana wallet found. Install Phantom or Solflare.')

    const toPubkey    = new PublicKey(toAddress)
    const lamports    = Math.round(amountSOL * LAMPORTS_PER_SOL)
    const transaction = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: publicKey, toPubkey, lamports })
    )

    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer        = publicKey

    const signature = await sendTransaction(transaction, connection)
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')
    return signature
  }

  return { paySOL, publicKey }
}

// ── Status indicator ──────────────────────────────────────────────────────────
function StatusIndicator({ status }: { status: DeployStatus }) {
  const steps = [
    { key: 'waiting_wallet', label: 'Approve in wallet' },
    { key: 'pending',        label: 'Tx broadcasting'   },
    { key: 'confirming',     label: 'Awaiting confirmations' },
    { key: 'success',        label: 'Live on-chain'     },
  ]
  const currentIndex = steps.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => {
        const done   = i < currentIndex || status === 'success'
        const active = step.key === status
        return (
          <div key={step.key} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            background: active ? 'rgba(0,255,136,0.06)' : done ? 'rgba(0,255,136,0.03)' : '#0A0A0F',
            border: `1px solid ${active ? 'rgba(0,255,136,0.3)' : done ? 'rgba(0,255,136,0.12)' : '#1E1E2E'}`,
            borderRadius: 8,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: done ? '#00FF88' : 'transparent',
              border: `1.5px solid ${done ? '#00FF88' : active ? '#00FF88' : '#2A2A3E'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : active ? (
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #00FF88', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              ) : null}
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: done ? '#00FF88' : active ? '#F9FAFB' : '#374151', fontWeight: active || done ? 600 : 400 }}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── BSC deploy hook — uses viem parseEventLogs for correct address ─────────────
function useBSCDeploy() {
  const { address }            = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient           = usePublicClient()

  async function deploy(draft: any, factoryAddress: string): Promise<DeployResult> {
    if (!address || !walletClient || !publicClient) throw new Error('Wallet not connected')

    const deployFee = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'deployFee',
    }) as bigint

    const txHash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'createToken',
      args: [draft.name, draft.ticker, BigInt(draft.total_supply), address],
      value: deployFee,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2 })

    // ── Parse token address from factory event ───────────────────────────────
    let tokenAddress = ''

    // Method 1: viem parseEventLogs
    try {
      const parsed = parseEventLogs({
        abi: FACTORY_ABI,
        eventName: 'TokenCreated',
        logs: receipt.logs,
      })
      if (parsed.length > 0) {
        tokenAddress = (parsed[0].args as any).token as string
        console.log('[Deploy] Got address from parseEventLogs:', tokenAddress)
      }
    } catch (e) {
      console.warn('[Deploy] parseEventLogs failed:', e)
    }

    // Method 2: find log emitted BY the factory, read topics[1]
    if (!tokenAddress) {
      const factoryLog = receipt.logs.find(
        (log: any) => log.address?.toLowerCase() === factoryAddress.toLowerCase()
      )
      if (factoryLog && factoryLog.topics[1]) {
        tokenAddress = '0x' + factoryLog.topics[1].slice(26)
        console.log('[Deploy] Got address from factory log topics:', tokenAddress)
      }
    }

    // Method 3: look for the created contract in receipt
    if (!tokenAddress && (receipt as any).contractAddress) {
      tokenAddress = (receipt as any).contractAddress
      console.log('[Deploy] Got address from receipt.contractAddress:', tokenAddress)
    }

    // Method 4: last resort — scan all logs for any 42-char address in topics
    if (!tokenAddress) {
      for (const log of receipt.logs) {
        for (const topic of log.topics.slice(1)) {
          if (topic && topic.length === 66) {
            const candidate = '0x' + topic.slice(26)
            // Skip the factory and user wallet
            if (
              candidate.toLowerCase() !== factoryAddress.toLowerCase() &&
              candidate.toLowerCase() !== address!.toLowerCase()
            ) {
              tokenAddress = candidate
              console.log('[Deploy] Got address from topic scan:', tokenAddress)
              break
            }
          }
        }
        if (tokenAddress) break
      }
    }

    if (!tokenAddress) throw new Error('Could not find token address in transaction logs')

    return {
      contractAddress: tokenAddress,
      txHash,
      explorerUrl: `https://bscscan.com/token/${tokenAddress}`,
      txUrl:       `https://bscscan.com/tx/${txHash}`,
    }
  }

  return { deploy, address }
}

// ── Boost modal ───────────────────────────────────────────────────────────────
function BoostModal({ contractAddress, chain, draftId, onClose }: {
  contractAddress: string
  chain: string
  draftId: string
  onClose: () => void
}) {
  const [tier,    setTier]    = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const { address }                       = useAccount()
  const { sendTransactionAsync: sendBNB } = useSendTransaction()

  const tiers = [
    { id: 'starter', label: 'Starter', price: '$19', wallets: '3 wallets',  usd: 19 },
    { id: 'growth',  label: 'Growth',  price: '$49', wallets: '10 wallets', usd: 49, popular: true },
    { id: 'pro',     label: 'Pro',     price: '$99', wallets: '25 wallets', usd: 99 },
  ]

  async function payWithWallet() {
    if (!tier || !address) return
    setLoading(true)
    setError(null)
    try {
      const selected = tiers.find(t => t.id === tier)!

      const bnbPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd')
        .then(r => r.json()).then(d => d.binancecoin.usd).catch(() => 603)
      const bnbAmount = (selected.usd / bnbPrice).toFixed(6)

      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as `0x${string}`
      if (!platformWallet) throw new Error('Platform wallet not configured')

      const initRes = await api.post('/api/subscriptions/initiate', {
        plan_id: `volbot_${tier}`, chain: 'bsc', token: 'BNB', wallet: address,
        meta: { contract_address: contractAddress, draft_id: draftId },
      })
      if (!initRes.data.success) throw new Error(initRes.data.error)
      const paymentId = initRes.data.data.id

      const txHash = await sendBNB({ to: platformWallet, value: parseEther(bnbAmount) })
      if (!txHash) throw new Error('Transaction cancelled')

      await api.post('/api/payments/verify-tx', { tx_hash: txHash, chain: 'bsc', payment_id: paymentId })

      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(10,10,15,0.94)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px',
  }
  const card: React.CSSProperties = {
    background: '#0E0E16', border: '1px solid #1E1E2E',
    borderRadius: 16, padding: '24px', maxWidth: 440, width: '100%',
  }

  if (done) return (
    <div style={overlay}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#00FF88', marginBottom: 8 }}>Volume Bot activated.</div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Trading activity will start within 2 minutes.</div>
        <button onClick={onClose} style={{ padding: '10px 24px', background: '#00FF88', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0A0A0F' }}>Done</button>
      </div>
    </div>
  )

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 8 }}>VOLUME BOT</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#F9FAFB', marginBottom: 6 }}>Don't let your chart go quiet.</div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.7, marginBottom: 16 }}>
          Simulates real trading activity so your token doesn't look dead. First 5 minutes matter most.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {tiers.map(t => (
            <button key={t.id} onClick={() => setTier(t.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 14px',
              background: tier === t.id ? 'rgba(0,255,136,0.06)' : '#0A0A0F',
              border: `1.5px solid ${tier === t.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
              borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${tier === t.id ? '#00FF88' : '#2A2A3E'}`, background: tier === t.id ? '#00FF88' : 'transparent' }} />
                <div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>{t.label}</span>
                  {t.popular && <span style={{ marginLeft: 8, padding: '1px 6px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#00FF88', fontWeight: 700 }}>most used</span>}
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', marginTop: 1 }}>{t.wallets}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>{t.price}</span>
            </button>
          ))}
        </div>
        {error && <div style={{ padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={payWithWallet} disabled={!tier || loading} style={{ flex: 2, padding: '12px 0', background: tier && !loading ? '#00FF88' : '#1E1E2E', border: 'none', borderRadius: 8, cursor: tier && !loading ? 'pointer' : 'not-allowed', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: tier && !loading ? '#0A0A0F' : '#374151' }}>
            {loading ? 'Confirm in MetaMask...' : 'Boost My Token'}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}


// ── Whitepaper add-on ────────────────────────────────────────────────────────
function WhitepaperAddon({ contractAddress, draftId }: { contractAddress: string; draftId: string }) {
  const [step,   setStep]   = useState<'idle' | 'paying' | 'generating' | 'done'>('idle')
  const [error,  setError]  = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [doc,    setDoc]    = useState<string | null>(null)
  const { address }                       = useAccount()
  const { sendTransactionAsync: sendBNB } = useSendTransaction()

  async function payAndGenerate() {
    if (!address) { setError('Connect wallet first'); return }
    setStep('paying')
    setError(null)
    try {
      const bnbPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd')
        .then(r => r.json()).then(d => d.binancecoin.usd).catch(() => 603)
      const bnbAmount = (15 / bnbPrice).toFixed(6)
      const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS as `0x${string}`
      if (!platformWallet) throw new Error('Platform wallet not configured')

      const initRes = await api.post('/api/subscriptions/initiate', {
        plan_id: 'whitepaper', chain: 'bsc', token: 'BNB', wallet: address,
      })
      if (!initRes.data.success) throw new Error(initRes.data.error)
      const paymentId = initRes.data.data.id

      const txHash = await sendBNB({ to: platformWallet, value: parseEther(bnbAmount) })
      if (!txHash) throw new Error('Transaction cancelled')

      await api.post('/api/payments/verify-tx', { tx_hash: txHash, chain: 'bsc', payment_id: paymentId })

      setStep('generating')
      const res = await api.post('/api/whitepaper/generate', { draft_id: draftId, contract_address: contractAddress })
      if (res.data.success) {
        setDoc(JSON.stringify(res.data.data))
        setStep('done')
      } else {
        throw new Error(res.data.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed')
      setStep('idle')
    }
  }

  if (step === 'done') return (
    <div style={{ padding: '12px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8 }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88', marginBottom: 8 }}>Whitepaper generated</div>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', marginBottom: 10 }}>Visit your token page to download the PDF.</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8 }}>
      <div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 2 }}>
          {step === 'paying' ? 'Confirm in MetaMask...' : step === 'generating' ? 'Generating whitepaper...' : 'Generate Whitepaper'}
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>
          {error ? <span style={{ color: '#FF6B6B' }}>{error}</span> : 'AI-written litepaper — builds credibility'}
        </div>
      </div>
      <button
        onClick={payAndGenerate}
        disabled={step !== 'idle'}
        style={{ padding: '6px 14px', background: step === 'idle' ? 'rgba(255,149,0,0.08)' : 'transparent', border: `1px solid ${step === 'idle' ? 'rgba(255,149,0,0.3)' : '#1E1E2E'}`, borderRadius: 6, cursor: step === 'idle' ? 'pointer' : 'not-allowed', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, fontWeight: 700, color: step === 'idle' ? '#FF9500' : '#4B5563', flexShrink: 0 }}>
        {step === 'idle' ? '$15' : '...'}
      </button>
    </div>
  )
}


// ── Post-deploy modal ─────────────────────────────────────────────────────────
function PostDeployModal({ result, draft, chain, draftId, onDismiss }: {
  result: DeployResult; draft: any; chain: string; draftId: string; onDismiss: () => void
}) {
  const [copied,      setCopied]      = useState(false)
  const [tweetCopied, setTweetCopied] = useState(false)
  const [showBoost,   setShowBoost]   = useState(false)

  const launchTweet = `Just launched $${draft?.ticker} on ${chain.toUpperCase()} via @1launch_\n\nContract: ${result.contractAddress}\n\n${result.explorerUrl}`

  function copyAddress() {
    navigator.clipboard.writeText(result.contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyTweet() {
    navigator.clipboard.writeText(launchTweet)
    setTweetCopied(true)
    setTimeout(() => setTweetCopied(false), 2000)
  }

  return (
    <>
      {showBoost && (
        <BoostModal
          contractAddress={result.contractAddress}
          chain={chain}
          draftId={draftId}
          onClose={() => setShowBoost(false)}
        />
      )}

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,10,15,0.96)',
        backdropFilter: 'blur(12px)',
        overflowY: 'auto',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px 60px',
      }}>
        <div style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 20, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', animation: 'pulse 1.5s infinite' }} />
              Token is live on {chain.toUpperCase()}
            </div>
          </div>

          {/* Contract address */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 8 }}>CONTRACT ADDRESS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#F9FAFB', wordBreak: 'break-all' }}>
                {result.contractAddress}
              </div>
              <button onClick={copyAddress} style={{ padding: '6px 12px', flexShrink: 0, background: copied ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: copied ? '#00FF88' : '#6B7280' }}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={result.explorerUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '8px 0', textAlign: 'center', background: '#00FF88', border: 'none', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: '#0A0A0F', textDecoration: 'none' }}>
                View on Explorer
              </a>
              <a href={result.txUrl} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '8px 0', textAlign: 'center', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 7, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', textDecoration: 'none' }}>
                View Tx
              </a>
            </div>
          </div>

          {/* Next steps */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 14 }}>NEXT STEPS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href={chain === 'bsc' ? `https://pancakeswap.finance/add/${result.contractAddress}` : `https://raydium.io/liquidity/create-pool/`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, textDecoration: 'none' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>1. Add Liquidity</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>{chain === 'bsc' ? 'PancakeSwap — opens with your token pre-filled' : 'Raydium — create liquidity pool'}</div>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', fontWeight: 700 }}>free</span>
              </a>
              <a href={chain === 'bsc' ? `https://app.unicrypt.network/amm/pancake-v2/pair` : `https://app.unicrypt.network/amm/raydium/pair`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, textDecoration: 'none' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>2. Lock LP via Unicrypt</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>Builds trust — degens check this before buying</div>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', fontWeight: 700 }}>free</span>
              </a>
              <button onClick={copyTweet} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: tweetCopied ? 'rgba(0,255,136,0.04)' : '#0A0A0F', border: `1px solid ${tweetCopied ? 'rgba(0,255,136,0.2)' : '#1E1E2E'}`, borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 2 }}>{tweetCopied ? 'Tweet copied to clipboard' : 'Share on X'}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>Pre-written launch tweet ready to post</div>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', fontWeight: 700 }}>free</span>
              </button>

              {/* Whitepaper — paid add-on */}
              <WhitepaperAddon contractAddress={result.contractAddress} draftId={draftId} />
            </div>
          </div>

          {/* Volume bot upsell */}
          <div style={{ background: '#0E0E16', border: '1px solid #2A2A3E', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 6 }}>PAID BOOST</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900, color: '#F9FAFB', marginBottom: 6 }}>Don't let your chart go quiet.</div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.7, marginBottom: 14 }}>
              Volume Bot simulates real trading activity so your token doesn't look dead at launch. First 5 minutes matter most.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowBoost(true)} style={{ flex: 2, padding: '12px 0', background: '#00FF88', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#0A0A0F' }}>
                Boost My Token
              </button>
              <button onClick={onDismiss} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 8, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563' }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main deploy page ──────────────────────────────────────────────────────────
function DeployPageContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const draftId      = searchParams.get('draft') || ''
  const chainParam   = searchParams.get('chain') || 'bsc'
  const isSolana     = chainParam === 'solana'
  const chain        = chainParam as string

  const [draft,          setDraft]          = useState<any>(null)
  const [config,         setConfig]         = useState<any>(null)
  const [status,         setStatus]         = useState<DeployStatus>('idle')
  const [result,         setResult]         = useState<DeployResult | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [paymentPaid,    setPaymentPaid]    = useState(false)
  const [paymentData,    setPaymentData]    = useState<any>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError,   setPaymentError]   = useState<string | null>(null)
  const [copied,         setCopied]         = useState(false)
  const [isTelegram,     setIsTelegram]     = useState(false)
  const [tgWalletGate,   setTgWalletGate]   = useState(false)

  const { deploy: deployBSC, address: bscAddress } = useBSCDeploy()
  const { paySOL, publicKey: solPublicKey }          = useSolanaPayment()
  const { sendTransactionAsync: sendBNB }             = useSendTransaction()
  const [payingNow,  setPayingNow]  = useState(false)
  const [payError,   setPayError]   = useState<string | null>(null)

  // Unified wallet — either EVM or Solana
  const { evmAddress, solAddress: ctxSolAddress, isConnected } = useWalletContext()
  const { openConnectModal }         = useConnectModal()
  const { setVisible: openSolModal } = useWalletModal()
  // For Solana payment: use wallet adapter's publicKey directly
  const activeSolAddress = solPublicKey?.toBase58() || ctxSolAddress
  // Wallet address to record against payment
  const activeWallet = evmAddress || activeSolAddress || 'user'

  useEffect(() => {
    const tg     = (window as any).Telegram?.WebApp
    const stored = (() => { try { return localStorage.getItem('tg_user') } catch { return null } })()
    if ((tg?.initData && tg.initData.length > 0) || stored) setIsTelegram(true)
  }, [])

  useEffect(() => {
    if (!draftId) return
    Promise.all([
      api.get(`/api/tokens/draft/${draftId}`),
      api.get(`/api/deploy/config/${chain}`),
    ]).then(([draftRes, configRes]) => {
      if (draftRes.data.success)  setDraft(draftRes.data.data)
      if (configRes.data.success) setConfig(configRes.data.data)
    }).finally(() => setLoading(false))
  }, [draftId, chain])

  // BSC — payment is in MetaMask, no off-chain gate needed
  useEffect(() => { if (!isSolana) setPaymentPaid(true) }, [chain])

  // Poll Solana payment
  useEffect(() => {
    if (!paymentData?.id || paymentPaid) return
    const iv = setInterval(async () => {
      try {
        const res = await api.get(`/api/subscriptions/payment-status/${paymentData.id}`)
        if (res.data.data?.status === 'confirmed') { setPaymentPaid(true); clearInterval(iv) }
      } catch {}
    }, 5000)
    return () => clearInterval(iv)
  }, [paymentData?.id, paymentPaid])

  async function handleDeploy() {
    if (isTelegram && !bscAddress && !activeSolAddress) { setTgWalletGate(true); return }
    setError(null)
    setStatus('waiting_wallet')
    try {
      let deployResult: DeployResult

      if (!isSolana) {
        if (!config?.factoryAddress || !bscAddress) {
          setStatus('pending')
          const res = await api.post('/api/deploy/server-side', {
            draft_id: draftId, chain: 'bsc', network: 'mainnet', wallet_address: bscAddress || '',
          })
          if (!res.data.success) throw new Error(res.data.error)
          setStatus('success')
          setResult({
            contractAddress: res.data.data.contract_address,
            txHash:          res.data.data.tx_hash,
            explorerUrl:     `https://bscscan.com/token/${res.data.data.contract_address}`,
            txUrl:           `https://bscscan.com/tx/${res.data.data.tx_hash}`,
          })
          return
        }
        setStatus('waiting_wallet')
        deployResult = await deployBSC(draft, config.factoryAddress)
      } else {
        throw new Error('Solana deploy coming soon — use BSC for now')
      }

      setStatus('confirming')
      await api.post('/api/deploy/record', {
        draft_id: draftId, contract_address: deployResult.contractAddress,
        chain, tx_hash: deployResult.txHash, wallet_address: bscAddress || '',
      })
      setStatus('success')
      setResult(deployResult)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Deploy failed')
    }
  }

  async function payWithSolanaWallet() {
    setPayingNow(true)
    setPayError(null)
    try {
      // Get SOL amount for $1
      const solPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        .then(r => r.json()).then(d => d.solana.usd).catch(() => 81)
      const solAmount  = parseFloat((1 / solPrice).toFixed(6))
      const toAddress  = process.env.NEXT_PUBLIC_SOLANA_PLATFORM_WALLET || ''

      if (!toAddress) throw new Error('Platform wallet not configured')

      // Creates payment record first
      const initRes = await api.post('/api/subscriptions/initiate', {
        plan_id: 'deploy_fee', chain: 'solana', token: 'SOL',
        wallet: activeSolAddress || 'tg_user',
      })
      if (!initRes.data.success) throw new Error(initRes.data.error)
      const paymentId = initRes.data.data.id

      // Send SOL from wallet — Phantom/Solflare pops up
      const signature = await paySOL(solAmount, toAddress)

      // Verify tx on backend
      await api.post('/api/payments/verify-tx', {
        tx_hash: signature, chain: 'solana', payment_id: paymentId,
      })

      setPaymentPaid(true)
    } catch (err: any) {
      setPayError(err.message || 'Payment failed')
    } finally {
      setPayingNow(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading draft...</span>
    </div>
  )

  if (tgWalletGate) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px 20px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: '#F9FAFB', marginBottom: 8 }}>Connect a Wallet</h2>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 28, maxWidth: 300, lineHeight: 1.7 }}>
        Connect to receive 100% of the token supply to your wallet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
        <button onClick={() => openConnectModal?.()} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#0E0E16', border: '1px solid rgba(243,186,47,0.3)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const, width: '100%' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(243,186,47,0.1)', border: '1px solid rgba(243,186,47,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L14.5 7H9.5L12 2Z" fill="#F3BA2F"/>
  <path d="M7 5.5L9.5 7L7 9.5L4.5 7L7 5.5Z" fill="#F3BA2F"/>
  <path d="M17 5.5L19.5 7L17 9.5L14.5 7L17 5.5Z" fill="#F3BA2F"/>
  <path d="M12 7L17 9.5L19.5 12L17 14.5L12 17L7 14.5L4.5 12L7 9.5L12 7Z" fill="#F3BA2F"/>
  <path d="M7 14.5L9.5 17L7 19.5L4.5 17L7 14.5Z" fill="#F3BA2F"/>
  <path d="M17 14.5L19.5 17L17 19.5L14.5 17L17 14.5Z" fill="#F3BA2F"/>
  <path d="M12 17L14.5 19L12 22L9.5 19L12 17Z" fill="#F3BA2F"/>
</svg>
          </div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>BSC Wallet</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>MetaMask · WalletConnect · Coinbase</div>
          </div>
        </button>
        <button onClick={() => openSolModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#0E0E16', border: '1px solid rgba(153,69,255,0.3)', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const, width: '100%' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17.5H20L17 20H4L4 17.5Z" fill="url(#sol1)"/>
  <path d="M4 10.75H20L17 13.25H4L4 10.75Z" fill="url(#sol2)"/>
  <path d="M4 4H20L17 6.5H4L4 4Z" fill="url(#sol3)"/>
  <defs>
    <linearGradient id="sol1" x1="4" y1="18.75" x2="20" y2="18.75" gradientUnits="userSpaceOnUse">
      <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
    </linearGradient>
    <linearGradient id="sol2" x1="4" y1="12" x2="20" y2="12" gradientUnits="userSpaceOnUse">
      <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
    </linearGradient>
    <linearGradient id="sol3" x1="4" y1="5.25" x2="20" y2="5.25" gradientUnits="userSpaceOnUse">
      <stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/>
    </linearGradient>
  </defs>
</svg>
          </div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>Solana Wallet</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>Phantom · Solflare · Backpack · any</div>
          </div>
        </button>
      </div>
      <button onClick={() => setTgWalletGate(false)} style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#374151' }}>
        Cancel
      </button>
    </div>
  )

  if (!draft) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280' }}>Draft not found.</p>
      <button onClick={() => router.push('/dashboard')} style={{ marginTop: 16, color: '#00FF88', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>Back to feed</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 6 }}>Deploy Token</h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>One transaction. Live on-chain.</p>
      </div>

      {/* Token summary */}
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <TokenLogo url={draft.logo_url} name={draft.name} size={56} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB' }}>{draft.name}</div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#00FF88', fontWeight: 600, marginTop: 2 }}>${draft.ticker}</div>
          </div>
          <div style={{ marginLeft: 'auto', padding: '4px 10px', background: !isSolana ? 'rgba(243,186,47,0.1)' : 'rgba(153,69,255,0.1)', border: `1px solid ${!isSolana ? 'rgba(243,186,47,0.3)' : 'rgba(153,69,255,0.3)'}`, borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700, color: !isSolana ? '#F3BA2F' : '#9945FF' }}>
            {chain.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Supply',   value: Number(draft.total_supply).toLocaleString() },
            { label: 'Buy Tax',  value: `${draft.tax_buy}%` },
            { label: 'Sell Tax', value: `${draft.tax_sell}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 10px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#6B7280', letterSpacing: '0.08em', marginBottom: 2 }}>{label.toUpperCase()}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      {status !== 'idle' && status !== 'error' && (
        <div style={{ marginBottom: 20 }}><StatusIndicator status={status} /></div>
      )}

      {/* Post-deploy modal */}
      {status === 'success' && result && (
        <PostDeployModal result={result} draft={draft} chain={chain} draftId={draftId} onDismiss={() => router.push('/dashboard/tokens')} />
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* Deploy / payment gate */}
      {(status === 'idle' || status === 'error') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Solana payment gate */}
          {!paymentPaid && isSolana && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', marginBottom: 12 }}>STEP 1 — PAY DEPLOY FEE</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB', marginBottom: 14 }}>$1 in SOL</div>
              {payError && (
                <div style={{ padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 10 }}>
                  {payError}
                </div>
              )}
              {!activeSolAddress ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500', padding: '10px 14px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 8 }}>
                    No Solana wallet connected. Add one via the wallet button in the navbar.
                  </div>
                </div>
              ) : (
                <button
                  onClick={payWithSolanaWallet}
                  disabled={payingNow}
                  style={{
                    width: '100%', padding: '13px',
                    background: payingNow ? '#1E1E2E' : '#9945FF',
                    color: '#F9FAFB', border: 'none', borderRadius: 8,
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
                    cursor: payingNow ? 'not-allowed' : 'pointer',
                  }}
                >
                  {payingNow ? 'Confirm in wallet...' : 'Pay $1 in SOL'}
                </button>
              )}
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151', marginTop: 8 }}>
                Your Solana wallet will open to confirm the payment.
              </p>
            </div>
          )}

          {/* Deploy button — no "payment confirmed" banner for BSC */}
          <div style={{ opacity: paymentPaid ? 1 : 0.35, pointerEvents: paymentPaid ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            {isSolana && (
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', marginBottom: 10 }}>
                {paymentPaid ? 'STEP 2 — DEPLOY' : 'STEP 2 — DEPLOY (pay first)'}
              </div>
            )}
            <button onClick={handleDeploy} disabled={!paymentPaid} style={{
              width: '100%', padding: '14px',
              background: paymentPaid ? '#00FF88' : '#1E1E2E',
              color: paymentPaid ? '#0A0A0F' : '#374151',
              border: 'none', borderRadius: 10,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700,
              cursor: paymentPaid ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              <IconRocket size={16} color={paymentPaid ? '#0A0A0F' : '#374151'} />
              Deploy {draft.name} on {chain.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

export default function DeployPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F' }}>
      <div style={{ borderBottom: '1px solid #1E1E2E', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,15,0.9)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ width: 120 }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>1launch</span>
        <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <MultiWalletButton />
        </div>
      </div>
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span></div>}>
        <DeployPageContent />
      </Suspense>
    </div>
  )
}
