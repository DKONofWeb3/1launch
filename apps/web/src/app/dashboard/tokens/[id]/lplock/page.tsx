// apps/web/src/app/dashboard/tokens/[id]/lplock/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, getContract, parseUnits } from 'viem'
import { api } from '@/lib/api'

const UNICRYPT_ABI = [
  {
    name: 'lockLPToken',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'lpToken',    type: 'address' },
      { name: 'amount',     type: 'uint256' },
      { name: 'unlockDate', type: 'uint256' },
      { name: 'referral',   type: 'address' },
      { name: 'feeInEth',   type: 'bool' },
      { name: 'withdrawer', type: 'address' },
    ],
    outputs: [],
  },
] as const

const LP_TOKEN_ABI = [
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                        outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],   outputs: [{ type: 'uint256' }] },
] as const

const LOCK_DURATIONS = [
  { label: '30 days',   days: 30,   recommended: false },
  { label: '3 months',  days: 90,   recommended: false },
  { label: '6 months',  days: 180,  recommended: true  },
  { label: '1 year',    days: 365,  recommended: false },
  { label: '2 years',   days: 730,  recommended: false },
]

type LockStep = 'info' | 'configure' | 'approve' | 'lock' | 'success'

function InfoRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0A0A0F' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'IBM Plex Mono, monospace' : 'Syne, sans-serif', fontSize: 11, fontWeight: 600, color: '#F9FAFB' }}>{value}</span>
    </div>
  )
}

