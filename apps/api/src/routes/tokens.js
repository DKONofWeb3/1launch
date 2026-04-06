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
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/tokens/launched?wallet=0x...
tokenRouter.get('/launched', async (req, res) => {
  try {
    const { wallet } = req.query
    if (!wallet) return res.status(400).json({ success: false, error: 'wallet required' })

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (!user) return res.json({ success: true, data: [] })

    const { data, error } = await supabase
      .from('launched_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('launched_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { tokenRouter }

// GET /api/tokens/drafts?wallet=0x... — strict wallet required
tokenRouter.get('/drafts', async (req, res) => {
  try {
    const { wallet } = req.query

    // Strict: no wallet = no drafts
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
