// apps/api/src/middleware/subscriptionGate.js

const { supabase } = require('../lib/supabase')
const { PLANS } = require('../config/plans')

// Cache subscriptions for 60 seconds to avoid DB hammering
const cache = new Map()

async function getSubscription(userId) {
  if (!userId) return null

  const cached = cache.get(userId)
  if (cached && Date.now() - cached.ts < 60000) return cached.sub

  const { data } = await supabase
    .from('subscriptions')
    .select('plan_id, status, expires_at')
    .eq('user_id', userId)
    .single()
    .catch(() => ({ data: null }))

  const sub = data && data.status === 'active' && new Date(data.expires_at) > new Date()
    ? data
    : { plan_id: 'free', status: 'active' }

  cache.set(userId, { sub, ts: Date.now() })
  return sub
}

// Middleware: attach subscription to req
async function attachSubscription(req, res, next) {
  try {
    const wallet = req.headers['x-wallet-address'] || req.query.wallet
    if (!wallet) {
      req.subscription = { plan_id: 'free' }
      req.plan = PLANS.free
      return next()
    }

    // Look up user by wallet
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .single()
      .catch(() => ({ data: null }))

    if (!user) {
      req.subscription = { plan_id: 'free' }
      req.plan = PLANS.free
      return next()
    }

    req.userId = user.id
    const sub  = await getSubscription(user.id)
    req.subscription = sub
    req.plan = PLANS[sub.plan_id] || PLANS.free
    next()
  } catch {
    req.subscription = { plan_id: 'free' }
    req.plan = PLANS.free
    next()
  }
}

// Gate: require a specific feature to be enabled on the plan
function requireFeature(featureName) {
  return (req, res, next) => {
    const plan = req.plan || PLANS.free
    if (plan.features?.[featureName]) return next()

    return res.status(403).json({
      success: false,
      error:   'upgrade_required',
      message: `This feature requires a higher plan. Upgrade to access ${featureName}.`,
      feature: featureName,
      current_plan: plan.id,
    })
  }
}

// Gate: require minimum plan level
function requirePlan(...planIds) {
  return (req, res, next) => {
    const plan = req.plan || PLANS.free
    if (planIds.includes(plan.id)) return next()

    return res.status(403).json({
      success: false,
      error:   'upgrade_required',
      message: `This feature requires one of: ${planIds.join(', ')} plan.`,
      current_plan: plan.id,
    })
  }
}

// Invalidate cache for a user (call after subscription change)
function invalidateCache(userId) {
  cache.delete(userId)
}

module.exports = { attachSubscription, requireFeature, requirePlan, getSubscription, invalidateCache }
