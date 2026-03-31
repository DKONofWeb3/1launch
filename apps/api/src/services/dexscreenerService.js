const axios = require('axios')

// DexScreener free API — no key needed
// Supports BSC (bsc) and Solana (solana) chains

async function getTokenData(contractAddress, chain) {
  try {
    const chainId = chain === 'bsc' ? 'bsc' : 'solana'
    const res = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
      { timeout: 8000 }
    )

    const pairs = res.data?.pairs || []
    if (pairs.length === 0) return null

    // Get the most liquid pair
    const topPair = pairs.sort((a, b) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0]

    return {
      price_usd:        parseFloat(topPair.priceUsd || 0),
      market_cap_usd:   topPair.marketCap || 0,
      volume_24h:       topPair.volume?.h24 || 0,
      price_change_24h: topPair.priceChange?.h24 || 0,
      liquidity_usd:    topPair.liquidity?.usd || 0,
      dex_url:          topPair.url || null,
      pair_address:     topPair.pairAddress || null,
    }
  } catch (err) {
    console.warn(`[DexScreener] Failed to fetch ${contractAddress}:`, err.message)
    return null
  }
}

// Batch fetch for multiple tokens
async function getMultipleTokenData(tokens) {
  const results = await Promise.allSettled(
    tokens.map(t => getTokenData(t.contract_address, t.chain))
  )

  return tokens.map((token, i) => ({
    ...token,
    market_data: results[i].status === 'fulfilled' ? results[i].value : null,
  }))
}

module.exports = { getTokenData, getMultipleTokenData }
