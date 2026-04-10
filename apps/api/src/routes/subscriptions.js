// apps/api/src/routes/subscriptions.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { PLANS, ADDONS } = require('../config/plans')
const { createPaymentRecord } = require('../services/payments/paymentMonitor')
const { attachSubscription, invalidateCache } = require('../middleware/subscriptionGate')

const subscriptionsRouter = Router()
subscriptionsRouter.use(attachSubscription)

subscriptionsRouter.get('/plans', (req, res) => {
  res.json({ success: true, data: PLANS })
})

subscriptionsRouter.get('/addons', (req, res) => {
  res.json({ success: true, data: ADDONS })
})

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

subscriptionsRouter.post('/initiate', async (req, res) => {
  try {
    const { plan_id, chain, token, wallet } = req.body

    if (!plan_id || !chain || !token || !wallet) {
      return res.status(400).json({ success: false, error: 'plan_id, chain, token, wallet required' })
    }

    let plan = PLANS[plan_id]
    if (!plan && plan_id === 'deploy_fee') {
      plan = chain === 'solana' ? PLANS['deploy_fee_sol'] : PLANS['deploy_fee_bsc']
    }
    // Support volbot plans
    if (!plan && plan_id.startsWith('volbot_')) {
      const tier = plan_id.replace('volbot_', '')
      const prices = { starter: 29, growth: 79, pro: 149 }
      if (prices[tier]) {
        plan = { id: plan_id, name: `Volume Bot ${tier}`, price_usd: prices[tier] }
      }
    }
    if (!plan || plan.price_usd === 0) {
      return res.status(400).json({ success: false, error: 'Invalid plan' })
    }

    const platformWallet = chain === 'solana'
      ? process.env.SOLANA_PLATFORM_WALLET_ADDRESS
      : process.env.PLATFORM_WALLET_ADDRESS

    if (!platformWallet) {
      return res.status(503).json({ success: false, error: 'Payment wallet not configured.' })
    }

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet.toLowerCase())
      .maybeSingle()

    if (!user) {
      try {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ wallet_address: wallet.toLowerCase(), plan: 'free', created_at: new Date().toISOString() })
          .select('id')
          .single()
        user = newUser
      } catch {
        return res.status(500).json({ success: false, error: 'Failed to create user record' })
      }
    }

    if (!user) return res.status(500).json({ success: false, error: 'Failed to get or create user' })

    // Cancel existing pending payments
    try {
      await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending')
    } catch {}

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

subscriptionsRouter.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('id, status, confirmed_at, plan_id, crypto_amount, chain')
      .eq('id', req.params.paymentId)
      .maybeSingle()
    if (error || !data) return res.status(404).json({ success: false, error: 'Payment not found' })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

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

    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

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
    res.json({ success: true, message: 'Subscription cancelled.' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

subscriptionsRouter.post('/confirm-deploy-payment', async (req, res) => {
  try {
    const { payment_id, tx_hash } = req.body
    if (!payment_id) return res.status(400).json({ success: false, error: 'payment_id required' })

    await supabase
      .from('payments')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), tx_hash })
      .eq('id', payment_id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { subscriptionsRouter }
