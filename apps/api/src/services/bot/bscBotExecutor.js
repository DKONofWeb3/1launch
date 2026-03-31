// apps/api/src/services/bot/bscBotExecutor.js

const { ethers } = require('ethers')
const {
  PANCAKE_V2_ROUTER,
  PANCAKE_V2_ROUTER_TESTNET,
  WBNB_ADDRESS,
  WBNB_TESTNET,
  PANCAKE_V2_ABI,
  ERC20_ABI,
  randomTradeAmountUSD,
  pickRandomWallet,
} = require('./botConfig')

// ── Get BNB price in USD (simple fetch from CoinGecko) ────────────────────────
let cachedBnbPrice = 600
let lastPriceFetch = 0

async function getBnbPrice() {
  if (Date.now() - lastPriceFetch < 5 * 60 * 1000) return cachedBnbPrice
  try {
    const axios = require('axios')
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd', { timeout: 5000 })
    cachedBnbPrice = res.data?.binancecoin?.usd || 600
    lastPriceFetch = Date.now()
  } catch {}
  return cachedBnbPrice
}

// ── Execute one buy/sell cycle on BSC ────────────────────────────────────────
async function executeTrade({ wallet, tokenAddress, tier, network = 'testnet', isBuy = true }) {
  const isTestnet    = network === 'testnet'
  const rpcUrl       = isTestnet
    ? (process.env.BSC_TESTNET_RPC || 'https://bsc-testnet-rpc.publicnode.com')
    : (process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org')
  const routerAddr   = isTestnet ? PANCAKE_V2_ROUTER_TESTNET : PANCAKE_V2_ROUTER
  const wbnbAddr     = isTestnet ? WBNB_TESTNET : WBNB_ADDRESS

  const provider     = new ethers.JsonRpcProvider(rpcUrl)
  const signer       = new ethers.Wallet(wallet.private_key, provider)
  const router       = new ethers.Contract(routerAddr, PANCAKE_V2_ABI, signer)
  const token        = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

  const bnbPrice     = await getBnbPrice()
  const tradeUSD     = randomTradeAmountUSD(tier)
  const deadline     = Math.floor(Date.now() / 1000) + 300 // 5 min deadline

  const result = { success: false, txHash: null, type: isBuy ? 'buy' : 'sell', amountUSD: tradeUSD }

  try {
    if (isBuy) {
      // ── BUY: spend BNB to get tokens ─────────────────────────────────────
      const bnbAmount   = ethers.parseEther(String((tradeUSD / bnbPrice).toFixed(6)))
      const bnbBalance  = await provider.getBalance(signer.address)

      if (bnbBalance < bnbAmount + ethers.parseEther('0.005')) {
        console.warn(`[BSCBot] Wallet ${signer.address.slice(0, 8)} low BNB balance, skipping`)
        return { ...result, error: 'insufficient_balance' }
      }

      // Get minimum out with 5% slippage
      const amountsOut  = await router.getAmountsOut(bnbAmount, [wbnbAddr, tokenAddress])
      const amountOutMin = amountsOut[1] * 95n / 100n

      const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMin,
        [wbnbAddr, tokenAddress],
        signer.address,
        deadline,
        { value: bnbAmount, gasLimit: 300000 }
      )

      result.txHash = tx.hash
      await tx.wait(1)
      result.success = true

    } else {
      // ── SELL: spend tokens to get BNB ─────────────────────────────────────
      const tokenBalance = await token.balanceOf(signer.address)
      if (tokenBalance === 0n) {
        return { ...result, error: 'no_tokens_to_sell' }
      }

      // Sell a random 20-60% of token balance
      const sellPct    = BigInt(Math.floor(Math.random() * 40) + 20)
      const sellAmount = tokenBalance * sellPct / 100n

      // Approve router
      const approveTx = await token.approve(routerAddr, sellAmount, { gasLimit: 100000 })
      await approveTx.wait(1)

      // Get minimum BNB out with 5% slippage
      const amountsOut  = await router.getAmountsOut(sellAmount, [tokenAddress, wbnbAddr])
      const amountOutMin = amountsOut[1] * 95n / 100n

      const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        sellAmount,
        amountOutMin,
        [tokenAddress, wbnbAddr],
        signer.address,
        deadline,
        { gasLimit: 300000 }
      )

      result.txHash = tx.hash
      await tx.wait(1)
      result.success = true
    }
  } catch (err) {
    result.error = err.message?.slice(0, 100)
    console.error(`[BSCBot] Trade failed (${isBuy ? 'buy' : 'sell'}):`, err.message?.slice(0, 80))
  }

  return result
}

// ── Run a full cycle: pick wallet, buy, wait, sell ────────────────────────────
async function runCycle({ wallets, tokenAddress, tier, network, stats, lastWalletIdx }) {
  const walletIdx = pickRandomWallet(wallets, lastWalletIdx)
  const wallet    = wallets[walletIdx]

  console.log(`[BSCBot] Cycle start — wallet ${walletIdx + 1}/${wallets.length} — ${tokenAddress.slice(0, 8)}`)

  // Buy
  const buyResult = await executeTrade({ wallet, tokenAddress, tier, network, isBuy: true })
  if (buyResult.success) {
    stats.buys++
    stats.volumeUSD += buyResult.amountUSD
    stats.lastTrade = new Date().toISOString()
  }

  // Wait 10-30 seconds between buy and sell
  await new Promise(r => setTimeout(r, Math.random() * 20000 + 10000))

  // Sell (70% of the time — keep some tokens to build holder count)
  if (Math.random() > 0.3) {
    const sellResult = await executeTrade({ wallet, tokenAddress, tier, network, isBuy: false })
    if (sellResult.success) {
      stats.sells++
      stats.volumeUSD += sellResult.amountUSD * 0.8 // approximate sell value
    }
  }

  stats.cycles++
  return walletIdx
}

module.exports = { runCycle, executeTrade }
