// apps/api/src/routes/admin.js

const { Router }   = require('express')
const { supabase } = require('../lib/supabase')

const adminRouter = Router()

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}
adminRouter.use(requireAdmin)

// GET /api/admin/overview
adminRouter.get('/overview', async (req, res) => {
  try {
    const now       = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Confirmed payments
    const { data: allPayments } = await supabase
      .from('payments')
      .select('usd_amount, plan_id, created_at')
      .eq('status', 'confirmed')

    const payments       = allPayments || []
    const revenue_total  = payments.reduce((s, p) => s + (p.usd_amount || 0), 0)
    const revenue_month  = payments.filter(p => p.created_at >= monthStart).reduce((s, p) => s + (p.usd_amount || 0), 0)
    const volbot_revenue = payments.filter(p => p.plan_id?.startsWith('volbot_')).reduce((s, p) => s + (p.usd_amount || 0), 0)

    // Tokens
    const { data: allTokens } = await supabase
      .from('launched_tokens')
      .select('id, chain, launched_at, token_drafts(name, ticker), users(wallet_address)')
      .order('launched_at', { ascending: false })

    const tokens       = allTokens || []
    const total_tokens = tokens.length
    const tokens_month = tokens.filter(t => t.launched_at >= monthStart).length
    const bsc_tokens   = tokens.filter(t => t.chain === 'bsc').length
    const sol_tokens   = tokens.filter(t => t.chain === 'solana').length
    const recent_tokens = tokens.slice(0, 5).map(t => ({
      name:        t.token_drafts?.name,
      ticker:      t.token_drafts?.ticker,
      chain:       t.chain,
      launched_at: t.launched_at,
    }))

    // Users
    const { count: total_users } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: tg_linked_users } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('telegram_id', 'is', null)

    res.json({
      success: true,
      data: {
        revenue_total,
        revenue_month,
        volbot_revenue,
        total_tokens,
        tokens_month,
        bsc_tokens,
        sol_tokens,
        recent_tokens,
        total_users:    total_users || 0,
        tg_linked_users: tg_linked_users || 0,
      }
    })
  } catch (err) {
    console.error('[Admin overview]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/revenue-chart — last 30 days
adminRouter.get('/revenue-chart', async (req, res) => {
  try {
    const days = 30
    const chart = []

    for (let i = days - 1; i >= 0; i--) {
      const d     = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const start   = `${dateStr}T00:00:00.000Z`
      const end     = `${dateStr}T23:59:59.999Z`

      const { data } = await supabase
        .from('payments')
        .select('usd_amount')
        .eq('status', 'confirmed')
        .gte('created_at', start)
        .lte('created_at', end)

      chart.push({
        date:    dateStr,
        revenue: (data || []).reduce((s, p) => s + (p.usd_amount || 0), 0),
      })
    }

    res.json({ success: true, data: chart })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users
adminRouter.get('/users', async (req, res) => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, wallet_address, telegram_id, telegram_username, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!users) return res.json({ success: true, data: [] })

    // Enrich with token count and total spend
    const enriched = await Promise.all(users.map(async u => {
      const { count: token_count } = await supabase
        .from('launched_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)

      const { data: payments } = await supabase
        .from('payments')
        .select('usd_amount')
        .eq('user_id', u.id)
        .eq('status', 'confirmed')

      return {
        ...u,
        token_count:  token_count || 0,
        total_spent: (payments || []).reduce((s, p) => s + (p.usd_amount || 0), 0),
      }
    }))

    res.json({ success: true, data: enriched })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/payments
adminRouter.get('/payments', async (req, res) => {
  try {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/tokens
adminRouter.get('/tokens', async (req, res) => {
  try {
    const { data } = await supabase
      .from('launched_tokens')
      .select('id, contract_address, chain, launched_at, market_cap_usd, token_drafts(name, ticker), users(wallet_address, telegram_username)')
      .order('launched_at', { ascending: false })
      .limit(200)

    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/broadcast
adminRouter.post('/broadcast', async (req, res) => {
  try {
    const { message, plan_filter } = req.body
    if (!message) return res.status(400).json({ success: false, error: 'message required' })

    let query = supabase.from('users').select('telegram_chat_id').not('telegram_chat_id', 'is', null)

    if (plan_filter === 'launched') {
      const { data: launched } = await supabase.from('launched_tokens').select('user_id')
      const ids = [...new Set((launched || []).map(t => t.user_id))]
      query = query.in('id', ids)
    } else if (plan_filter === 'no_launch') {
      const { data: launched } = await supabase.from('launched_tokens').select('user_id')
      const ids = [...new Set((launched || []).map(t => t.user_id))]
      if (ids.length) query = query.not('id', 'in', `(${ids.join(',')})`)
    }

    const { data: users } = await query

    const { sendNotification } = require('../services/telegram/telegramBot')
    let sent = 0
    for (const user of (users || [])) {
      if (!user.telegram_chat_id) continue
      await sendNotification(user.telegram_chat_id, message).catch(() => {})
      await new Promise(r => setTimeout(r, 60))
      sent++
    }

    res.json({ success: true, sent })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { adminRouter }
