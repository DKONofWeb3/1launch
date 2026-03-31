// apps/api/src/services/bot/solanaBotExecutor.js

const { Connection, Keypair, PublicKey, VersionedTransaction, clusterApiUrl } = require('@solana/web3.js')
const axios = require('axios')
const { randomTradeAmountUSD, pickRandomWallet } = require('./botConfig')

// ── Jupiter API (handles routing across Raydium, Orca, etc.) ─────────────────
const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote'
const JUPITER_SWAP_URL  = 'https://quote-api.jup.ag/v6/swap'
const SOL_MINT          = 'So11111111111111111111111111111111111111112' // Wrapped SOL

// ── Get SOL price in USD ──────────────────────────────────────────────────────
let cachedSolPrice = 150
let lastPriceFetch = 0

async function getSolPrice() {
  if (Date.now() - lastPriceFetch < 5 * 60 * 1000) return cachedSolPrice
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { timeout: 5000 })
    cachedSolPrice = res.data?.solana?.usd || 150
    lastPriceFetch = Date.now()
  } catch {}
  return cachedSolPrice
}

// ── Decode wallet from stored private key ─────────────────────────────────────
function getKeypair(privateKeyStr) {
  try {
    const parsed = JSON.parse(privateKeyStr)
    return Keypair.fromSecretKey(Uint8Array.from(parsed))
  } catch {
    const bs58 = require('bs58')
    const decoder = bs58.default?.decode ?? bs58.decode
    return Keypair.fromSecretKey(decoder(privateKeyStr))
  }
}

// ── Execute one Jupiter swap ───────────────────────────────────────────────────
async function executeSwap({ wallet, tokenMint, amountUSD, isBuy, network = 'devnet' }) {
  const result = { success: false, txHash: null, type: isBuy ? 'buy' : 'sell', amountUSD }

  try {
    const endpoint   = network === 'mainnet'
      ? (process.env.HELIUS_SOLANA_URL || clusterApiUrl('mainnet-beta'))
      : clusterApiUrl('devnet')
    const connection = new Connection(endpoint, 'confirmed')
    const keypair    = getKeypair(wallet.private_key)

    const solPrice   = await getSolPrice()
    const lamports   = Math.floor((amountUSD / solPrice) * 1e9)

    // ── Build Jupiter quote ────────────────────────────────────────────────
    const inputMint  = isBuy ? SOL_MINT : tokenMint
    const outputMint = isBuy ? tokenMint : SOL_MINT
    const amount     = isBuy ? lamports : await getTokenBalance(connection, keypair.publicKey, tokenMint)

    if (!amount || amount === 0) {
      return { ...result, error: isBuy ? 'insufficient_sol' : 'no_tokens' }
    }

    const quoteRes = await axios.get(JUPITER_QUOTE_URL, {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps: 500, // 5% slippage
        onlyDirectRoutes: false,
      },
      timeout: 10000,
    })

    const quote = quoteRes.data
    if (!quote?.routePlan?.length) {
      return { ...result, error: 'no_route_found' }
    }

    // ── Build swap transaction ─────────────────────────────────────────────
    const swapRes = await axios.post(JUPITER_SWAP_URL, {
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }, { timeout: 10000 })

    const { swapTransaction } = swapRes.data

    // Deserialize and sign
    const txBuf = Buffer.from(swapTransaction, 'base64')
    const tx    = VersionedTransaction.deserialize(txBuf)
    tx.sign([keypair])

    // Send
    const rawTx = tx.serialize()
    const sig   = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 3,
    })

    await connection.confirmTransaction(sig, 'confirmed')

    result.txHash  = sig
    result.success = true
  } catch (err) {
    result.error = err.message?.slice(0, 100)
    console.error(`[SolanaBot] Swap failed (${isBuy ? 'buy' : 'sell'}):`, err.message?.slice(0, 80))
  }

  return result
}

async function getTokenBalance(connection, owner, mint) {
  try {
    const { getAssociatedTokenAddress } = require('@solana/spl-token')
    const ata = await getAssociatedTokenAddress(new PublicKey(mint), owner)
    const info = await connection.getTokenAccountBalance(ata)
    return parseInt(info.value.amount)
  } catch {
    return 0
  }
}

// ── Run a full cycle ──────────────────────────────────────────────────────────
async function runCycle({ wallets, tokenAddress, tier, network, stats, lastWalletIdx }) {
  const walletIdx = pickRandomWallet(wallets, lastWalletIdx)
  const wallet    = wallets[walletIdx]
  const tradeUSD  = randomTradeAmountUSD(tier)

  console.log(`[SolanaBot] Cycle start — wallet ${walletIdx + 1}/${wallets.length}`)

  // Buy
  const buyResult = await executeSwap({
    wallet, tokenMint: tokenAddress,
    amountUSD: tradeUSD, isBuy: true, network,
  })

  if (buyResult.success) {
    stats.buys++
    stats.volumeUSD += tradeUSD
    stats.lastTrade = new Date().toISOString()
  }

  // Wait 10-30 sec between buy and sell
  await new Promise(r => setTimeout(r, Math.random() * 20000 + 10000))

  // Sell 70% of the time
  if (Math.random() > 0.3) {
    const sellResult = await executeSwap({
      wallet, tokenMint: tokenAddress,
      amountUSD: tradeUSD * 0.8, isBuy: false, network,
    })
    if (sellResult.success) {
      stats.sells++
      stats.volumeUSD += tradeUSD * 0.8
    }
  }

  stats.cycles++
  return walletIdx
}

module.exports = { runCycle, executeSwap }
