// apps/api/src/index.js

require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const cron    = require('node-cron')

const { narrativeRouter } = require('./routes/narratives')
const { tokenRouter }     = require('./routes/tokens')
const { healthRouter }    = require('./routes/health')
const { generateRouter }  = require('./routes/generate')
const { runNarrativeCron } = require('./cron/narrativeCron')

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.WEB_URL,
      'http://localhost:3000',
      'https://1launch-web.vercel.app',
    ].filter(Boolean)
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin || allowed.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health',               healthRouter)
app.use('/api/narratives',       narrativeRouter)
app.use('/api/tokens',           tokenRouter)
app.use('/api/generate',         generateRouter)

const { deployRouter }        = require('./routes/deploy')
app.use('/api/deploy',           deployRouter)

const { launchedTokensRouter } = require('./routes/launchedTokens')
app.use('/api/launched-tokens',  launchedTokensRouter)

const { telegramRouter }       = require('./routes/telegram')
app.use('/api/telegram',         telegramRouter)

const { memekitRouter }        = require('./routes/memekit')
app.use('/api/memekit',          memekitRouter)

const { whitepaperRouter }     = require('./routes/whitepaper')
app.use('/api/whitepaper',       whitepaperRouter)

const { botRouter }            = require('./routes/bot')
app.use('/api/bot',              botRouter)

const { analyticsRouter }      = require('./routes/analytics')
app.use('/api/analytics',        analyticsRouter)

const { kolsRouter }           = require('./routes/kols')
app.use('/api/kols',             kolsRouter)

const { lplockRouter }         = require('./routes/lplock')
app.use('/api/lplock',           lplockRouter)

const { roadmapRouter }        = require('./routes/roadmap')
app.use('/api/roadmap',          roadmapRouter)

const { timingRouter }         = require('./routes/timing')
app.use('/api/timing',           timingRouter)

const { tokenSearchRouter }    = require('./routes/tokenSearch')
app.use('/api/token-search',     tokenSearchRouter)

const { subscriptionsRouter }  = require('./routes/subscriptions')
app.use('/api/subscriptions',    subscriptionsRouter)

const { adminRouter }          = require('./routes/admin')
app.use('/api/admin',            adminRouter)

// ── Cron Jobs ─────────────────────────────────────────────────────────────────

// Narrative scraper every 30 min
cron.schedule('0 * * * *', () => {
  console.log('[CRON] Running narrative scraper...')
  runNarrativeCron()
})

// Payment scan every 2 minutes
const { scanAllPayments } = require('./services/payments/paymentMonitor')
cron.schedule('*/2 * * * *', () => {
  scanAllPayments().catch(err => console.error('[PaymentScan]', err.message))
})

// Auto-expire subscriptions every hour
cron.schedule('0 * * * *', async () => {
  const { supabase } = require('./lib/supabase')
  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString())
    .catch(() => {})
  console.log('[CRON] Expired subscriptions checked')
})

// Renewal reminders daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  const { supabase } = require('./lib/supabase')
  const { sendNotification } = require('./services/telegram/telegramBot')
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const { data: expiring } = await supabase
    .from('subscriptions')
    .select('user_id, plan_id, expires_at, users(telegram_chat_id)')
    .eq('status', 'active')
    .lt('expires_at', in3days)
    .catch(() => ({ data: null }))

  if (!expiring?.length) return
  for (const sub of expiring) {
    if (sub.users?.telegram_chat_id) {
      await sendNotification(
        sub.users.telegram_chat_id,
        `*Subscription expiring soon*\n\nYour ${sub.plan_id} plan expires in 3 days.\nRenew at: ${process.env.WEB_URL}/pricing`
      ).catch(() => {})
    }
  }
  console.log(`[CRON] Sent ${expiring.length} renewal reminders`)
})

// Price alert check every 5 minutes
const { runPriceAlertCheck } = require('./cron/priceAlertCron')
cron.schedule('*/5 * * * *', () => {
  runPriceAlertCheck().catch(() => {})
})

// Copycat scan every hour
const { runCopycatScan } = require('./cron/copycatCron')
cron.schedule('0 * * * *', () => {
  console.log('[CRON] Running copycat scan...')
  runCopycatScan()
})

// ── Services on boot ──────────────────────────────────────────────────────────
const { startBot } = require('./services/telegram/telegramBot')
startBot()

const { restoreRunningSessions } = require('./services/bot/botManager')
restoreRunningSessions()

// Narrative cron runs on schedule only — not on startup
// Uncomment line below to force a manual run:
// runNarrativeCron()

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[API] 1launch API running on port ${PORT}`)
})
