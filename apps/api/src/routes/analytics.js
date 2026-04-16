// apps/api/src/routes/analytics.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const analyticsRouter = Router()

// GET /api/analytics/proof-of-alpha
// Returns our launched tokens + best copycats with live DexScreener market data.
// Falls back gracefully — never throws, slider always gets something.

analyticsRouter.get('/proof-of-alpha', async (req, res) => {
  try {
    const results = []

    // ── 1. Our launched tokens — fetch live price from DexScreener ────────────
    const { data: launched } = await supabase
      .from('launched_tokens')
      .select('id, contract_address, chain, token_drafts(name, ticker)')
      .limit(20)

    if (launched?.length) {
      await Promise.all(launched.map(async token => {
        try {
          const draft = token.token_drafts
          if (!draft?.ticker) return

          const dexRes  = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${token.contract_address}`,
            { signal: AbortSignal.timeout(4000) }
          )
          const dexData = await dexRes.json()
          const pair    = dexData?.pairs?.[0]
          if (!pair) return

          const marketCap = pair.marketCap || pair.fdv || 0
          if (marketCap < 50_000) return // $50k minimum

          results.push({
            name:       draft.name || draft.ticker,
            ticker:     draft.ticker,
            chain:      token.chain,
            market_cap: marketCap,
            change_pct: pair.priceChange?.h24 || 0,
            narrative:  'Launched via 1launch',
            dex_url:    pair.url || `https://dexscreener.com/${token.chain}/${token.contract_address}`,
          })
        } catch {}
      }))
    }

    // ── 2. Best copycats from copycat_alerts ──────────────────────────────────
    const { data: copycats } = await supabase
      .from('copycat_alerts')
      .select('copycat_name, copycat_ticker, copycat_chain, market_cap, dex_url, launched_tokens(token_drafts(ticker))')
      .order('market_cap', { ascending: false })
      .limit(20)

    if (copycats?.length) {
      for (const c of copycats) {
        if (!c.copycat_ticker || (c.market_cap || 0) < 50_000) continue
        const originalTicker = c.launched_tokens?.token_drafts?.ticker || '?'
        results.push({
          name:       c.copycat_name || c.copycat_ticker,
          ticker:     c.copycat_ticker,
          chain:      c.copycat_chain || 'bsc',
          market_cap: c.market_cap || 0,
          change_pct: 0,
          narrative:  `Copycat of $${originalTicker} — our scanner caught this`,
          dex_url:    c.dex_url || 'https://dexscreener.com',
        })
      }
    }

    // ── 3. Deduplicate by ticker, sort by market cap, cap at 20 ──────────────
    const seen   = new Set()
    const sorted = results
      .filter(r => { if (seen.has(r.ticker)) return false; seen.add(r.ticker); return true })
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 20)

    res.json({ success: true, data: sorted })
  } catch (err) {
    console.error('[GET /analytics/proof-of-alpha]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { analyticsRouter }