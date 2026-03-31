// apps/api/src/routes/tokenSearch.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { checkNarrativeSaturation, findCopycats } = require('../services/tokenSearchService')

const tokenSearchRouter = Router()

// GET /api/token-search/saturation?name=X&ticker=Y
tokenSearchRouter.get('/saturation', async (req, res) => {
  try {
    const { name, ticker } = req.query
    if (!name || !ticker) {
      return res.status(400).json({ success: false, error: 'name and ticker required' })
    }

    const result = await checkNarrativeSaturation(name, ticker)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[GET /saturation]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/token-search/copycats/:tokenId
tokenSearchRouter.get('/copycats/:tokenId', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain, launched_at, token_drafts(name, ticker)')
      .eq('id', req.params.tokenId)
      .single()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const draft = token.token_drafts
    const copycats = await findCopycats(
      draft.name,
      draft.ticker,
      token.contract_address,
      token.launched_at
    )

    // Also get previously stored alerts
    const { data: stored } = await supabase
      .from('copycat_alerts')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('detected_at', { ascending: false })

    res.json({
      success: true,
      data: {
        live:   copycats,
        stored: stored || [],
        total:  copycats.length,
      }
    })
  } catch (err) {
    console.error('[GET /copycats]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { tokenSearchRouter }
