const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getMultipleTokenData, getTokenData } = require('../services/dexscreenerService')
const { runAuditScan } = require('../services/auditService')

const launchedTokensRouter = Router()

// GET /api/launched-tokens — get all launched tokens with live market data
launchedTokensRouter.get('/', async (req, res) => {
  try {
    const { wallet } = req.query

    let query = supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name, ticker, logo_url, description,
          total_supply, tax_buy, tax_sell,
          lp_lock, renounce, chain
        )
      `)
      .order('launched_at', { ascending: false })
      .limit(50)

    if (wallet) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet.toLowerCase())
        .single()

      if (user) query = query.eq('user_id', user.id)
    }

    const { data: tokens, error } = await query
    if (error) throw error

    // Fetch live market data for all tokens in parallel
    const tokensWithMarketData = await getMultipleTokenData(
      tokens.map(t => ({
        ...t,
        contract_address: t.contract_address,
        chain: t.chain,
      }))
    )

    res.json({ success: true, data: tokensWithMarketData })
  } catch (err) {
    console.error('[GET /launched-tokens]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/launched-tokens/:id — single token with full data
launchedTokensRouter.get('/:id', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name, ticker, logo_url, description,
          total_supply, tax_buy, tax_sell,
          lp_lock, renounce, chain,
          tg_bio, twitter_bio, first_tweets
        )
      `)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!token) return res.status(404).json({ success: false, error: 'Not found' })

    // Fetch live market data
    const marketData = await getTokenData(token.contract_address, token.chain)

    res.json({
      success: true,
      data: { ...token, market_data: marketData },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/launched-tokens/:id/audit — run audit scan
launchedTokensRouter.post('/:id/audit', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain, audit_scan_done')
      .eq('id', req.params.id)
      .single()

    if (error || !token) return res.status(404).json({ success: false, error: 'Token not found' })

    // Run the scan
    const auditResult = await runAuditScan(token.contract_address, token.chain)

    // Save result to DB
    const { data: saved, error: saveError } = await supabase
      .from('audit_scans')
      .upsert({
        token_id:         req.params.id,
        contract_address: token.contract_address,
        chain:            token.chain,
        score:            auditResult.score,
        overall_risk:     auditResult.overall_risk,
        risks:            auditResult.risks,
        passes:           auditResult.passes,
        scanned_at:       auditResult.scanned_at,
      })
      .select()
      .single()

    // Mark audit as done on the token
    await supabase
      .from('launched_tokens')
      .update({ audit_scan_done: true })
      .eq('id', req.params.id)

    res.json({ success: true, data: { ...auditResult, id: saved?.id } })
  } catch (err) {
    console.error('[POST /audit]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/launched-tokens/:id/audit — get latest audit result
launchedTokensRouter.get('/:id/audit', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_scans')
      .select('*')
      .eq('token_id', req.params.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return res.json({ success: true, data: null })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { launchedTokensRouter }
