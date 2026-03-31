// apps/api/src/routes/admin.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { PLANS } = require('../config/plans')

const adminRouter = Router()

// ── Simple admin key auth ──────────────────────────────────────────────────────
// Set ADMIN_SECRET in .env — pass as x-admin-key header
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}

adminRouter.use(adminAuth)

// ── GET /api/admin/overview ───────────────────────────────────────────────────
adminRouter.get('/overview', async (req, res) => {
  try {
    const now      = new Date()
    const month_start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: total_users },
      { count: total_tokens },
      { data: active_subs },
      { data: new_subs_month },
      { data: payments_month },
      { data: bot_sessions },
      { data: kol_bookings },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('launched_tokens').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan_id').eq('status', 'active').gt('expires_at', now.toISOString()),
      supabase.from('subscriptions').select('plan_id, started_at').gte('started_at', month_start),
      supabase.from('payments').select('usd_amount, status, created_at').eq('status', 'confirmed').gte('created_at', month_start),
      supabase.from('bot_sessions').select('tier, status').eq('status', 'running'),
      supabase.from('kol_bookings').select('budget').gte('created_at', month_start),
    ])

    // Calculate MRR from active subscriptions
    const mrr = (active_subs || []).reduce((sum, sub) => {
      const plan = PLANS[sub.plan_id]
      return sum + (plan?.price_usd || 0)
    }, 0)

    // Revenue this month
    const revenue_month = (payments_month || []).reduce((sum, p) => sum + (p.usd_amount || 0), 0)

    // KOL commission revenue (15%)
    const kol_revenue = (kol_bookings || []).reduce((sum, b) => sum + ((b.budget || 0) * 0.15), 0)

    // Plan breakdown
    const plan_breakdown = {}
    for (const plan of Object.values(PLANS)) {
      plan_breakdown[plan.id] = (active_subs || []).filter(s => s.plan_id === plan.id).length
    }

    // New subs this month breakdown
    const new_subs_breakdown = {}
    for (const sub of (new_subs_month || [])) {
      new_subs_breakdown[sub.plan_id] = (new_subs_breakdown[sub.plan_id] || 0) + 1
    }

    res.json({
      success: true,
      data: {
        mrr,
        revenue_month: revenue_month + kol_revenue,
        total_users:   total_users || 0,
        total_tokens:  total_tokens || 0,
        active_subs:   (active_subs || []).length,
        new_subs_month: (new_subs_month || []).length,
        active_bots:   (bot_sessions || []).length,
        plan_breakdown,
        new_subs_breakdown,
        kol_revenue_month: kol_revenue,
      }
    })
  } catch (err) {
    console.error('[GET /admin/overview]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/users ──────────────────────────────────────────────────────
adminRouter.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('users')
      .select(`
        id, wallet_address, created_at, telegram_chat_id,
        subscriptions(plan_id, status, expires_at),
        launched_tokens(count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (search) {
      query = query.ilike('wallet_address', `%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    res.json({ success: true, data, total: count })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/payments ───────────────────────────────────────────────────
adminRouter.get('/payments', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/tokens ─────────────────────────────────────────────────────
adminRouter.get('/tokens', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { data, error } = await supabase
      .from('launched_tokens')
      .select(`
        id, contract_address, chain, network, launched_at,
        token_drafts(name, ticker, logo_url),
        users(wallet_address)
      `)
      .order('launched_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/subscriptions ─────────────────────────────────────────────
adminRouter.get('/subscriptions', async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 50 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('subscriptions')
      .select(`*, users(wallet_address, telegram_chat_id)`)
      .order('started_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/subscriptions/manual-activate ────────────────────────────
// Manually activate a subscription (for support cases / edge case payments)
adminRouter.post('/subscriptions/manual-activate', async (req, res) => {
  try {
    const { user_id, plan_id, tx_hash, days = 30 } = req.body
    if (!user_id || !plan_id) return res.status(400).json({ success: false, error: 'user_id and plan_id required' })

    const { activateSubscription } = require('../services/payments/paymentMonitor')

    // Create a fake payment record
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        user_id,
        plan_id,
        chain:          'manual',
        token:          'manual',
        usd_amount:     PLANS[plan_id]?.price_usd || 0,
        status:         'confirmed',
        tx_hash:        tx_hash || 'manual_activation',
        confirmed_at:   new Date().toISOString(),
        created_at:     new Date().toISOString(),
      })
      .select()
      .single()

    await activateSubscription(user_id, plan_id, payment.id, tx_hash || 'manual_activation')

    res.json({ success: true, message: `${plan_id} plan activated for ${user_id}` })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/bots ───────────────────────────────────────────────────────
adminRouter.get('/bots', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select(`
        id, chain, tier, status, stats, created_at, started_at,
        launched_tokens(contract_address, token_drafts(name, ticker))
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GET /api/admin/revenue-chart ──────────────────────────────────────────────
// Daily revenue for the last 30 days
adminRouter.get('/revenue-chart', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('usd_amount, created_at')
      .eq('status', 'confirmed')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by day
    const days = {}
    for (const p of (data || [])) {
      const day = p.created_at.slice(0, 10)
      days[day] = (days[day] || 0) + (p.usd_amount || 0)
    }

    // Fill in missing days with 0
    const chart = []
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(Date.now() - i * 86400000)
      const day = d.toISOString().slice(0, 10)
      chart.push({ date: day, revenue: days[day] || 0 })
    }

    res.json({ success: true, data: chart })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── POST /api/admin/broadcast ─────────────────────────────────────────────────
// Send TG message to all users with linked chat IDs
adminRouter.post('/broadcast', async (req, res) => {
  try {
    const { message, plan_filter } = req.body
    if (!message) return res.status(400).json({ success: false, error: 'message required' })

    let query = supabase.from('users').select('telegram_chat_id').not('telegram_chat_id', 'is', null)

    if (plan_filter && plan_filter !== 'all') {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('plan_id', plan_filter)
        .eq('status', 'active')
      const ids = (subs || []).map(s => s.user_id)
      if (ids.length) query = query.in('id', ids)
    }

    const { data: users } = await query
    if (!users?.length) return res.json({ success: true, sent: 0 })

    const { sendNotification } = require('../services/telegram/telegramBot')
    let sent = 0
    for (const user of users) {
      try {
        await sendNotification(user.telegram_chat_id, message)
        sent++
      } catch {}
    }

    res.json({ success: true, sent })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { adminRouter }
