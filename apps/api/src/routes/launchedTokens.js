// apps/api/src/routes/launchedTokens.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getTokenData } = require('../services/dexscreenerService')
const { runAuditScan } = require('../services/auditService')

const launchedTokensRouter = Router()

// GET /api/launched-tokens?wallet=0x...
launchedTokensRouter.get('/', async (req, res) => {
  try {
    const { wallet } = req.query

    if (!wallet) {
      return res.json({ success: true, data: [] })
    }

    // Look up user — no .catch() chaining on Supabase v2
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (userResult.error) {
      console.error('[launched-tokens] user lookup error:', userResult.error.message)
      return res.json({ success: true, data: [] })
    }

    if (!userResult.data) {
      return res.json({ success: true, data: [] })
    }

    const userId = userResult.data.id

    // Only select columns that exist in the DB
    const tokensResult = await supabase
      .from('launched_tokens')
      .select(`
        id,
        contract_address,
        chain,
        tx_hash,
        launched_at,
        user_id,
        draft_id,
        token_drafts (
          name,
          ticker,
          logo_url,
          description,
          total_supply,
          tax_buy,
          tax_sell,
          lp_lock,
          renounce,
          chain
        )
      `)
      .eq('user_id', userId)
      .order('launched_at', { ascending: false })
      .limit(50)

    if (tokensResult.error) {
      console.error('[launched-tokens] query error:', tokensResult.error.message)
      return res.status(500).json({ success: false, error: tokensResult.error.message })
    }

    const tokens = tokensResult.data || []
    if (tokens.length === 0) {
      return res.json({ success: true, data: [] })
    }

    // Fetch market data — never throws
    const withMarket = []
    for (const token of tokens) {
      let market = null
      try { market = await getTokenData(token.contract_address, token.chain) } catch {}
      withMarket.push({
        ...token,
        audit_scan_done: false,
        tg_setup_done:   false,
        volume_bot_tier: 'none',
        market_data:     market || null,
      })
    }

    res.json({ success: true, data: withMarket })
  } catch (err) {
    console.error('[GET /launched-tokens]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/launched-tokens/:id
launchedTokensRouter.get('/:id', async (req, res) => {
  try {
    const result = await supabase
      .from('launched_tokens')
      .select(`
        id, contract_address, chain, tx_hash, launched_at, user_id, draft_id,
        token_drafts(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle()

    if (result.error) {
      return res.status(500).json({ success: false, error: result.error.message })
    }
    if (!result.data) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    let market = null
    try { market = await getTokenData(result.data.contract_address, result.data.chain) } catch {}

    res.json({
      success: true,
      data: {
        ...result.data,
        audit_scan_done: false,
        tg_setup_done:   false,
        volume_bot_tier: 'none',
        market_data:     market,
      }
    })
  } catch (err) {
    console.error('[GET /launched-tokens/:id]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/launched-tokens/:id/audit
launchedTokensRouter.post('/:id/audit', async (req, res) => {
  try {
    const result = await supabase
      .from('launched_tokens')
      .select('contract_address, chain')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!result.data) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const audit = await runAuditScan(result.data.contract_address, result.data.chain)
    res.json({ success: true, data: audit })
  } catch (err) {
    console.error('[POST /launched-tokens/:id/audit]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { launchedTokensRouter }
