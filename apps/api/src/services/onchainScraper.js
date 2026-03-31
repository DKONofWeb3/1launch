const axios = require('axios')

// ── DexScreener — trending tokens ─────────────────────────────────────────────
async function scrapeDexScreener() {
  try {
    const res = await axios.get('https://api.dexscreener.com/token-boosts/top/v1', {
      timeout: 8000,
    })

    const tokens = res.data || []

    return tokens.slice(0, 20).map((token) => ({
      text: `${token.tokenAddress} on ${token.chainId}`,
      // Use description if available — often contains narrative keywords
      label: token.description || token.tokenAddress,
      source: 'dexscreener',
      meta: {
        chain: token.chainId,
        address: token.tokenAddress,
        amount: token.amount,
        totalAmount: token.totalAmount,
        url: token.url,
        icon: token.icon,
        links: token.links,
      },
    }))
  } catch (err) {
    console.warn('[DexScreener] Fetch failed:', err.message)
    return []
  }
}

// ── DexScreener — latest token pairs (new launches) ──────────────────────────
async function scrapeDexScreenerLatest() {
  try {
    const res = await axios.get(
      'https://api.dexscreener.com/token-profiles/latest/v1',
      { timeout: 8000 }
    )

    const tokens = res.data || []

    return tokens.slice(0, 20).map((token) => ({
      text: token.description || '',
      source: 'dexscreener',
      meta: {
        chain: token.chainId,
        address: token.tokenAddress,
        links: token.links,
      },
    })).filter((t) => t.text.length > 3)
  } catch (err) {
    console.warn('[DexScreener Latest] Fetch failed:', err.message)
    return []
  }
}

// ── CoinGecko — trending coins ────────────────────────────────────────────────
async function scrapeCoinGeckoTrending() {
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/search/trending', {
      timeout: 8000,
    })

    const coins = res.data?.coins || []

    return coins.map((c) => ({
      text: `${c.item.name} (${c.item.symbol})`,
      source: 'coingecko',
      meta: {
        rank: c.item.score,
        marketCapRank: c.item.market_cap_rank,
        thumb: c.item.thumb,
      },
    }))
  } catch (err) {
    console.warn('[CoinGecko] Fetch failed:', err.message)
    return []
  }
}

module.exports = { scrapeDexScreener, scrapeDexScreenerLatest, scrapeCoinGeckoTrending }
