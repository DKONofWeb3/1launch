// apps/api/src/services/tokenSearchService.js

const axios = require('axios')

// ── Search DexScreener for tokens by query ────────────────────────────────────
async function searchTokens(query, limit = 20) {
  try {
    const res = await axios.get(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { timeout: 10000 }
    )
    const pairs = res.data?.pairs || []

    // Deduplicate by token address, keep highest volume pair per token
    const tokenMap = new Map()
    for (const pair of pairs) {
      const addr = pair.baseToken?.address?.toLowerCase()
      if (!addr) continue
      const existing = tokenMap.get(addr)
      const vol = parseFloat(pair.volume?.h24 || 0)
      if (!existing || vol > parseFloat(existing.volume?.h24 || 0)) {
        tokenMap.set(addr, pair)
      }
    }

    return Array.from(tokenMap.values())
      .slice(0, limit)
      .map(pair => ({
        name:         pair.baseToken?.name || '',
        ticker:       pair.baseToken?.symbol || '',
        address:      pair.baseToken?.address || '',
        chain:        pair.chainId || '',
        price_usd:    parseFloat(pair.priceUsd || 0),
        market_cap:   pair.marketCap || 0,
        volume_24h:   parseFloat(pair.volume?.h24 || 0),
        price_change: parseFloat(pair.priceChange?.h24 || 0),
        liquidity:    pair.liquidity?.usd || 0,
        pair_address: pair.pairAddress || '',
        dex_url:      pair.url || '',
        created_at:   pair.pairCreatedAt || null,
        dex_id:       pair.dexId || '',
      }))
  } catch (err) {
    console.error('[TokenSearch] DexScreener search failed:', err.message)
    return []
  }
}

// ── Narrative saturation: search by ticker + name separately ─────────────────
async function checkNarrativeSaturation(name, ticker) {
  const [byTicker, byName] = await Promise.all([
    searchTokens(ticker, 15),
    searchTokens(name, 15),
  ])

  const seen = new Set()
  const all = []
  for (const t of [...byTicker, ...byName]) {
    const key = `${t.chain}_${t.address}`
    if (!seen.has(key)) { seen.add(key); all.push(t) }
  }

  const exactTicker = all.filter(t => t.ticker.toUpperCase() === ticker.toUpperCase())
  const nameWords   = name.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const similarName = all.filter(t =>
    nameWords.some(w => t.name.toLowerCase().includes(w)) &&
    !exactTicker.find(e => e.address === t.address)
  )

  const totalVol  = all.reduce((s, t) => s + t.volume_24h, 0)
  const totalMcap = all.reduce((s, t) => s + t.market_cap, 0)

  return {
    exact_ticker_matches: exactTicker,
    similar_name_matches: similarName,
    total_found:      all.length,
    total_volume_24h: totalVol,
    total_mcap:       totalMcap,
    saturation_level: exactTicker.length > 5 ? 'very_high'
      : exactTicker.length > 2 ? 'high'
      : exactTicker.length > 0 ? 'medium'
      : 'low',
  }
}

// ── Copycat detector ──────────────────────────────────────────────────────────
//
// Rules (strict):
//   1. MUST have the EXACT same ticker (case-insensitive). No name fuzzy matching.
//   2. Must NOT be the original contract address.
//   3. Must have market cap ≥ $50,000 — filters out dead/spam tokens.
//
// Why strict ticker-only:
//   $ASTRO should never match $PKR just because "astro" appears somewhere.
//   $MOMMA should never match $SHAK. Same ticker = same narrative claim.

async function findCopycats(name, ticker, contractAddress, launchedAt) {
  // Search only by ticker — no name search, that's what caused false matches
  const results = await searchTokens(ticker, 50)

  const MIN_MARKET_CAP = 50_000 // $50k floor

  const copycats = results.filter(t => {
    // Must be exact ticker match (case-insensitive)
    if (t.ticker.toUpperCase() !== ticker.toUpperCase()) return false

    // Must not be the original token
    if (t.address.toLowerCase() === contractAddress?.toLowerCase()) return false

    // Must meet minimum market cap
    if ((t.market_cap || 0) < MIN_MARKET_CAP) return false

    return true
  }).map(t => ({
    ...t,
    similarity: 'exact_ticker',
  }))

  return copycats
}

module.exports = { searchTokens, checkNarrativeSaturation, findCopycats }