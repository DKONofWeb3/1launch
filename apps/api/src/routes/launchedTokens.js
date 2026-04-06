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

    // Look up user by wallet
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (userError) {
      console.error('[launched-tokens] user lookup error:', userError.message)
      return res.json({ success: true, data: [] })
    }

    if (!user) {
      return res.json({ success: true, data: [] })
    }

    // Select only columns we know exist — no audit_risk
    const { data: tokens, error } = await supabase
      .from('launched_tokens')
      .select(`
        id,
        contract_address,
        chain,
        network,
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
      .eq('user_id', user.id)
      .order('launched_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[launched-tokens] query error:', error.message)
      throw error
    }

    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, data: [] })
    }

    // Fetch market data per token — never throws
    const withMarket = []
    for (const token of tokens) {
      let market = null
      try {
        market = await getTokenData(token.contract_address, token.chain)
      } catch {}
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
    const { data, error } = await supabase
      .from('launched_tokens')
      .select(`
        id, contract_address, chain, network, tx_hash, launched_at, user_id, draft_id,
        token_drafts(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) {
      console.error('[launched-tokens/:id] query error:', error.message)
      return res.status(500).json({ success: false, error: error.message })
    }
    if (!data) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    let market = null
    try { market = await getTokenData(data.contract_address, data.chain) } catch {}

    res.json({
      success: true,
      data: {
        ...data,
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
    const { data: token } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!token) return res.status(404).json({ success: false, error: 'Token not found' })

    const audit = await runAuditScan(token.contract_address, token.chain)
    res.json({ success: true, data: audit })
  } catch (err) {
    console.error('[POST /launched-tokens/:id/audit]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { launchedTokensRouter }