// apps/api/src/routes/subscriptions.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { PLANS, ADDONS } = require('../config/plans')
const { createPaymentRecord, getPriceInCrypto } = require('../services/payments/paymentMonitor')
const { attachSubscription, invalidateCache } = require('../middleware/subscriptionGate')

const subscriptionsRouter = Router()
subscriptionsRouter.use(attachSubscription)

// GET /api/subscriptions/plans — return all plans + pricing
subscriptionsRouter.get('/plans', (req, res) => {
  res.json({ success: true, data: PLANS })
})

// GET /api/subscriptions/addons — return all add-on prices
subscriptionsRouter.get('/addons', (req, res) => {
  res.json({ success: true, data: ADDONS })
})

// GET /api/subscriptions/me — get current subscription
subscriptionsRouter.get('/me', async (req, res) => {
  try {
    const wallet = req.headers['x-wallet-address'] || req.query.wallet
    if (!wallet) return res.json({ success: true, data: { plan: PLANS.free, subscription: null } })

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) return res.json({ success: true, data: { plan: PLANS.free, subscription: null } })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const isActive = sub && sub.status === 'active' && new Date(sub.expires_at) > new Date()
    const planId   = isActive ? sub.plan_id : 'free'

    res.json({
      success: true,
      data: {
        plan:         PLANS[planId] || PLANS.free,
        subscription: sub || null,
        is_active:    isActive,
        expires_at:   sub?.expires_at || null,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/subscriptions/initiate — create payment record, return payment details
subscriptionsRouter.post('/initiate', async (req, res) => {
  try {
    const { plan_id, chain, token, wallet } = req.body

    if (!plan_id || !chain || !token || !wallet) {
      return res.status(400).json({ success: false, error: 'plan_id, chain, token, wallet required' })
    }

    const plan = PLANS[plan_id]
    if (!plan || plan.price_usd === 0) {
      return res.status(400).json({ success: false, error: 'Invalid plan or free plan selected' })
    }

    // Check platform wallet is configured
    const platformWallet = chain === 'solana'
      ? process.env.SOLANA_PLATFORM_WALLET_ADDRESS
      : process.env.PLATFORM_WALLET_ADDRESS

    if (!platformWallet) {
      return res.status(503).json({
        success: false,
        error: 'Payment wallet not configured. Contact support.',
      })
    }

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) {
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({ wallet_address: wallet.toLowerCase(), plan: 'free', created_at: new Date().toISOString() })
        .select('id')
        .single()
        .catch(() => ({ data: null, error: null }))
      if (!newUser) {
        return res.status(500).json({ success: false, error: 'Failed to create user record' })
      }
      user = newUser
    }

    // Cancel any existing pending payments for this user
    await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .catch(() => {})

    const payment = await createPaymentRecord({
      userId:    user.id,
      planId:    plan_id,
      chain,
      token,
      usdAmount: plan.price_usd,
    })

    res.json({ success: true, data: payment })
  } catch (err) {
    console.error('[POST /subscriptions/initiate]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/subscriptions/payment/:paymentId — check payment status
subscriptionsRouter.get('/payment/:paymentId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', req.params.paymentId)
      .maybeSingle()

    if (error || !data) return res.status(404).json({ success: false, error: 'Payment not found' })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/subscriptions/history — payment history for a wallet
subscriptionsRouter.get('/history', async (req, res) => {
  try {
    const wallet = req.headers['x-wallet-address'] || req.query.wallet
    if (!wallet) return res.json({ success: true, data: [] })

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) return res.json({ success: true, data: [] })

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/subscriptions/cancel — cancel subscription (no refund, active until expiry)
subscriptionsRouter.post('/cancel', async (req, res) => {
  try {
    const wallet = req.headers['x-wallet-address'] || req.body.wallet
    if (!wallet) return res.status(400).json({ success: false, error: 'wallet required' })

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('user_id', user.id)

    invalidateCache(user.id)
    res.json({ success: true, message: 'Subscription cancelled. Access remains until expiry date.' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { subscriptionsRouter }
