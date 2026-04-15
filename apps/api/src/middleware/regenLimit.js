// apps/api/src/middleware/regenLimit.js
//
// Limits how many times a user can regenerate token details for a draft.
// Free tier: max 2 regens per draft (initial generation doesn't count).
// When paid tiers launch, pass plan through and remove the cap for pro/agency.

const { supabase } = require('../lib/supabase')

const REGEN_LIMIT = {
  free:    2,
  builder: 2,
  pro:     Infinity,
  agency:  Infinity,
}

async function checkRegenLimit(req, res, next) {
  try {
    const { draft_id, wallet_address } = req.body

    // If no draft_id it's a fresh generation — always allowed
    if (!draft_id) return next()

    // Look up user plan
    const { data: user } = await supabase
      .from('users')
      .select('id, plan')
      .eq('wallet_address', (wallet_address || '').toLowerCase())
      .maybeSingle()

    const plan  = user?.plan || 'free'
    const limit = REGEN_LIMIT[plan] ?? 2

    if (limit === Infinity) return next()

    // Count existing regens for this draft
    const { count } = await supabase
      .from('token_regens')
      .select('id', { count: 'exact', head: true })
      .eq('draft_id', draft_id)
      .eq('user_id', user?.id)

    if ((count || 0) >= limit) {
      return res.status(429).json({
        success: false,
        error:   `Regeneration limit reached (${limit}/${limit}). Upgrade to Pro for unlimited regenerations.`,
        code:    'REGEN_LIMIT_REACHED',
        limit,
        used:    count,
      })
    }

    // Record this regen attempt
    await supabase
      .from('token_regens')
      .insert({ draft_id, user_id: user?.id, created_at: new Date().toISOString() })

    next()
  } catch (err) {
    // Don't block the request if tracking fails
    console.error('[regenLimit]', err.message)
    next()
  }
}

module.exports = { checkRegenLimit }