// apps/api/src/services/launchTimingService.js

const axios = require('axios')
const { supabase } = require('../lib/supabase')

// ── Fetch current BSC gas price ───────────────────────────────────────────────
async function getBSCGasPrice() {
  try {
    const res = await axios.get(
      'https://api.bscscan.com/api?module=gastracker&action=gasoracle',
      { timeout: 6000 }
    )
    const result = res.data?.result
    return {
      low:    parseFloat(result?.SafeGasPrice  || 3),
      medium: parseFloat(result?.ProposeGasPrice || 5),
      high:   parseFloat(result?.FastGasPrice  || 10),
      unit:   'Gwei',
    }
  } catch {
    return { low: 3, medium: 5, high: 10, unit: 'Gwei' }
  }
}

// ── Fetch current Solana network congestion ───────────────────────────────────
async function getSolanaNetworkHealth() {
  try {
    const res = await axios.post(
      'https://api.devnet.solana.com',
      { jsonrpc: '2.0', id: 1, method: 'getRecentPerformanceSamples', params: [5] },
      { timeout: 6000 }
    )
    const samples = res.data?.result || []
    const avgTPS  = samples.length
      ? samples.reduce((s, x) => s + (x.numTransactions / x.samplePeriodSecs), 0) / samples.length
      : 0

    return {
      tps:    Math.round(avgTPS),
      status: avgTPS > 2000 ? 'congested' : avgTPS > 1000 ? 'moderate' : 'clear',
    }
  } catch {
    return { tps: 0, status: 'unknown' }
  }
}

// ── Fetch top narratives from our own DB ──────────────────────────────────────
async function getTopNarratives() {
  try {
    const { data } = await supabase
      .from('narratives')
      .select('title, hype_score, estimated_window, suggested_tickers')
      .gt('expires_at', new Date().toISOString())
      .order('hype_score', { ascending: false })
      .limit(5)
    return data || []
  } catch {
    return []
  }
}

// ── Fetch market sentiment from CoinGecko (BTC/ETH 24h change as proxy) ──────
async function getMarketSentiment() {
  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true',
      { timeout: 8000 }
    )
    const data   = res.data
    const btcChg = data?.bitcoin?.usd_24h_change || 0
    const ethChg = data?.ethereum?.usd_24h_change || 0
    const bnbChg = data?.binancecoin?.usd_24h_change || 0
    const solChg = data?.solana?.usd_24h_change || 0

    const avgChg = (btcChg + ethChg) / 2

    return {
      btc_24h:  btcChg.toFixed(2),
      eth_24h:  ethChg.toFixed(2),
      bnb_24h:  bnbChg.toFixed(2),
      sol_24h:  solChg.toFixed(2),
      avg_24h:  avgChg.toFixed(2),
      sentiment: avgChg > 3 ? 'bullish' : avgChg > 0 ? 'neutral_up' : avgChg > -3 ? 'neutral_down' : 'bearish',
      prices: {
        btc: data?.bitcoin?.usd,
        eth: data?.ethereum?.usd,
        bnb: data?.binancecoin?.usd,
        sol: data?.solana?.usd,
      }
    }
  } catch {
    return { btc_24h: '0', eth_24h: '0', bnb_24h: '0', sol_24h: '0', avg_24h: '0', sentiment: 'unknown', prices: {} }
  }
}

// ── Fetch Fear & Greed Index ──────────────────────────────────────────────────
async function getFearAndGreed() {
  try {
    const res = await axios.get('https://api.alternative.me/fng/?limit=1', { timeout: 6000 })
    const d   = res.data?.data?.[0]
    return {
      value:       parseInt(d?.value || 50),
      label:       d?.value_classification || 'Neutral',
      timestamp:   d?.timestamp,
    }
  } catch {
    return { value: 50, label: 'Neutral', timestamp: null }
  }
}

// ── DexScreener trending tokens count (proxy for memecoin activity) ───────────
async function getDexScreenerActivity() {
  try {
    const res = await axios.get('https://api.dexscreener.com/latest/dex/search?q=meme', { timeout: 8000 })
    const pairs = res.data?.pairs || []
    const hotPairs = pairs.filter(p => parseFloat(p.priceChange?.h24 || 0) > 20).length
    return {
      total_meme_pairs: pairs.length,
      hot_pairs_24h:    hotPairs,
      activity_level:   hotPairs > 20 ? 'very_high' : hotPairs > 10 ? 'high' : hotPairs > 5 ? 'medium' : 'low',
    }
  } catch {
    return { total_meme_pairs: 0, hot_pairs_24h: 0, activity_level: 'unknown' }
  }
}

// ── Main: collect all signals ─────────────────────────────────────────────────
async function collectMarketSignals(chain = 'bsc') {
  const [gas, solana, narratives, sentiment, fearGreed, dexActivity] = await Promise.all([
    getBSCGasPrice(),
    getSolanaNetworkHealth(),
    getTopNarratives(),
    getMarketSentiment(),
    getFearAndGreed(),
    getDexScreenerActivity(),
  ])

  return {
    timestamp:  new Date().toISOString(),
    chain,
    gas,
    solana,
    narratives,
    sentiment,
    fear_greed: fearGreed,
    dex_activity: dexActivity,
  }
}

module.exports = { collectMarketSignals }
