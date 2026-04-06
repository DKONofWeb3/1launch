'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { parseEther, getContract } from 'viem'
import {
  Connection, Transaction, SystemProgram, Keypair,
  sendAndConfirmTransaction, PublicKey,
} from '@solana/web3.js'
import { api } from '@/lib/api'
import { TokenLogo } from '@/components/launch/TokenLogo'
import { IconRocket, IconChevronRight, IconTrendingUp, IconSignal } from '@/components/ui/Icons'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// ── Types ─────────────────────────────────────────────────────────────────────

type DeployStatus =
  | 'idle'
  | 'waiting_wallet'
  | 'pending'
  | 'confirming'
  | 'success'
  | 'error'

interface DeployResult {
  contractAddress: string
  txHash: string
  explorerUrl: string
  txUrl: string
}

// Factory ABI — only what we need
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

// ── Status display component ──────────────────────────────────────────────────

function StatusIndicator({ status, result }: { status: DeployStatus; result: DeployResult | null }) {
  const steps = [
    { key: 'waiting_wallet', label: 'Approve in wallet' },
    { key: 'pending',        label: 'Tx broadcasting' },
    { key: 'confirming',     label: 'Awaiting confirmations' },
    { key: 'success',        label: 'Live on-chain' },
  ]

  const currentIndex = steps.findIndex((s) => s.key === status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => {
        const done    = i < currentIndex || status === 'success'
        const active  = step.key === status
        const pending = i > currentIndex && status !== 'success'

        return (
          <div key={step.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            background: active ? 'rgba(0,255,136,0.06)' : done ? 'rgba(0,255,136,0.03)' : '#0A0A0F',
            border: `1px solid ${active ? 'rgba(0,255,136,0.3)' : done ? 'rgba(0,255,136,0.12)' : '#1E1E2E'}`,
            borderRadius: 8, transition: 'all 0.3s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: done ? '#00FF88' : active ? 'transparent' : '#1E1E2E',
              border: `1.5px solid ${done ? '#00FF88' : active ? '#00FF88' : '#2A2A3E'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="#0A0A0F" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : active ? (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  border: '1.5px solid #00FF88', borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : null}
            </div>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12,
              color: done ? '#00FF88' : active ? '#F9FAFB' : '#374151',
              fontWeight: active || done ? 600 : 400,
            }}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── BSC Deploy ────────────────────────────────────────────────────────────────

function useBSCDeploy() {
  const { address }     = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient    = usePublicClient()

  async function deploy(draft: any, factoryAddress: string): Promise<DeployResult> {
    if (!address || !walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    // Get the deploy fee from the factory contract
    const deployFee = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'deployFee',
    }) as bigint

    // Send the createToken transaction — user signs this in MetaMask
    const txHash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'createToken',
      args: [
        draft.name,
        draft.ticker,
        BigInt(draft.total_supply),
        address,
      ],
      value: deployFee,
    })

    // Wait for confirmations
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 2,
    })

    // Find TokenCreated event to get the token address
    let tokenAddress = ''
    for (const log of receipt.logs) {
      if (log.topics[0] === '0x' + 'TokenCreated'.padStart(64, '0')) {
        tokenAddress = '0x' + (log.topics[1] || '').slice(26)
        break
      }
    }

    // If event parsing failed, use a fallback
    if (!tokenAddress && receipt.contractAddress) {
      tokenAddress = receipt.contractAddress
    }

    return {
      contractAddress: tokenAddress || receipt.transactionHash,
      txHash,
      explorerUrl: `https://bscscan.com/token/${tokenAddress}`,
      txUrl: `https://bscscan.com/tx/${txHash}`,
    }
  }

  return { deploy, address }
}

// ── Main Deploy Page ──────────────────────────────────────────────────────────

function DeployPageContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const draftId      = searchParams.get('draft')
  const chain        = searchParams.get('chain') || 'bsc'

  const [draft,   setDraft]   = useState<any>(null)
  const [config,  setConfig]  = useState<any>(null)
  const [status,  setStatus]  = useState<DeployStatus>('idle')
  const [result,  setResult]  = useState<DeployResult | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { deploy: deployBSC, address: bscAddress } = useBSCDeploy()

  // Load draft + chain config
  useEffect(() => {
    if (!draftId) return
    Promise.all([
      api.get(`/api/tokens/draft/${draftId}`),
      api.get(`/api/deploy/config/${chain}`),
    ]).then(([draftRes, configRes]) => {
      if (draftRes.data.success) setDraft(draftRes.data.data)
      if (configRes.data.success) setConfig(configRes.data.data)
    }).finally(() => setLoading(false))
  }, [draftId, chain])

  async function handleDeploy() {
    setError(null)
    setStatus('waiting_wallet')

    try {
      let deployResult: DeployResult

      if (chain === 'bsc') {
        // Use server-side deploy if no wallet connected or no factory address
        if (!config?.factoryAddress || !bscAddress) {
          setStatus('pending')
          const res = await api.post('/api/deploy/server-side', {
            draft_id: draftId,
            chain: 'bsc',
            network: 'mainnet',
          })
          if (!res.data.success) throw new Error(res.data.error)
          setStatus('success')
          setResult({
            contractAddress: res.data.data.contract_address,
            txHash: res.data.data.tx_hash,
            explorerUrl: res.data.data.explorerUrl || '#',
            txUrl: res.data.data.txUrl || '#',
          })
          return
        }

        setStatus('waiting_wallet')
        deployResult = await deployBSC(draft, config.factoryAddress)
      } else {
        throw new Error('Solana frontend deploy coming in next update — use BSC for now')
      }

      setStatus('confirming')

      // Record the deployment in our DB
      await api.post('/api/deploy/record', {
        draft_id:         draftId,
        contract_address: deployResult.contractAddress,
        chain,
        tx_hash:          deployResult.txHash,
        wallet_address:   bscAddress || '',
      })

      setStatus('success')
      setResult(deployResult)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || 'Deploy failed')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>
          Loading draft...
        </span>
      </div>
    )
  }

  if (!draft) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280' }}>Draft not found.</p>
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: 16, color: '#00FF88', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Deploy Token
        </h1>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
          One transaction. Live on-chain.
        </p>
      </div>

      {/* Token summary */}
      <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <TokenLogo url={draft.logo_url} name={draft.name} size={56} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: '#F9FAFB' }}>
              {draft.name}
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: '#00FF88', fontWeight: 600, marginTop: 2 }}>
              ${draft.ticker}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', padding: '4px 10px',
            background: chain === 'bsc' ? 'rgba(243,186,47,0.1)' : 'rgba(153,69,255,0.1)',
            border: `1px solid ${chain === 'bsc' ? 'rgba(243,186,47,0.3)' : 'rgba(153,69,255,0.3)'}`,
            borderRadius: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
            color: chain === 'bsc' ? '#F3BA2F' : '#9945FF',
          }}>
            {chain.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Supply', value: Number(draft.total_supply).toLocaleString() },
            { label: 'Buy Tax', value: `${draft.tax_buy}%` },
            { label: 'Sell Tax', value: `${draft.tax_sell}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: '8px 10px', background: '#0A0A0F',
              border: '1px solid #1E1E2E', borderRadius: 6,
            }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#6B7280', letterSpacing: '0.08em', marginBottom: 2 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status steps */}
      {status !== 'idle' && status !== 'error' && (
        <div style={{ marginBottom: 20 }}>
          <StatusIndicator status={status} result={result} />
        </div>
      )}

      {/* Success state */}
      {status === 'success' && result && (
        <div style={{
          background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 12, padding: '20px', marginBottom: 20,
        }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, color: '#00FF88', marginBottom: 12 }}>
            Token is live.
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
            CONTRACT ADDRESS
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#F9FAFB',
            wordBreak: 'break-all', marginBottom: 14,
          }}>
            {result.contractAddress}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', background: '#00FF88', color: '#0A0A0F',
                border: 'none', borderRadius: 6,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <IconTrendingUp size={13} color="#0A0A0F" />
              View Token
            </a>
            <a
              href={result.txUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', background: 'transparent', color: '#9CA3AF',
                border: '1px solid #1E1E2E', borderRadius: 6,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                textDecoration: 'none',
              }}
            >
              View Tx
            </a>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', background: 'transparent', color: '#9CA3AF',
                border: '1px solid #1E1E2E', borderRadius: 6,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', marginBottom: 20,
          background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)',
          borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B',
        }}>
          {error}
        </div>
      )}

      {/* Deploy button */}
      {status === 'idle' || status === 'error' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleDeploy}
            style={{
              width: '100%', padding: '14px',
              background: '#00FF88', color: '#0A0A0F',
              border: 'none', borderRadius: 10,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,255,136,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <IconRocket size={16} color="#0A0A0F" />
            Deploy {draft.name} on {chain.toUpperCase()}
          </button>

          <p style={{
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
            color: '#374151', textAlign: 'center', lineHeight: 1.6,
          }}>
            This will open your wallet to sign the transaction.
            {chain === 'bsc' && ' Deploy fee: ~0.025 BNB + gas.'}
            {chain === 'solana' && ' Deploy fee: ~0.01 SOL + tx fees.'}
          </p>
        </div>
      ) : null}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function DeployPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F' }}>
      {/* Minimal top bar */}
      <div style={{
        borderBottom: '1px solid #1E1E2E', padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,10,15,0.9)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ width: 120 }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color: '#F9FAFB' }}>
          1launch
        </span>
        <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <ConnectButton showBalance={false} accountStatus="avatar" chainStatus="icon" />
        </div>
      </div>

      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
        </div>
      }>
        <DeployPageContent />
      </Suspense>
    </div>
  )
}
