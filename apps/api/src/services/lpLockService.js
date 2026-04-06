// apps/api/src/services/lpLockService.js

const { ethers } = require('ethers')
const axios = require('axios')

// ── Unicrypt LP Locker addresses ──────────────────────────────────────────────
// Unicrypt V2 Liquidity Locker on BSC Mainnet
const UNICRYPT_LOCKER_MAINNET = '0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83'
// BSC Testnet — Unicrypt doesn't have testnet, we use a mock address for dev
const UNICRYPT_LOCKER_TESTNET = '0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83'

// Unicrypt locker ABI (only what we need)
const UNICRYPT_ABI = [
  {
    name: 'lockLPToken',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'lpToken',     type: 'address' },
      { name: 'amount',      type: 'uint256' },
      { name: 'unlockDate',  type: 'uint256' },
      { name: 'referral',    type: 'address' },
      { name: 'feeInEth',    type: 'bool' },
      { name: 'withdrawer',  type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'getUserNumLockedTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getUserLockedTokenAtIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user',  type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'getUserNumLocksForToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user',    type: 'address' },
      { name: 'lpToken', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getUserLockForTokenAtIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user',    type: 'address' },
      { name: 'lpToken', type: 'address' },
      { name: 'index',   type: 'uint256' },
    ],
    outputs: [
      { name: 'lockDate',    type: 'uint256' },
      { name: 'amount',      type: 'uint256' },
      { name: 'initialAmount', type: 'uint256' },
      { name: 'unlockDate',  type: 'uint256' },
      { name: 'lockID',      type: 'uint256' },
      { name: 'owner',       type: 'address' },
    ],
  },
]

// ERC20 ABI for LP token approve + balance
const LP_TOKEN_ABI = [
  { name: 'approve',             type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf',           type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }],                                        outputs: [{ type: 'uint256' }] },
  { name: 'allowance',           type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],   outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply',         type: 'function', stateMutability: 'view',       inputs: [],                                                                              outputs: [{ type: 'uint256' }] },
]

// ── Get PancakeSwap LP token address for a given token ────────────────────────
const PANCAKE_FACTORY_MAINNET = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'
const PANCAKE_FACTORY_TESTNET = '0x6725F303b657a9451d8BA641348b6761A6CC7a17'
const WBNB_MAINNET            = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const WBNB_TESTNET            = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'

const FACTORY_ABI = [
  {
    name: 'getPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }],
    outputs: [{ name: 'pair', type: 'address' }],
  },
]

async function getLPTokenAddress(tokenAddress, network = 'mainnet') {
  try {
    const rpcUrl     = network === 'mainnet'
      ? (process.env.BSC_TESTNET_RPC || 'https://bsc-dataseed1.binance.org')
      : (process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org')
    const factory    = network === 'mainnet' ? PANCAKE_FACTORY_TESTNET : PANCAKE_FACTORY_MAINNET
    const wbnb       = network === 'mainnet' ? WBNB_TESTNET : WBNB_MAINNET

    const provider   = new ethers.JsonRpcProvider(rpcUrl)
    const contract   = new ethers.Contract(factory, FACTORY_ABI, provider)
    const pair       = await contract.getPair(tokenAddress, wbnb)

    if (pair === '0x0000000000000000000000000000000000000000') {
      return null // No pair exists yet
    }
    return pair
  } catch (err) {
    console.error('[LPLock] getPair failed:', err.message)
    return null
  }
}

async function getLPBalance(lpTokenAddress, walletAddress, network = 'mainnet') {
  try {
    const rpcUrl   = network === 'mainnet'
      ? (process.env.BSC_TESTNET_RPC || 'https://bsc-dataseed1.binance.org')
      : (process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org')
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const lp       = new ethers.Contract(lpTokenAddress, LP_TOKEN_ABI, provider)
    const balance  = await lp.balanceOf(walletAddress)
    const supply   = await lp.totalSupply()
    return {
      balance:      balance.toString(),
      balanceFormatted: ethers.formatEther(balance),
      totalSupply:  supply.toString(),
      percentage:   supply > 0n ? Number(balance * 100n / supply) : 0,
    }
  } catch (err) {
    return null
  }
}

// ── Get existing locks for a wallet + LP token via Unicrypt API ───────────────
async function getExistingLocks(walletAddress, lpTokenAddress, network = 'mainnet') {
  try {
    // Unicrypt has a public API to query locks
    const apiBase = network === 'mainnet'
      ? 'https://api.uncx.network/api/v3'
      : null // No testnet API

    if (!apiBase) {
      // For testnet, query on-chain directly
      return await getLocksOnChain(walletAddress, lpTokenAddress, network)
    }

    const res = await axios.get(`${apiBase}/locks/bsc`, {
      params: { lpToken: lpTokenAddress },
      timeout: 10000,
    })
    return res.data?.lockedTokens || []
  } catch {
    return []
  }
}

async function getLocksOnChain(walletAddress, lpTokenAddress, network) {
  try {
    const rpcUrl   = network === 'mainnet'
      ? (process.env.BSC_TESTNET_RPC || 'https://bsc-dataseed1.binance.org')
      : (process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org')
    const locker   = network === 'mainnet' ? UNICRYPT_LOCKER_MAINNET : UNICRYPT_LOCKER_TESTNET
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(locker, UNICRYPT_ABI, provider)

    const numLocks = await contract.getUserNumLocksForToken(walletAddress, lpTokenAddress)
    const locks = []

    for (let i = 0; i < Number(numLocks); i++) {
      const lock = await contract.getUserLockForTokenAtIndex(walletAddress, lpTokenAddress, i)
      locks.push({
        lockDate:   Number(lock[0]),
        amount:     lock[1].toString(),
        unlockDate: Number(lock[3]),
        lockID:     Number(lock[4]),
        owner:      lock[5],
      })
    }
    return locks
  } catch {
    return []
  }
}

module.exports = {
  getLPTokenAddress,
  getLPBalance,
  getExistingLocks,
  UNICRYPT_LOCKER_MAINNET,
  UNICRYPT_LOCKER_TESTNET,
  LP_TOKEN_ABI,
  UNICRYPT_ABI,
}
