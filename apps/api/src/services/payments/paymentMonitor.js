// apps/api/src/services/payments/paymentMonitor.js

const axios = require('axios')
const { ethers } = require('ethers')
const { supabase } = require('../../lib/supabase')
const { PLANS, PAYMENT_TOKENS } = require('../../config/plans')

const PLATFORM_BSC_WALLET    = process.env.PLATFORM_WALLET_ADDRESS
const PLATFORM_SOLANA_WALLET = process.env.SOLANA_PLATFORM_WALLET_ADDRESS

// ERC20 transfer event ABI
const ERC20_TRANSFER_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]

// ── Generate a unique payment reference for a user ────────────────────────────
// We encode user_id + plan + timestamp into a short reference
// User pastes this as memo/note when paying, or we use unique amounts
function generatePaymentRef(userId, planId) {
  const ts  = Date.now().toString(36).toUpperCase()
  const uid = userId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `1L-${uid}-${planId.toUpperCase()}-${ts}`
}

// ── Calculate payment amount in crypto ───────────────────────────────────────
async function getPriceInCrypto(usdAmount, token) {
  try {
    const coinIds = { BNB: 'binancecoin', SOL: 'solana', USDT: null, USDC: null, BUSD: null }
    const coinId = coinIds[token]

    if (!coinId) {
      // Stablecoins — 1:1
      return usdAmount
    }

    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { timeout: 6000 }
    )
    const price = res.data?.[coinId]?.usd
    if (!price) return null
    return Math.ceil((usdAmount / price) * 1000) / 1000 // round up to 3 decimals
  } catch {
    return null
  }
}

// ── Create a pending payment record ──────────────────────────────────────────
async function createPaymentRecord({ userId, planId, chain, token, usdAmount }) {
  const ref          = generatePaymentRef(userId, planId)
  const cryptoAmount = await getPriceInCrypto(usdAmount, token)
  const address      = chain === 'solana' ? PLATFORM_SOLANA_WALLET : PLATFORM_BSC_WALLET

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id:         userId,
      plan_id:         planId,
      chain,
      token,
      usd_amount:      usdAmount,
      crypto_amount:   cryptoAmount,
      payment_ref:     ref,
      payment_address: address,
      status:          'pending',
      expires_at:      new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2hr to pay
      created_at:      new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return { ...data, crypto_amount: cryptoAmount, payment_address: address }
}

// ── Activate subscription after confirmed payment ─────────────────────────────
async function activateSubscription(userId, planId, paymentId, txHash) {
  const now     = new Date()
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

  // Update or create subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single()
    .catch(() => ({ data: null }))

  if (existing) {
    await supabase
      .from('subscriptions')
      .update({
        plan_id:           planId,
        status:            'active',
        started_at:        now.toISOString(),
        expires_at:        expires.toISOString(),
        last_payment_tx:   txHash,
        last_payment_id:   paymentId,
        updated_at:        now.toISOString(),
      })
      .eq('user_id', userId)
  } else {
    await supabase
      .from('subscriptions')
      .insert({
        user_id:           userId,
        plan_id:           planId,
        status:            'active',
        started_at:        now.toISOString(),
        expires_at:        expires.toISOString(),
        last_payment_tx:   txHash,
        last_payment_id:   paymentId,
        created_at:        now.toISOString(),
      })
  }

  // Mark payment as confirmed
  await supabase
    .from('payments')
    .update({ status: 'confirmed', tx_hash: txHash, confirmed_at: now.toISOString() })
    .eq('id', paymentId)

  // Send TG confirmation if user has chat_id
  try {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .eq('id', userId)
      .single()

    if (user?.telegram_chat_id) {
      const { sendNotification } = require('../telegram/telegramBot')
      const plan = PLANS[planId]
      await sendNotification(
        user.telegram_chat_id,
        `*Payment confirmed — ${plan.name} plan activated*\n\nYour subscription is active for 30 days.\nTx: \`${txHash}\``
      )
    }
  } catch {}

  console.log(`[PaymentMonitor] Subscription activated: ${userId} → ${planId}`)
}

