const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getTokenData } = require('../services/dexscreener')
const { runAuditScan } = require('../services/addons/auditScan')

const tokensRouter = Router()

// GET /api/tokens/launched — all launched tokens (optionally filter by wallet)
tokensRouter.get('/launched', async (req, res) => {
  try {
    const { wallet } = req.query

    let query = supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name, ticker, logo_url, chain,
          description, tg_bio, twitter_bio,
          total_supply, tax_buy, tax_sell,
          lp_lock, renounce, launch_mechanism
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

    const { data, error } = await query
    if (error) throw error

    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/launched/:id — single token with full data
tokensRouter.get('/launched/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name, ticker, logo_url, chain,
          description, tg_bio, twitter_bio,
          total_supply, tax_buy, tax_sell,
          lp_lock, renounce, narrative_id
        ),
        add_ons (*)
      `)
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ success: false, error: 'Token not found' })

    // Fetch live price if not recently updated
    const lastUpdate = data.last_price_update
      ? new Date(data.last_price_update)
      : null
    const stale = !lastUpdate || Date.now() - lastUpdate.getTime() > 5 * 60 * 1000

    if (stale && data.contract_address) {
      const priceData = await getTokenData(data.contract_address, data.chain)
      if (priceData) {
        await supabase
          .from('launched_tokens')
          .update({
            price_usd:         priceData.price_usd,
            market_cap_usd:    priceData.market_cap_usd,
            volume_24h:        priceData.volume_24h,
            price_change_24h:  priceData.price_change_24h,
            last_price_update: new Date().toISOString(),
          })
          .eq('id', req.params.id)

        Object.assign(data, priceData)
      }
    }

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/tokens/connect — connect an existing token by contract address
tokensRouter.post('/connect', async (req, res) => {
  try {
    const { contract_address, chain, wallet_address } = req.body

    if (!contract_address || !chain || !wallet_address) {
      return res.status(400).json({ success: false, error: 'contract_address, chain, and wallet_address required' })
    }

    // Fetch on-chain data from DexScreener
    const priceData = await getTokenData(contract_address, chain)

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ wallet_address: wallet_address.toLowerCase(), chain, plan: 'free' })
        .select()
        .single()
      user = newUser
    }

    // Check if already connected
    const { data: existing } = await supabase
      .from('launched_tokens')
      .select('id')
      .eq('contract_address', contract_address.toLowerCase())
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return res.status(409).json({ success: false, error: 'Token already connected to your account' })
    }

    // Insert as a connected (not deployed-by-us) token
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .insert({
        user_id:           user.id,
        draft_id:          null,
        contract_address:  contract_address.toLowerCase(),
        chain,
        tx_hash:           'external',  // marks it as externally connected
        price_usd:         priceData?.price_usd || null,
        market_cap_usd:    priceData?.market_cap_usd || null,
        volume_24h:        priceData?.volume_24h || null,
        price_change_24h:  priceData?.price_change_24h || null,
        last_price_update: new Date().toISOString(),
        audit_scan_done:   false,
        tg_setup_done:     false,
        volume_bot_tier:   'none',
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data: { ...token, dex_data: priceData } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/tokens/audit/:id — run audit scan on a launched token
tokensRouter.post('/audit/:id', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const result = await runAuditScan(token.contract_address, token.chain)

    // Save audit result
    const { data: auditRecord } = await supabase
      .from('add_ons')
      .insert({
        token_id:   req.params.id,
        type:       'audit_scan',
        status:     'active',
        expires_at: null,
      })
      .select()
      .single()

    // Mark audit done on token
    await supabase
      .from('launched_tokens')
      .update({ audit_scan_done: true })
      .eq('id', req.params.id)

    res.json({ success: true, data: { audit: result, record: auditRecord } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/price/:address — quick price lookup by contract address
tokensRouter.get('/price/:address', async (req, res) => {
  try {
    const { chain = 'bsc' } = req.query
    const data = await getTokenData(req.params.address, chain)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { tokensRouter }
