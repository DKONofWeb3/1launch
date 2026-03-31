// apps/api/src/services/onchainAnalytics.js

const axios = require('axios')
const { ethers } = require('ethers')

// ── BSC Sniper Tracker ────────────────────────────────────────────────────────
// Fetches the first N transactions after token launch via BscScan API
// and identifies wallets that bought in the first few blocks (snipers)

async function getBSCSnipers(contractAddress, network = 'testnet') {
  try {
    const apiBase = network === 'testnet'
      ? 'https://api-testnet.bscscan.com/api'
      : 'https://api.bscscan.com/api'

    const apiKey = process.env.BSCSCAN_API_KEY || ''

    // Get token transfer events (first 100)
    const res = await axios.get(apiBase, {
      params: {
        module:          'account',
        action:          'tokentx',
        contractaddress: contractAddress,
        startblock:      0,
        endblock:        99999999,
        page:            1,
        offset:          100,
        sort:            'asc',
        apikey:          apiKey,
      },
      timeout: 10000,
    })

    if (res.data.status !== '1' || !res.data.result?.length) {
      return []
    }

    const txs = res.data.result

    // Find the deployment block (first tx)
    const deployBlock = parseInt(txs[0].blockNumber)

    // Snipers = wallets that bought within first 3 blocks
    const snipersMap = new Map()

    for (const tx of txs) {
      const blockDiff = parseInt(tx.blockNumber) - deployBlock
      if (blockDiff > 3) break // only look at first 3 blocks

      const buyer = tx.to.toLowerCase()
      if (!snipersMap.has(buyer)) {
        snipersMap.set(buyer, {
          address:    tx.to,
          blockDiff,
          blockNumber: parseInt(tx.blockNumber),
          txHash:     tx.hash,
          tokenAmount: tx.value,
          timestamp:  parseInt(tx.timeStamp),
        })
      }
    }

    return Array.from(snipersMap.values())
  } catch (err) {
    console.error('[Snipers] BSC fetch failed:', err.message)
    return []
  }
}

// ── BSC Holder Analysis ───────────────────────────────────────────────────────
// Fetches top holders and identifies whales (>1% of supply)

async function getBSCHolders(contractAddress, totalSupply, network = 'testnet') {
  try {
    const apiBase = network === 'testnet'
      ? 'https://api-testnet.bscscan.com/api'
      : 'https://api.bscscan.com/api'

    const apiKey = process.env.BSCSCAN_API_KEY || ''

    // Get all token transfers to build holder balances
    const res = await axios.get(apiBase, {
      params: {
        module:          'account',
        action:          'tokentx',
        contractaddress: contractAddress,
        startblock:      0,
        endblock:        99999999,
        page:            1,
        offset:          500,
        sort:            'desc',
        apikey:          apiKey,
      },
      timeout: 10000,
    })

    if (res.data.status !== '1' || !res.data.result?.length) return []

    // Build balance map from transfers
    const balances = new Map()
    for (const tx of res.data.result) {
      const from   = tx.from.toLowerCase()
      const to     = tx.to.toLowerCase()
      const amount = BigInt(tx.value)

      balances.set(from, (balances.get(from) || 0n) - amount)
      balances.set(to,   (balances.get(to)   || 0n) + amount)
    }

    const supply = BigInt(totalSupply || '1000000000000000000000000000')

    // Convert to array, filter out zero/negative balances and dead addresses
    const deadAddresses = new Set([
      '0x0000000000000000000000000000000000000000',
      '0x000000000000000000000000000000000000dead',
    ])

    const holders = Array.from(balances.entries())
      .filter(([addr, bal]) => bal > 0n && !deadAddresses.has(addr))
      .map(([address, balance]) => {
        const pct = Number(balance * 10000n / supply) / 100
        return { address, balance: balance.toString(), percentage: pct }
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 50)

    return holders
  } catch (err) {
    console.error('[Holders] BSC fetch failed:', err.message)
    return []
  }
}

// ── Solana Sniper Tracker ─────────────────────────────────────────────────────
async function getSolanaSnipers(mintAddress) {
  try {
    // Use Solscan public API
    const res = await axios.get(
      `https://public-api.solscan.io/token/holders?tokenAddress=${mintAddress}&limit=50&offset=0`,
      { timeout: 10000, headers: { 'accept': 'application/json' } }
    )

    if (!res.data?.data?.length) return []

    // For Solana, we identify early buyers from the token's transaction history
    const txRes = await axios.get(
      `https://public-api.solscan.io/token/transfer?tokenAddress=${mintAddress}&limit=50&offset=0`,
      { timeout: 10000, headers: { 'accept': 'application/json' } }
    )

    if (!txRes.data?.data?.length) return []

    const txs = txRes.data.data
    const firstBlock = txs[txs.length - 1]?.slot || 0

    const snipers = []
    const seen = new Set()

    for (const tx of [...txs].reverse()) {
      const slotDiff = (tx.slot || 0) - firstBlock
      if (slotDiff > 5) break

      const buyer = tx.destinationOwner || tx.destination
      if (buyer && !seen.has(buyer)) {
        seen.add(buyer)
        snipers.push({
          address:    buyer,
          blockDiff:  slotDiff,
          blockNumber: tx.slot,
          txHash:     tx.signature,
          timestamp:  tx.blockTime,
        })
      }
    }

    return snipers
  } catch (err) {
    console.error('[Snipers] Solana fetch failed:', err.message)
    return []
  }
}

// ── Solana Holder Analysis ────────────────────────────────────────────────────
async function getSolanaHolders(mintAddress) {
  try {
    const res = await axios.get(
      `https://public-api.solscan.io/token/holders?tokenAddress=${mintAddress}&limit=50&offset=0`,
      { timeout: 10000, headers: { 'accept': 'application/json' } }
    )

    if (!res.data?.data?.length) return []

    const supply = res.data.total || 1000000000

    return res.data.data.map((h) => ({
      address:    h.owner,
      balance:    h.amount,
      percentage: (h.amount / supply) * 100,
    }))
  } catch (err) {
    console.error('[Holders] Solana fetch failed:', err.message)
    return []
  }
}

// ── Main exports ──────────────────────────────────────────────────────────────
async function getSnipers(contractAddress, chain, network = 'testnet') {
  if (chain === 'solana') return getSolanaSnipers(contractAddress)
  return getBSCSnipers(contractAddress, network)
}

async function getHolders(contractAddress, chain, totalSupply, network = 'testnet') {
  if (chain === 'solana') return getSolanaHolders(contractAddress)
  return getBSCHolders(contractAddress, totalSupply, network)
}

module.exports = { getSnipers, getHolders }