// ── BSC: Poll BscScan for incoming payments to platform wallet ────────────────
async function scanBSCPayments() {
  if (!PLATFORM_BSC_WALLET) return

  try {
    // Get all pending BSC payments
    const { data: pending } = await supabase
      .from('payments')
      .select('*')
      .eq('chain', 'bsc')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (!pending?.length) return

    const apiKey = process.env.BSCSCAN_API_KEY || ''

    // Fetch recent BNB transactions to platform wallet
    const bnbRes = await axios.get('https://api.bscscan.com/api', {
      params: {
        module:  'account',
        action:  'txlist',
        address: PLATFORM_BSC_WALLET,
        sort:    'desc',
        page:    1,
        offset:  50,
        apikey:  apiKey,
      },
      timeout: 10000,
    })

    const txs = bnbRes.data?.result || []

    // Fetch recent ERC20 token transfers (USDT/BUSD)
    const tokenRes = await axios.get('https://api.bscscan.com/api', {
      params: {
        module:  'account',
        action:  'tokentx',
        address: PLATFORM_BSC_WALLET,
        sort:    'desc',
        page:    1,
        offset:  50,
        apikey:  apiKey,
      },
      timeout: 10000,
    })

    const tokenTxs = tokenRes.data?.result || []
    const allTxs   = [...txs, ...tokenTxs]

    for (const payment of pending) {
      // Look for a tx matching the expected amount (within 1% tolerance)
      const expectedWei = ethers.parseUnits(
        String(payment.crypto_amount || 0),
        18
      )

      for (const tx of allTxs) {
        const txValue  = BigInt(tx.value || 0)
        const diff     = txValue > expectedWei
          ? txValue - expectedWei
          : expectedWei - txValue
        const pct      = Number(diff * 100n / (expectedWei || 1n))

        // Match if within 2% of expected amount + paid to our wallet
        if (
          pct < 2 &&
          tx.to?.toLowerCase() === PLATFORM_BSC_WALLET.toLowerCase() &&
          new Date(parseInt(tx.timeStamp) * 1000) > new Date(payment.created_at)
        ) {
          await activateSubscription(payment.user_id, payment.plan_id, payment.id, tx.hash)
          break
        }
      }
    }
  } catch (err) {
    console.error('[PaymentMonitor] BSC scan error:', err.message)
  }
}

// ── Solana: Poll for incoming payments ───────────────────────────────────────
async function scanSolanaPayments() {
  if (!PLATFORM_SOLANA_WALLET) return

  try {
    const { data: pending } = await supabase
      .from('payments')
      .select('*')
      .eq('chain', 'solana')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    if (!pending?.length) return

    const endpoint = process.env.HELIUS_SOLANA_URL || 'https://api.devnet.solana.com'
    const res = await axios.post(endpoint, {
      jsonrpc: '2.0', id: 1,
      method:  'getSignaturesForAddress',
      params:  [PLATFORM_SOLANA_WALLET, { limit: 30 }],
    }, { timeout: 10000 })

    const signatures = res.data?.result || []

    for (const sig of signatures) {
      const txRes = await axios.post(endpoint, {
        jsonrpc: '2.0', id: 1,
        method:  'getTransaction',
        params:  [sig.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
      }, { timeout: 8000 })

      const tx = txRes.data?.result
      if (!tx) continue

      // Match against pending payments by amount
      const preBalances  = tx.meta?.preBalances  || []
      const postBalances = tx.meta?.postBalances || []
      const received     = (postBalances[0] || 0) - (preBalances[0] || 0)
      const receivedSol  = received / 1e9

      for (const payment of pending) {
        if (payment.token !== 'SOL') continue
        const expected = payment.crypto_amount || 0
        const diff     = Math.abs(receivedSol - expected)
        const pct      = (diff / expected) * 100

        if (pct < 2 && new Date(tx.blockTime * 1000) > new Date(payment.created_at)) {
          await activateSubscription(payment.user_id, payment.plan_id, payment.id, sig.signature)
          break
        }
      }
    }
  } catch (err) {
    console.error('[PaymentMonitor] Solana scan error:', err.message)
  }
}

// ── Main scan function (called by cron every 2 minutes) ───────────────────────
async function scanAllPayments() {
  await Promise.all([scanBSCPayments(), scanSolanaPayments()])
}

module.exports = {
  createPaymentRecord,
  activateSubscription,
  scanAllPayments,
  getPriceInCrypto,
  generatePaymentRef,
}
