// apps/api/src/services/bot/botConfig.js

// ── Tier definitions ──────────────────────────────────────────────────────────
const BOT_TIERS = {
  starter: {
    name: 'Starter',
    walletCount: 3,
    intervalMinMs: 2 * 60 * 1000,   // 2 min
    intervalMaxMs: 8 * 60 * 1000,   // 8 min
    tradeMinUSD: 10,
    tradeMaxUSD: 50,
    maxSlippage: 5,                  // 5%
    price: 29,
  },
  growth: {
    name: 'Growth',
    walletCount: 15,
    intervalMinMs: 1 * 60 * 1000,   // 1 min
    intervalMaxMs: 5 * 60 * 1000,   // 5 min
    tradeMinUSD: 20,
    tradeMaxUSD: 200,
    maxSlippage: 5,
    price: 99,
  },
  pro: {
    name: 'Pro',
    walletCount: 50,
    intervalMinMs: 30 * 1000,       // 30 sec
    intervalMaxMs: 3 * 60 * 1000,   // 3 min
    tradeMinUSD: 50,
    tradeMaxUSD: 500,
    maxSlippage: 5,
    price: 299,
  },
}

// ── PancakeSwap addresses ─────────────────────────────────────────────────────
const PANCAKE_V2_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' // BSC mainnet
const PANCAKE_V3_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4' // BSC mainnet
const WBNB_ADDRESS      = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const BUSD_ADDRESS      = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'

// Testnet
const PANCAKE_V2_ROUTER_TESTNET = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
const WBNB_TESTNET              = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'

// PancakeSwap V2 Router ABI (only what we need)
const PANCAKE_V2_ABI = [
  {
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn',    type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path',         type: 'address[]' },
      { name: 'to',           type: 'address' },
      { name: 'deadline',     type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path',     type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
]

// ERC20 ABI (just approve + balanceOf)
const ERC20_ABI = [
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                        outputs: [{ type: 'uint256' }] },
  { name: 'decimals',  type: 'function', stateMutability: 'view',       inputs: [],                                                                              outputs: [{ type: 'uint8' }] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

function randomIntInRange(min, max) {
  return Math.floor(randomInRange(min, max))
}

function randomInterval(tier) {
  const config = BOT_TIERS[tier]
  return randomIntInRange(config.intervalMinMs, config.intervalMaxMs)
}

function randomTradeAmountUSD(tier) {
  const config = BOT_TIERS[tier]
  return randomInRange(config.tradeMinUSD, config.tradeMaxUSD)
}

// Pick a random wallet index, excluding the last used
function pickRandomWallet(wallets, lastIndex = -1) {
  if (wallets.length === 1) return 0
  let idx
  do {
    idx = randomIntInRange(0, wallets.length)
  } while (idx === lastIndex)
  return idx
}

module.exports = {
  BOT_TIERS,
  PANCAKE_V2_ROUTER,
  PANCAKE_V2_ROUTER_TESTNET,
  PANCAKE_V3_ROUTER,
  WBNB_ADDRESS,
  WBNB_TESTNET,
  BUSD_ADDRESS,
  PANCAKE_V2_ABI,
  ERC20_ABI,
  randomInterval,
  randomTradeAmountUSD,
  pickRandomWallet,
}
