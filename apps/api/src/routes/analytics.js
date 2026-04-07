// apps/api/src/routes/analytics.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { getSnipers, getHolders } = require('../services/onchainAnalytics')

const analyticsRouter = Router()

// GET /api/analytics/:tokenId/snipers
analyticsRouter.get('/:tokenId/snipers', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain')
      .eq('id', req.params.tokenId)
      .maybeSingle()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const snipers = await getSnipers(
      token.contract_address,
      token.chain,
      'mainnet'
    )

    res.json({ success: true, data: snipers })
  } catch (err) {
    console.error('[GET /analytics/snipers]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/analytics/:tokenId/holders
analyticsRouter.get('/:tokenId/holders', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain, token_drafts(total_supply)')
      .eq('id', req.params.tokenId)
      .maybeSingle()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const totalSupply = token.token_drafts?.total_supply
    const holders = await getHolders(
      token.contract_address,
      token.chain,
      totalSupply,
      'mainnet'
    )

    // Tag whales (>1% of supply)
    const tagged = holders.map(h => ({
      ...h,
      is_whale: h.percentage >= 1,
      label: h.percentage >= 5
        ? 'mega_whale'
        : h.percentage >= 1
        ? 'whale'
        : 'holder',
    }))

    res.json({ success: true, data: tagged })
  } catch (err) {
    console.error('[GET /analytics/holders]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { analyticsRouter }
