// apps/api/src/middleware/regenLimit.js
//
// Limits token regeneration to 2 times per draft for free users.
// Pro/Builder/Agency: unlimited.

const { supabase } = require('../lib/supabase')

const REGEN_LIMIT_FREE = 2

async function checkRegenLimit(req, res, next) {
  try {
    const { draft_id } = req.body

    // No draft yet = first generation, always allow
    if (!draft_id) return next()

    const { data: draft, error } = await supabase
      .from('token_drafts')
      .select('id, regen_count, user_id')
      .eq('id', draft_id)
      .maybeSingle()

    if (error || !draft) return next()

    // Check plan — paid tiers get unlimited
    if (draft.user_id) {
      const { data: user } = await supabase
        .from('users').select('plan').eq('id', draft.user_id).maybeSingle()

      if (['pro', 'agency', 'builder'].includes(user?.plan)) return next()
    }

    const currentCount = draft.regen_count || 0

    if (currentCount >= REGEN_LIMIT_FREE) {
      return res.status(429).json({
        success:     false,
        error:       'Regeneration limit reached',
        code:        'REGEN_LIMIT',
        message:     `Free tier allows ${REGEN_LIMIT_FREE} regenerations per token. Upgrade to Pro for unlimited.`,
        regen_count: currentCount,
        regen_limit: REGEN_LIMIT_FREE,
      })
    }

    // Increment and allow
    await supabase
      .from('token_drafts')
      .update({ regen_count: currentCount + 1 })
      .eq('id', draft_id)

    next()
  } catch (err) {
    console.error('[regenLimit]', err.message)
    next() // never block on middleware error
  }
}

module.exports = { checkRegenLimit }