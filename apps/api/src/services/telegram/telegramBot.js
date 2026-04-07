// apps/api/src/services/telegram/telegramBot.js

const { Telegraf, Markup } = require('telegraf')
const { supabase }         = require('../../lib/supabase')
const { getTokenData }     = require('../dexscreenerService')

let bot        = null
let botStarted = false

function getAppUrl() { return process.env.WEB_URL || null }

// ── Main keyboard shown after every interaction ───────────────────────────────
function mainKeyboard() {
  return Markup.keyboard([
    ['🔥 Narratives',  '🚀 Launch Token'],
    ['💼 My Tokens',   '🔔 Alerts'],
    ['📊 Market',      '💎 Subscribe'],
    ['⚙️ Settings',    '❓ Help'],
  ]).resize()
}

// ── Format large numbers ──────────────────────────────────────────────────────
function fmt(n) {
  if (!n || n === 0) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(6)}`
}

// ── Get or create user by telegram ID ────────────────────────────────────────
async function getOrCreateUser(ctx) {
  const tgId       = String(ctx.from.id)
  const tgUsername = ctx.from.username || null
  const chatId     = String(ctx.chat?.id || ctx.from.id)

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, wallet_address, plan')
      .eq('telegram_id', tgId)
      .maybeSingle()

    if (existing) {
      // Update chat_id and username if changed
      await supabase
        .from('users')
        .update({ telegram_chat_id: chatId, telegram_username: tgUsername })
        .eq('telegram_id', tgId)
      return existing
    }

    // Create new user
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        telegram_id:       tgId,
        telegram_username: tgUsername,
        telegram_chat_id:  chatId,
        plan:              'free',
        created_at:        new Date().toISOString(),
      })
      .select('id, wallet_address, plan')
      .single()
    console.log(`[TG] New user: ${tgUsername || tgId}`)
    return newUser
  } catch (err) {
    console.warn('[TG] getOrCreateUser failed:', err.message)
    return null
  }
}

function setupHandlers(bot) {

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const name   = ctx.from.first_name || 'degen'
    const user   = await getOrCreateUser(ctx)
    const appUrl = getAppUrl()

    const welcomeMsg =
      `gm ${name}. Welcome to *1launch*.\n\n` +
      `AI-powered memecoin launcher.\n` +
      `Narrative to live token in under 5 minutes.\n\n` +
      `Pick an option below to get started.`

    const buttons = [[Markup.button.webApp('Open 1launch App', `${appUrl}/dashboard`)]]

    await ctx.reply(welcomeMsg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    })

    await ctx.reply('Or use the menu below:', mainKeyboard())
  })

  // ── Narratives ──────────────────────────────────────────────────────────────
  bot.hears(['🔥 Narratives', '/narratives'], async (ctx) => {
    try {
      const { data: narratives } = await supabase
        .from('narratives')
        .select('id, title, hype_score, estimated_window, suggested_tickers, tokens_launched, why_it_works')
        .gt('expires_at', new Date().toISOString())
        .order('hype_score', { ascending: false })
        .limit(5)

      if (!narratives?.length) {
        return ctx.reply('No active narratives right now. Check back in 30 minutes.', mainKeyboard())
      }

      const appUrl = getAppUrl()

      for (const n of narratives) {
        const tickers  = (n.suggested_tickers || []).slice(0, 3).map(t => `$${t}`).join(' · ')
        const bar      = '█'.repeat(Math.floor(n.hype_score / 10)) + '░'.repeat(10 - Math.floor(n.hype_score / 10))
        const launched = n.tokens_launched > 0 ? `\n⚡ ${n.tokens_launched} token(s) already launched` : ''
        const why      = n.why_it_works ? `\n_${n.why_it_works}_` : ''

        const msg =
          `*${n.title}*\n` +
          `${bar} ${n.hype_score}/100\n` +
          `Window: ${n.estimated_window}${launched}\n` +
          `Tickers: ${tickers}` +
          why

        const buttons = appUrl
          ? Markup.inlineKeyboard([[Markup.button.url('Launch This Token', `${appUrl}/launch?narrative=${n.id}`)]])
          : {}

        await ctx.reply(msg, { parse_mode: 'Markdown', ...buttons })
        await new Promise(r => setTimeout(r, 300)) // slight delay between messages
      }

      await ctx.reply('Tap a narrative above to launch from it.', mainKeyboard())
    } catch (err) {
      console.error('[TG narratives]', err.message)
      ctx.reply('Failed to fetch narratives.', mainKeyboard())
    }
  })

  // ── Launch Token ────────────────────────────────────────────────────────────
  bot.hears(['🚀 Launch Token', '/launch'], async (ctx) => {
    const appUrl = getAppUrl()
    if (!appUrl) return ctx.reply('Platform unavailable.', mainKeyboard())

    await ctx.reply(
      '*Launch a Token*\n\nChoose a narrative from the feed, or start fresh with your own idea.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Browse Narratives + Launch', `${appUrl}/dashboard`)],
          [Markup.button.url('Launch Custom Token', `${appUrl}/launch`)],
        ]),
      }
    )
  })

  // ── My Tokens ───────────────────────────────────────────────────────────────
  bot.hears(['💼 My Tokens', '/mytokens'], async (ctx) => {
    const user = await getOrCreateUser(ctx)
    if (!user) return ctx.reply('Something went wrong. Try /start again.', mainKeyboard())

    try {
      const { data: tokens } = await supabase
        .from('launched_tokens')
        .select('id, contract_address, chain, launched_at, token_drafts(name, ticker)')
        .eq('user_id', user.id)
        .order('launched_at', { ascending: false })
        .limit(5)

      if (!tokens?.length) {
        const appUrl = getAppUrl()
        return ctx.reply(
          'No tokens launched yet.\n\nUse the Launch Token button to create your first token.',
          {
            ...Markup.inlineKeyboard([[Markup.button.url('Launch Now', `${appUrl}/dashboard`)]]),
          }
        )
      }

      const appUrl = getAppUrl()

      for (const t of tokens) {
        const draft  = t.token_drafts
        const market = await getTokenData(t.contract_address, t.chain).catch(() => null)
        const price  = market?.price_usd ? `$${market.price_usd.toFixed(8)}` : 'No pair yet'
        const mcap   = market?.market_cap_usd ? fmt(market.market_cap_usd) : '—'
        const change = market?.price_change_24h != null
          ? ` (${market.price_change_24h >= 0 ? '+' : ''}${market.price_change_24h.toFixed(2)}%)`
          : ''

        const msg =
          `*${draft?.name}* ($${draft?.ticker})\n` +
          `Chain: ${t.chain.toUpperCase()}\n` +
          `Price: ${price}${change}\n` +
          `MCap: ${mcap}\n` +
          `\`${t.contract_address}\``

        const tokenUrl = appUrl ? `${appUrl}/dashboard/tokens/${t.id}` : null
        await ctx.reply(msg, {
          parse_mode: 'Markdown',
          ...(tokenUrl ? Markup.inlineKeyboard([[Markup.button.url('View Dashboard', tokenUrl)]]) : {}),
        })
        await new Promise(r => setTimeout(r, 300))
      }

      await ctx.reply(`${tokens.length} token(s) shown.`, mainKeyboard())
    } catch (err) {
      console.error('[TG myTokens]', err.message)
      ctx.reply('Failed to fetch tokens.', mainKeyboard())
    }
  })

  // ── Alerts menu ─────────────────────────────────────────────────────────────
  bot.hears(['🔔 Alerts', '/alerts'], async (ctx) => {
    await ctx.reply(
      '*Alerts*\n\nWhat kind of alert do you want to set?',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('Price Alert', 'alert_price')],
          [Markup.button.callback('MCap Milestone', 'alert_mcap')],
          [Markup.button.callback('New Hot Narrative (80+)', 'alert_narrative')],
          [Markup.button.callback('View My Alerts', 'alert_list')],
          [Markup.button.callback('Clear All Alerts', 'alert_clear')],
        ]),
      }
    )
  })

  bot.action('alert_price', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply(
      'Set a price alert:\n\n' +
      'Send: `/setalert price <contract> <chain> <target_price>`\n\n' +
      'Example:\n`/setalert price 0x1ee8... bsc 0.0001`',
      { parse_mode: 'Markdown' }
    )
  })

  bot.action('alert_mcap', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply(
      'Set an MCap milestone alert:\n\n' +
      'Send: `/setalert mcap <contract> <chain> <target_mcap_usd>`\n\n' +
      'Example:\n`/setalert mcap 0x1ee8... bsc 100000`\n(alerts at $100K mcap)',
      { parse_mode: 'Markdown' }
    )
  })

  bot.action('alert_narrative', async (ctx) => {
    await ctx.answerCbQuery()
    const chatId = String(ctx.from.id)
    try {
      await supabase.from('price_alerts').insert({
        telegram_chat_id: chatId,
        alert_type:       'narrative',
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      await ctx.reply('Done. You will be notified when a narrative scores 80+ (NUKE level).', mainKeyboard())
    } catch {
      ctx.reply('Failed to set alert. Try again.')
    }
  })

  bot.action('alert_list', async (ctx) => {
    await ctx.answerCbQuery()
    const chatId = String(ctx.from.id)
    const { data } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('telegram_chat_id', chatId)
      .eq('triggered', false)

    if (!data?.length) return ctx.reply('No active alerts.', mainKeyboard())

    const lines = data.map(a => {
      if (a.alert_type === 'narrative') return '🔥 Hot narrative (80+)'
      if (a.alert_type === 'mcap')      return `📈 MCap milestone: ${fmt(a.target_price)} — ${a.contract_address?.slice(0, 10)}...`
      return `💰 Price: $${a.target_price} — ${a.contract_address?.slice(0, 10)}...`
    }).join('\n')

    ctx.reply(`*Active Alerts*\n\n${lines}`, { parse_mode: 'Markdown', ...mainKeyboard() })
  })

  bot.action('alert_clear', async (ctx) => {
    await ctx.answerCbQuery()
    const chatId = String(ctx.from.id)
    await supabase.from('price_alerts').update({ triggered: true }).eq('telegram_chat_id', chatId).eq('triggered', false)
    ctx.reply('All alerts cleared.', mainKeyboard())
  })

  // /setalert command
  bot.command('setalert', async (ctx) => {
    const parts = ctx.message.text.trim().split(/\s+/)
    const type  = parts[1]
    const addr  = parts[2]
    const chain = parts[3] || 'bsc'
    const value = parseFloat(parts[4])
    const chatId = String(ctx.from.id)

    if (!type || !addr || isNaN(value)) {
      return ctx.reply('Invalid format. Use /alerts to see examples.', mainKeyboard())
    }

    try {
      await supabase.from('price_alerts').insert({
        telegram_chat_id: chatId,
        alert_type:       type,
        contract_address: addr,
        chain,
        target_price:     value,
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      const label = type === 'mcap' ? `MCap milestone at ${fmt(value)}` : `Price alert at $${value}`
      ctx.reply(`Alert set: ${label}`, mainKeyboard())
    } catch {
      ctx.reply('Failed to set alert.', mainKeyboard())
    }
  })

  // ── Market overview ─────────────────────────────────────────────────────────
  bot.hears(['📊 Market', '/market'], async (ctx) => {
    await ctx.reply('Fetching market data...')
    try {
      const res = await require('axios').get(
        'https://api.alternative.me/fng/',
        { timeout: 6000 }
      )
      const fg    = res.data?.data?.[0]
      const value = parseInt(fg?.value || 50)
      const label = fg?.value_classification || 'Neutral'
      const bar   = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10))

      const { data: narratives } = await supabase
        .from('narratives')
        .select('title, hype_score')
        .gt('expires_at', new Date().toISOString())
        .order('hype_score', { ascending: false })
        .limit(3)

      let msg =
        `*Market Overview*\n\n` +
        `Fear & Greed: ${bar}\n` +
        `${value}/100 — *${label}*\n\n`

      if (narratives?.length) {
        msg += `*Top Narratives Right Now:*\n`
        narratives.forEach((n, i) => {
          msg += `${i + 1}. ${n.title} (${n.hype_score}/100)\n`
        })
      }

      const rec = value >= 70 ? 'Good time to launch.' : value >= 45 ? 'Decent conditions.' : 'Cautious market — launch anyway if narrative is strong.'
      msg += `\n_${rec}_`

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard() })
    } catch {
      ctx.reply('Failed to fetch market data.', mainKeyboard())
    }
  })

  // ── Subscribe ───────────────────────────────────────────────────────────────
  bot.hears(['💎 Subscribe', '/subscribe'], async (ctx) => {
    const appUrl = getAppUrl()
    const msg =
      '*1launch Plans*\n\n' +
      '🆓 *Free* — 1 launch, core tools\n' +
      '🔨 *Builder* — $49/mo — 5 launches, full toolkit\n' +
      '⚡ *Pro* — $149/mo — unlimited, vol bot included\n' +
      '🏢 *Agency* — $499/mo — white-label, priority\n\n' +
      'Pay with BNB, SOL, USDT or USDC.\n' +
      'Auto-activates within 2 minutes.'

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...(appUrl ? Markup.inlineKeyboard([[Markup.button.url('View Plans & Pay', `${appUrl}/pricing`)]]) : {}),
    })
  })

  // ── Settings ────────────────────────────────────────────────────────────────
  bot.hears(['⚙️ Settings', '/settings'], async (ctx) => {
    const user   = await getOrCreateUser(ctx)
    const appUrl = getAppUrl()

    const wallet = user?.wallet_address
      ? `✅ Wallet: \`${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-4)}\``
      : '❌ No wallet linked'

    const plan = user?.plan
      ? `Plan: *${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}*`
      : 'Plan: Free'

    const msg = `*Your Account*\n\n${wallet}\n${plan}\n\nLink your wallet on the web app to connect your TG and web accounts.`

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...(appUrl ? Markup.inlineKeyboard([[Markup.button.url('Open Account Settings', `${appUrl}/dashboard`)]]) : {}),
    })
  })

  // ── Help ────────────────────────────────────────────────────────────────────
  bot.hears(['❓ Help', '/help'], async (ctx) => {
    await ctx.reply(
      '*1launch Bot Commands*\n\n' +
      '🔥 *Narratives* — Browse trending meme narratives\n' +
      '🚀 *Launch Token* — Start a token launch\n' +
      '💼 *My Tokens* — View your launched tokens\n' +
      '🔔 *Alerts* — Price, MCap & narrative alerts\n' +
      '📊 *Market* — Fear & Greed + top narratives\n' +
      '💎 *Subscribe* — View & upgrade plans\n' +
      '⚙️ *Settings* — Account & wallet info\n\n' +
      'Use the keyboard buttons below to navigate.',
      { parse_mode: 'Markdown', ...mainKeyboard() }
    )
  })

  // ── /token quick lookup ─────────────────────────────────────────────────────
  bot.command('token', async (ctx) => {
    const args    = ctx.message.text.split(' ')
    const address = args[1]
    const chain   = args[2] || 'bsc'

    if (!address) {
      return ctx.reply('Usage: /token <address> <chain>\nExample: /token 0x1ee8... bsc', mainKeyboard())
    }

    await ctx.reply('Fetching...')
    try {
      const data = await getTokenData(address, chain)
      if (!data) return ctx.reply('No DEX pair found. Add liquidity first.', mainKeyboard())

      const change = data.price_change_24h
      const msg =
        `*Token Data*\n\n` +
        `Price: $${data.price_usd?.toFixed(8)}\n` +
        `MCap: ${fmt(data.market_cap_usd)}\n` +
        `Vol 24h: ${fmt(data.volume_24h)}\n` +
        `24h: ${change >= 0 ? '+' : ''}${change?.toFixed(2)}%\n` +
        `Liquidity: ${fmt(data.liquidity_usd)}`

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard() })
    } catch {
      ctx.reply('Failed. Try again.', mainKeyboard())
    }
  })

  // ── Daily digest ────────────────────────────────────────────────────────────
  // Called by cron, not directly by users
  bot.command('digest', async (ctx) => {
    // Only allow from admin
    if (String(ctx.from.id) !== process.env.ADMIN_TELEGRAM_ID) return
    await sendDailyDigest()
    ctx.reply('Digest sent.')
  })

  bot.catch((err) => {
    console.error('[TelegramBot] Error:', err.message)
  })
}

