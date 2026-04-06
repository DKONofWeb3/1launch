// apps/api/src/routes/launchedTokens.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getTokenData } = require('../services/dexscreenerService')
const { runAuditScan } = require('../services/auditService')

const launchedTokensRouter = Router()

// GET /api/launched-tokens?wallet=0x...
// Strict: returns empty if no wallet provided
launchedTokensRouter.get('/', async (req, res) => {
  try {
    const { wallet } = req.query

    if (!wallet) {
      return res.json({ success: true, data: [] })
    }

    // Look up user by wallet
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .single()
      .catch(() => ({ data: null }))

    if (!user) {
      return res.json({ success: true, data: [] })
    }

    const { data: tokens, error } = await supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name, ticker, logo_url, description,
          total_supply, tax_buy, tax_sell,
          lp_lock, renounce, chain
        )
      `)
      .eq('user_id', user.id)
      .order('launched_at', { ascending: false })
      .limit(50)

    if (error) throw error
    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, data: [] })
    }

    // Fetch market data per token (sequential to avoid DexScreener rate limits)
    const withMarket = []
    for (const token of tokens) {
      const market = await getTokenData(token.contract_address, token.chain).catch(() => null)
      withMarket.push({ ...token, market_data: market || null })
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
      .select(`*, token_drafts(*)`)
      .eq('id', req.params.id)
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const market = await getTokenData(data.contract_address, data.chain).catch(() => null)
    res.json({ success: true, data: { ...data, market_data: market } })
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
      .single()

    if (!token) return res.status(404).json({ success: false, error: 'Token not found' })

    const audit = await runAuditScan(token.contract_address, token.chain)
    await supabase.from('launched_tokens').update({ audit_scan_done: true }).eq('id', req.params.id)
    res.json({ success: true, data: audit })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { launchedTokensRouter }