export default function LPLockPage() {
  const params = useParams()
  const router = useRouter()
  const { address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [token, setToken] = useState<any>(null)
  const [lockInfo, setLockInfo] = useState<any>(null)
  const [existingLocks, setExistingLocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<LockStep>('info')
  const [selectedDuration, setSelectedDuration] = useState(180)
  const [lockPercent, setLockPercent] = useState(100)
  const [working, setWorking] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    api.get(`/api/launched-tokens/${params.id}`)
      .then(res => { if (res.data.success) setToken(res.data.data) })

    api.get(`/api/lplock/${params.id}/locks`)
      .then(res => { if (res.data.success) setExistingLocks(res.data.data) })
  }, [params.id])

  useEffect(() => {
    if (!token) return
    const wallet = walletAddress || ''
    api.get(`/api/lplock/${params.id}/info?wallet=${wallet}`)
      .then(res => {
        if (res.data.success) setLockInfo(res.data.data)
      })
      .finally(() => setLoading(false))
  }, [token, walletAddress])

  async function handleLock() {
    if (!walletClient || !publicClient || !lockInfo?.lp_pair) return
    setWorking(true)
    setError(null)

    try {
      const lpAddress  = lockInfo.lp_pair as `0x${string}`
      const locker     = lockInfo.locker_address as `0x${string}`
      const balance    = BigInt(lockInfo.lp_balance?.balance || '0')
      const amount     = balance * BigInt(lockPercent) / 100n
      const unlockDate = BigInt(Math.floor(Date.now() / 1000) + selectedDuration * 86400)

      if (amount === 0n) {
        throw new Error('No LP tokens to lock. Add liquidity first.')
      }

      // Step 1: Approve
      setStep('approve')
      setStatusMsg('Approving LP tokens...')

      const approveTx = await walletClient.writeContract({
        address: lpAddress,
        abi: LP_TOKEN_ABI,
        functionName: 'approve',
        args: [locker, amount],
      })

      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      setStatusMsg('Approval confirmed. Locking...')

      // Step 2: Lock
      setStep('lock')
      setStatusMsg('Sending lock transaction...')

      // Unicrypt charges ~0.001 BNB fee for locking
      const lockTx = await walletClient.writeContract({
        address: locker,
        abi: UNICRYPT_ABI,
        functionName: 'lockLPToken',
        args: [
          lpAddress,
          amount,
          unlockDate,
          '0x0000000000000000000000000000000000000000', // no referral
          true,  // pay fee in ETH/BNB
          walletAddress as `0x${string}`,
        ],
        value: parseEther('0.001'), // Unicrypt fee
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash: lockTx })
      setTxHash(lockTx)
      setStatusMsg('Lock confirmed.')

      // Record in our DB
      await api.post(`/api/lplock/${params.id}/record`, {
        lp_token_address: lpAddress,
        amount:           amount.toString(),
        unlock_date:      Number(unlockDate),
        tx_hash:          lockTx,
        wallet_address:   walletAddress,
      })

      setStep('success')
    } catch (err: any) {
      setError(err.message?.slice(0, 150) || 'Transaction failed')
      setStep('configure')
    } finally {
      setWorking(false)
      setStatusMsg('')
    }
  }

  const draft = token?.token_drafts
  const unlockDate = new Date(Date.now() + selectedDuration * 86400 * 1000)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#6B7280', fontSize: 12 }}>Loading...</span>
    </div>
  )

  return (
    <div className="dashboard-layout">
      <button
        onClick={() => router.back()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 8 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Back to token
      </button>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">LP Lock</h1>
          <p className="page-subtitle">Lock liquidity for {draft?.name} (${draft?.ticker}) via Unicrypt</p>
        </div>
        {lockInfo?.unicrypt_url && (
          <a
            href={lockInfo.unicrypt_url}
            target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,149,0,0.08)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600, color: '#FF9500', textDecoration: 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="#FF9500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            View on Unicrypt
          </a>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 20, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.2)', borderRadius: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* BSC not supported */}
      {lockInfo && !lockInfo.supported && (
        <div style={{ padding: '20px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 12, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#FF9500' }}>
          {lockInfo.message}
        </div>
      )}

      {/* No pair found */}
      {lockInfo?.supported && !lockInfo.lp_pair && (
        <div style={{ padding: '20px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)', borderRadius: 12 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: '#FF9500', marginBottom: 8 }}>No liquidity pair found</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280' }}>
            Add liquidity on PancakeSwap first, then come back to lock it.
          </div>
        </div>
      )}

      {/* Success state */}
      {step === 'success' && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px' }}>
            <circle cx="12" cy="12" r="10" stroke="#00FF88" strokeWidth="1.5"/>
            <path d="M8 12l3 3 5-5" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#00FF88', marginBottom: 8 }}>Liquidity Locked</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
            {lockPercent}% of LP tokens locked until {unlockDate.toLocaleDateString()}
          </div>
          {txHash && (
            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 6, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: '#00FF88', textDecoration: 'none' }}
            >
              View Transaction
            </a>
          )}
        </div>
      )}

      {/* Main flow */}
      {lockInfo?.supported && lockInfo.lp_pair && step !== 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* LP Info card */}
          <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>LP Pair Info</div>
            <InfoRow label="LP Pair Address" value={`${lockInfo.lp_pair.slice(0, 10)}...${lockInfo.lp_pair.slice(-8)}`} />
            <InfoRow label="Platform" value="Unicrypt V2" />
            {lockInfo.lp_balance && (
              <>
                <InfoRow label="Your LP Balance" value={`${parseFloat(lockInfo.lp_balance.balanceFormatted).toFixed(8)} LP`} />
                <InfoRow label="Pool Share" value={`${lockInfo.lp_balance.percentage.toFixed(2)}%`} />
              </>
            )}
            {!walletAddress && (
              <div style={{ padding: '10px 12px', background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.15)', borderRadius: 6, marginTop: 10, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#FF9500' }}>
                Connect wallet to see your LP balance
              </div>
            )}
          </div>

          {/* Lock configuration */}
          {(step === 'info' || step === 'configure') && walletAddress && (
            <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>Configure Lock</div>

              {/* Duration selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280', marginBottom: 10 }}>Lock Duration</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {LOCK_DURATIONS.map(d => (
                    <button
                      key={d.days}
                      onClick={() => setSelectedDuration(d.days)}
                      style={{
                        padding: '8px 14px', cursor: 'pointer', position: 'relative',
                        background: selectedDuration === d.days ? 'rgba(0,255,136,0.1)' : '#0A0A0F',
                        border: `1px solid ${selectedDuration === d.days ? 'rgba(0,255,136,0.4)' : '#1E1E2E'}`,
                        borderRadius: 6,
                        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 600,
                        color: selectedDuration === d.days ? '#00FF88' : '#6B7280',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                      {d.recommended && (
                        <span style={{ position: 'absolute', top: -8, right: -4, padding: '1px 5px', background: '#00FF88', borderRadius: 3, fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, fontWeight: 700, color: '#0A0A0F' }}>REC</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Percentage selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>Amount to Lock</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00FF88' }}>{lockPercent}%</span>
                </div>
                <input
                  type="range" min="1" max="100" value={lockPercent}
                  onChange={e => setLockPercent(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#00FF88', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#374151' }}>1%</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#374151' }}>100%</span>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, marginBottom: 16 }}>
                <InfoRow label="Lock until" value={unlockDate.toLocaleDateString()} />
                <InfoRow label="Amount" value={`${lockPercent}% of LP tokens`} />
                <InfoRow label="Platform fee" value="~0.001 BNB" />
                <InfoRow label="Withdrawable after" value={`${selectedDuration} days`} />
              </div>

              {/* Trust signal note */}
              <div style={{ padding: '10px 14px', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 6, marginBottom: 16, fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#4B5563' }}>
                Locked via Unicrypt — publicly verifiable on BscScan. Buyers can see this lock which builds trust and reduces rug risk signals.
              </div>

              <button
                onClick={handleLock}
                disabled={working || !lockInfo.lp_balance?.balance}
                style={{
                  width: '100%', padding: '12px 0',
                  background: working ? '#1E1E2E' : '#00FF88',
                  color: working ? '#4B5563' : '#0A0A0F',
                  border: 'none', borderRadius: 8,
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700,
                  cursor: working ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {working ? statusMsg || 'Processing...' : 'Lock Liquidity'}
              </button>
            </div>
          )}

          {/* Tx in progress */}
          {(step === 'approve' || step === 'lock') && (
            <div style={{ background: '#0E0E16', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: '28px', textAlign: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}>
                <circle cx="16" cy="16" r="12" stroke="#1E1E2E" strokeWidth="3" fill="none"/>
                <path d="M16 4a12 12 0 0 1 12 12" stroke="#00FF88" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </svg>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}>
                {step === 'approve' ? 'Step 1/2 — Approving' : 'Step 2/2 — Locking'}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#6B7280' }}>{statusMsg}</div>
            </div>
          )}
        </div>
      )}

      {/* Existing locks */}
      {existingLocks.length > 0 && (
        <div style={{ background: '#0E0E16', border: '1px solid #1E1E2E', borderRadius: 12, padding: '18px 20px', marginTop: 20 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
            Existing Locks ({existingLocks.length})
          </div>
          {existingLocks.map((lock, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '10px 0', borderBottom: i < existingLocks.length - 1 ? '1px solid #0A0A0F' : 'none' }}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 2 }}>LOCKED</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#F9FAFB', fontWeight: 600 }}>
                  {new Date(lock.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 2 }}>UNLOCKS</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', fontWeight: 600 }}>
                  {new Date(lock.unlock_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#4B5563', marginBottom: 2 }}>TX</div>
                <a
                  href={`https://bscscan.com/tx/${lock.tx_hash}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00FF88', textDecoration: 'none' }}
                >
                  {lock.tx_hash?.slice(0, 10)}...
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