// ── Send daily digest to all users ───────────────────────────────────────────
async function sendDailyDigest() {
  try {
    const { data: narratives } = await supabase
      .from('narratives')
      .select('title, hype_score, suggested_tickers')
      .gt('expires_at', new Date().toISOString())
      .order('hype_score', { ascending: false })
      .limit(5)

    if (!narratives?.length) return

    const appUrl = getAppUrl()
    const lines  = narratives.map((n, i) =>
      `${i + 1}. *${n.title}* — ${n.hype_score}/100\n   ${(n.suggested_tickers || []).slice(0, 2).map(t => `$${t}`).join(' / ')}`
    ).join('\n\n')

    const msg =
      `*gm. Today's Top Narratives*\n\n${lines}\n\n` +
      (appUrl ? `Launch from the feed: ${appUrl}/dashboard` : '')

    const { data: users } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    let sent = 0
    for (const user of (users || [])) {
      await sendNotification(user.telegram_chat_id, msg).catch(() => {})
      await new Promise(r => setTimeout(r, 50))
      sent++
    }
    console.log(`[TG] Daily digest sent to ${sent} users`)
  } catch (err) {
    console.error('[TG] Daily digest failed:', err.message)
  }
}

// ── Alert checker — called by cron ───────────────────────────────────────────
async function checkPriceAlerts() {
  try {
    // Price + MCap alerts
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('triggered', false)
      .not('contract_address', 'is', null)
      .limit(50)

    for (const alert of (alerts || [])) {
      try {
        const market = await getTokenData(alert.contract_address, alert.chain || 'bsc')
        if (!market) continue

        const currentValue = alert.alert_type === 'mcap'
          ? market.market_cap_usd
          : market.price_usd

        if (currentValue >= alert.target_price) {
          const label = alert.alert_type === 'mcap'
            ? `MCap hit ${fmt(currentValue)}`
            : `Price hit $${market.price_usd?.toFixed(8)}`

          await sendNotification(
            alert.telegram_chat_id,
            `*Alert Triggered*\n\n${label}\nContract: \`${alert.contract_address.slice(0, 10)}...\``,
          )

          await supabase
            .from('price_alerts')
            .update({ triggered: true, triggered_at: new Date().toISOString() })
            .eq('id', alert.id)
        }
      } catch {}
    }

    // Narrative alerts — notify when hype_score >= 80
    const { data: narrativeAlerts } = await supabase
      .from('price_alerts')
      .select('telegram_chat_id')
      .eq('alert_type', 'narrative')
      .eq('triggered', false)

    if (narrativeAlerts?.length) {
      const { data: hotNarratives } = await supabase
        .from('narratives')
        .select('title, hype_score, id')
        .gte('hype_score', 80)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (hotNarratives?.length) {
        const n      = hotNarratives[0]
        const appUrl = getAppUrl()
        const msg    =
          `*Hot Narrative Alert*\n\n` +
          `*${n.title}*\nScore: ${n.hype_score}/100\n\n` +
          (appUrl ? `Launch now: ${appUrl}/launch?narrative=${n.id}` : '')

        for (const a of narrativeAlerts) {
          await sendNotification(a.telegram_chat_id, msg).catch(() => {})
          await new Promise(r => setTimeout(r, 50))
        }
      }
    }
  } catch (err) {
    console.error('[TG] checkPriceAlerts failed:', err.message)
  }
}

// ── Send notification helper ──────────────────────────────────────────────────
async function sendNotification(chatId, message, options = {}) {
  const b = getBot()
  if (!b || !chatId) return
  try {
    await b.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...options,
    })
  } catch (err) {
    console.warn('[TelegramBot] Notification failed:', err.message?.slice(0, 60))
  }
}

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
    setupHandlers(bot)
  }
  return bot
}

function startBot() {
  if (botStarted) {
    console.warn('[TelegramBot] Already running — skipping duplicate start')
    return
  }
  const b = getBot()
  if (!b) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set — bot disabled')
    return
  }
  botStarted = true
  b.launch()
    .then(() => console.log('[TelegramBot] Bot started'))
    .catch(err => console.error('[TelegramBot] Failed to start:', err.message))

  process.once('SIGINT',  () => { try { b.stop('SIGINT')  } catch {} })
  process.once('SIGTERM', () => { try { b.stop('SIGTERM') } catch {} })
}

module.exports = { startBot, sendNotification, getBot, checkPriceAlerts, sendDailyDigest }
