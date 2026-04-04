// apps/api/src/routes/launchedTokens.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getMultipleTokenData, getTokenData } = require('../services/dexscreenerService')
const { runAuditScan } = require('../services/auditService')

const launchedTokensRouter = Router()

// GET /api/launched-tokens
// REQUIRES wallet param — returns empty array if no wallet provided
launchedTokensRouter.get('/', async (req, res) => {
  try {
    const { wallet } = req.query

    // Strict: if no wallet, return empty — don't leak other users' tokens
    if (!wallet) {
      return res.json({ success: true, data: [] })
    }

    // Look up user by wallet address
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

    // Fetch live market data
    const tokensWithMarket = await getMultipleTokenData(
      (tokens || []).map(t => ({ address: t.contract_address, chain: t.chain }))
    ).catch(() => [])

    const merged = (tokens || []).map(token => {
      const market = tokensWithMarket.find(m => m?.address?.toLowerCase() === token.contract_address?.toLowerCase())
      return { ...token, market_data: market || null }
    })

    res.json({ success: true, data: merged })
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

    if (error || !data) return res.status(404).json({ success: false, error: 'Not found' })

    const market = await getTokenData(data.contract_address, data.chain).catch(() => null)
    res.json({ success: true, data: { ...data, market_data: market } })
  } catch (err) {
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

    await supabase
      .from('launched_tokens')
      .update({ audit_scan_done: true })
      .eq('id', req.params.id)

    res.json({ success: true, data: audit })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { launchedTokensRouter }
