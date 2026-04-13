// apps/api/src/routes/tokens.js
//
// Fix applied: launched tokens lookup now handles both BSC (lowercase) and
// Solana (case-sensitive base58) wallet address storage correctly.

const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const tokenRouter = Router()

// POST /api/tokens/draft — save a token draft
tokenRouter.post('/draft', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('token_drafts')
      .insert(req.body)
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/draft/:id
tokenRouter.get('/draft/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('token_drafts')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/launched?wallet=0x...
// wallet can be BSC (0x...) or Solana (base58) address
tokenRouter.get('/launched', async (req, res) => {
  try {
    const { wallet } = req.query
    if (!wallet) return res.status(400).json({ success: false, error: 'wallet required' })

    // Users are always stored by their BSC wallet (lowercase) since that's how
    // wallet auth works. So always look up user by lowercased wallet.
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) return res.json({ success: true, data: [] })

    const { data, error } = await supabase
      .from('launched_tokens')
      .select(`
        *,
        token_drafts (
          name,
          ticker,
          logo_url,
          lore,
          twitter_bio,
          tg_bio,
          first_tweets,
          total_supply,
          tax_buy,
          tax_sell
        )
      `)
      .eq('user_id', user.id)
      .order('launched_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/drafts?wallet=0x...
tokenRouter.get('/drafts', async (req, res) => {
  try {
    const { wallet } = req.query

    if (!wallet) {
      return res.json({ success: true, data: [] })
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) {
      return res.json({ success: true, data: [] })
    }

    const { data, error } = await supabase
      .from('token_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/tokens/save-checklist
tokenRouter.post('/save-checklist', async (req, res) => {
  try {
    const { draft_id, checklist } = req.body
    if (!draft_id) return res.status(400).json({ success: false, error: 'draft_id required' })

    const { error } = await supabase
      .from('token_drafts')
      .update({ checklist })
      .eq('id', draft_id)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/tokens/fix-address
// One-time fix endpoint to correct a stored lowercase Solana address.
// Usage: PATCH /api/tokens/fix-address
// Body: { contract_address_wrong: "dmq...", contract_address_correct: "DmqQ..." }
tokenRouter.patch('/fix-address', async (req, res) => {
  try {
    const { contract_address_wrong, contract_address_correct } = req.body

    if (!contract_address_wrong || !contract_address_correct) {
      return res.status(400).json({ success: false, error: 'Both addresses required' })
    }

    const { data, error } = await supabase
      .from('launched_tokens')
      .update({ contract_address: contract_address_correct })
      .eq('contract_address', contract_address_wrong)
      .select()

    if (error) throw error

    res.json({
      success: true,
      message: `Updated ${data?.length || 0} row(s)`,
      data,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { tokenRouter }