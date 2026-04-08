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

// ── Post-deploy modal ────────────────────────────────────────────────────────
function PostDeployModal({
  result, draft, chain, onDismiss,
}: {
  result: DeployResult
  draft: any
  chain: string
  onDismiss: () => void
}) {
  const [copied, setCopied]           = useState(false)
  const [volTier, setVolTier]         = useState<string | null>(null)
  const [volLoading, setVolLoading]   = useState(false)
  const [volDone, setVolDone]         = useState(false)
  const [tweetCopied, setTweetCopied] = useState(false)

  const tiers = [
    { id: 'starter', label: 'Starter', price: '$29', wallets: '3 wallets' },
    { id: 'growth',  label: 'Growth',  price: '$79', wallets: '10 wallets', popular: true },
    { id: 'pro',     label: 'Pro',     price: '$149', wallets: '25 wallets' },
  ]

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

  async function activateVolBot() {
    if (!volTier) return
    setVolLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1200))
      setVolDone(true)
    } catch {}
    finally { setVolLoading(false) }
  }

  return (
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(0,255,136,0.08)',
            border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: 20,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
            color: '#00FF88',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', animation: 'pulse 1.5s infinite' }} />
            Token is live on {chain.toUpperCase()}
          </div>
        </div>

        {/* Contract address */}
        <div style={{
          background: '#0E0E16', border: '1px solid #1E1E2E',
          borderRadius: 12, padding: '16px 18px',
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 8 }}>
            CONTRACT ADDRESS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              color: '#F9FAFB', wordBreak: 'break-all',
            }}>
              {result.contractAddress}
            </div>
            <button onClick={copyAddress} style={{
              padding: '6px 12px', flexShrink: 0,
              background: copied ? 'rgba(0,255,136,0.1)' : 'transparent',
              border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
              borderRadius: 6, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
              color: copied ? '#00FF88' : '#6B7280',
            }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <a href={result.explorerUrl} target="_blank" rel="noreferrer" style={{
              flex: 1, padding: '8px 0', textAlign: 'center',
              background: '#00FF88', border: 'none', borderRadius: 7,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
              color: '#0A0A0F', textDecoration: 'none',
            }}>
              View on Explorer
            </a>
            <a href={result.txUrl} target="_blank" rel="noreferrer" style={{
              flex: 1, padding: '8px 0', textAlign: 'center',
              background: 'transparent', border: '1px solid #1E1E2E', borderRadius: 7,
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
              color: '#6B7280', textDecoration: 'none',
            }}>
              View Tx
            </a>
          </div>
        </div>

        {/* Free actions */}
        <div style={{
          background: '#0E0E16', border: '1px solid #1E1E2E',
          borderRadius: 12, padding: '16px 18px',
        }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 14 }}>
            SET IT UP FOR ATTENTION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Setup Telegram', sub: 'Start building community', href: '#' },
              { label: 'Auto Audit Scan', sub: 'Builds buyer trust instantly', href: '#' },
            ].map(action => (
              <a key={action.label} href={action.href} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#0A0A0F', border: '1px solid #1E1E2E',
                borderRadius: 8, textDecoration: 'none',
              }}>
                <div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 2 }}>
                    {action.label}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>
                    {action.sub}
                  </div>
                </div>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', fontWeight: 700 }}>
                  free
                </span>
              </a>
            ))}
            {/* Share on X */}
            <button onClick={copyTweet} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              background: tweetCopied ? 'rgba(0,255,136,0.04)' : '#0A0A0F',
              border: `1px solid ${tweetCopied ? 'rgba(0,255,136,0.2)' : '#1E1E2E'}`,
              borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
            }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#F9FAFB', marginBottom: 2 }}>
                  {tweetCopied ? 'Tweet copied to clipboard' : 'Share on X'}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563' }}>
                  Pre-written launch tweet ready to post
                </div>
              </div>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00FF88', fontWeight: 700 }}>
                free
              </span>
            </button>
          </div>
        </div>

        {/* Volume bot upsell */}
        {!volDone ? (
          <div style={{
            background: '#0E0E16',
            border: '1px solid #2A2A3E',
            borderRadius: 12, padding: '18px 18px',
          }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.12em', marginBottom: 6 }}>
              PAID BOOST
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 900, color: '#F9FAFB', marginBottom: 6 }}>
              Don't let your chart go quiet.
            </div>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', lineHeight: 1.7, marginBottom: 4 }}>
              Volume Bot simulates real trading activity so your token doesn't look dead at launch.
            </p>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#374151', marginBottom: 16 }}>
              First 5 minutes matter most. Runs automatically. No setup needed.
            </p>

            {/* Tiers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {tiers.map(t => (
                <button key={t.id} onClick={() => setVolTier(t.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px',
                  background: volTier === t.id ? 'rgba(0,255,136,0.06)' : '#0A0A0F',
                  border: `1.5px solid ${volTier === t.id ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`,
                  borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${volTier === t.id ? '#00FF88' : '#2A2A3E'}`,
                      background: volTier === t.id ? '#00FF88' : 'transparent',
                      transition: 'all 0.15s',
                    }} />
                    <div>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#F9FAFB' }}>
                        {t.label}
                      </span>
                      {t.popular && (
                        <span style={{ marginLeft: 8, padding: '1px 6px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#00FF88', fontWeight: 700 }}>
                          most used
                        </span>
                      )}
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', marginTop: 1 }}>
                        {t.wallets}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#F9FAFB' }}>
                    {t.price}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={activateVolBot}
                disabled={!volTier || volLoading}
                style={{
                  flex: 2, padding: '12px 0',
                  background: volTier && !volLoading ? '#00FF88' : '#1E1E2E',
                  border: 'none', borderRadius: 8,
                  cursor: volTier && !volLoading ? 'pointer' : 'not-allowed',
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
                  color: volTier && !volLoading ? '#0A0A0F' : '#374151',
                  transition: 'all 0.15s',
                }}
              >
                {volLoading ? 'Activating...' : 'Boost My Token'}
              </button>
              <button onClick={onDismiss} style={{
                flex: 1, padding: '12px 0',
                background: 'transparent', border: '1px solid #1E1E2E',
                borderRadius: 8, cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#4B5563',
              }}>
                Skip for now
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '16px 18px',
            background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 900, color: '#00FF88', marginBottom: 4 }}>
              Volume Bot activated.
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>
              Trading activity will start within 2 minutes.
            </div>
            <button onClick={onDismiss} style={{
              marginTop: 14, padding: '10px 24px',
              background: 'transparent', border: '1px solid #1E1E2E',
              borderRadius: 8, cursor: 'pointer',
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280',
            }}>
              Go to My Tokens
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

function DeployPageContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const draftId      = searchParams.get('draft')
  const chainParam   = searchParams.get('chain') || 'bsc'
  const isSolana      = chainParam === 'solana'
  const chain         = chainParam

  const [draft,          setDraft]          = useState<any>(null)
  const [config,         setConfig]         = useState<any>(null)
  const [status,         setStatus]         = useState<DeployStatus>('idle')
  const [result,         setResult]         = useState<DeployResult | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [paymentPaid,    setPaymentPaid]    = useState(false) // will be set true immediately for BSC
  const [paymentData,    setPaymentData]    = useState<any>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError,   setPaymentError]   = useState<string | null>(null)
  const [copied,         setCopied]         = useState(false)

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

      if (!isSolana) {
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

  const deployFeeUSD = !isSolana ? 15 : 6

  async function initiatePayment() {
    if (!bscAddress && !chain) return
    setPaymentLoading(true)
    setPaymentError(null)
    try {
      const res = await api.post('/api/subscriptions/initiate', {
        plan_id: 'deploy_fee',
        chain:   isSolana ? 'solana' : 'bsc',
        token:   isSolana ? 'SOL' : 'BNB',
        wallet:  bscAddress || 'tg_user',
      })
      if (res.data.success) {
        setPaymentData(res.data.data)
      } else {
        setPaymentError(res.data.error || 'Failed to generate payment address')
      }
    } catch (err: any) {
      setPaymentError(err.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  function copyAddress() {
    if (!paymentData?.payment_address) return
    navigator.clipboard.writeText(paymentData.payment_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // BSC — no off-chain payment gate needed, factory handles fees on-chain
  useEffect(() => {
    if (!isSolana) setPaymentPaid(true)
  }, [chain])

  // Poll for payment confirmation
  useEffect(() => {
    if (!paymentData?.id || paymentPaid) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/subscriptions/payment-status/${paymentData.id}`)
        if (res.data.data?.status === 'confirmed') {
          setPaymentPaid(true)
          clearInterval(interval)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [paymentData?.id, paymentPaid])

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
            background: !isSolana ? 'rgba(243,186,47,0.1)' : 'rgba(153,69,255,0.1)',
            border: `1px solid ${!isSolana ? 'rgba(243,186,47,0.3)' : 'rgba(153,69,255,0.3)'}`,
            borderRadius: 6,
            fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
            color: !isSolana ? '#F3BA2F' : '#9945FF',
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

      {/* Post-deploy modal */}
      {status === 'success' && result && (
        <PostDeployModal
          result={result}
          draft={draft}
          chain={chain}
          onDismiss={() => router.push('/dashboard/tokens')}
        />
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

      {/* Payment gate + deploy */}
      {(status === 'idle' || status === 'error') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Step 1 — Pay deploy fee (Solana only — BSC factory handles fees on-chain) */}
          {!paymentPaid && isSolana && (
            <div style={{
              background: '#0E0E16', border: '1px solid #1E1E2E',
              borderRadius: 12, padding: '18px 20px',
            }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', marginBottom: 12 }}>
                STEP 1 — PAY DEPLOY FEE
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#F9FAFB' }}>
                  ${deployFeeUSD}
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: !isSolana ? 'rgba(243,186,47,0.1)' : 'rgba(153,69,255,0.1)',
                  border: `1px solid ${!isSolana ? 'rgba(243,186,47,0.3)' : 'rgba(153,69,255,0.3)'}`,
                  borderRadius: 6,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 700,
                  color: !isSolana ? '#F3BA2F' : '#9945FF',
                }}>
                  Pay with {!isSolana ? 'BNB' : 'SOL'}
                </div>
              </div>

              {!paymentData ? (
                <>
                  {paymentError && (
                    <div style={{ padding: '8px 12px', background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF6B6B', marginBottom: 10 }}>
                      {paymentError}
                    </div>
                  )}
                  <button
                    onClick={initiatePayment}
                    disabled={paymentLoading}
                    style={{
                      width: '100%', padding: '11px',
                      background: paymentLoading ? '#1E1E2E' : '#00FF88',
                      color: '#0A0A0F', border: 'none', borderRadius: 8,
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700,
                      cursor: paymentLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {paymentLoading ? 'Generating payment...' : 'Generate Payment Address'}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em' }}>SEND EXACTLY</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 900, color: '#00FF88' }}>
                    {paymentData.crypto_amount} {!isSolana ? 'BNB' : 'SOL'}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', letterSpacing: '0.1em', marginTop: 4 }}>TO ADDRESS</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#9CA3AF', wordBreak: 'break-all', padding: '8px 10px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 6 }}>
                      {paymentData.payment_address}
                    </div>
                    <button onClick={copyAddress} style={{ padding: '8px 12px', background: copied ? 'rgba(0,255,136,0.1)' : 'transparent', border: `1px solid ${copied ? 'rgba(0,255,136,0.3)' : '#1E1E2E'}`, borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: copied ? '#00FF88' : '#6B7280', cursor: 'pointer', flexShrink: 0 }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', lineHeight: 1.6 }}>
                    Send the exact amount above. We detect payment automatically within 2 minutes.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', animation: 'pulse 1.5s infinite' }} />
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280' }}>Listening for payment...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Deploy (unlocked after payment) */}
          <div style={{ opacity: paymentPaid ? 1 : 0.35, pointerEvents: paymentPaid ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            {paymentPaid && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, marginBottom: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
                  Payment confirmed — deploy unlocked
                </span>
              </div>
            )}

            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', marginBottom: 10 }}>
              {isSolana ? (paymentPaid ? 'STEP 2 — DEPLOY' : 'STEP 2 — DEPLOY (pay first)') : 'DEPLOY'}
            </div>

            <button
              onClick={handleDeploy}
              disabled={!paymentPaid}
              style={{
                width: '100%', padding: '14px',
                background: paymentPaid ? '#00FF88' : '#1E1E2E',
                color: paymentPaid ? '#0A0A0F' : '#374151',
                border: 'none', borderRadius: 10,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, fontWeight: 700,
                cursor: paymentPaid ? 'pointer' : 'not-allowed', letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <IconRocket size={16} color={paymentPaid ? '#0A0A0F' : '#374151'} />
              Deploy {draft.name} on {chain.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

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