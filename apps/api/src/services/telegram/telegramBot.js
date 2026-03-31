// apps/api/src/services/telegram/telegramBot.js

const { Telegraf, Markup } = require('telegraf')
const { supabase } = require('../../lib/supabase')
const { getTokenData } = require('../dexscreenerService')
const { collectMarketSignals } = require('../launchTimingService')

let bot = null

function getBot() {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
    setupHandlers(bot)
  }
  return bot
}

function getAppUrl() {
  return process.env.WEB_URL || null
}

function setupHandlers(bot) {

  // /start
  bot.start(async (ctx) => {
    const name = ctx.from.first_name || 'degen'
    const appUrl = getAppUrl()

    let text =
      `gm ${name}.\n\n` +
      `1launch — AI-powered memecoin launcher.\n` +
      `Narrative to token in under 5 minutes.\n\n` +
      `Commands:\n` +
      `/narratives — top trending narratives\n` +
      `/timing — launch timing analysis\n` +
      `/token <address> <chain> — token price data\n` +
      `/mytoken — your launched tokens\n` +
      `/alerts — manage price alerts\n` +
      `/subscribe — upgrade your plan`

    if (appUrl) text += `\n\nApp: ${appUrl}`

    await ctx.reply(
      text,
      Markup.keyboard([
        ['Narratives', 'Timing'],
        ['My Tokens', 'Subscribe'],
        ['Open App'],
      ]).resize()
    )
  })

  // Narratives
  bot.hears(['Narratives', '/narratives'], async (ctx) => {
    try {
      const { data: narratives } = await supabase
        .from('narratives')
        .select('title, hype_score, estimated_window, suggested_tickers')
        .gt('expires_at', new Date().toISOString())
        .order('hype_score', { ascending: false })
        .limit(5)

      if (!narratives?.length) {
        return ctx.reply('No active narratives right now. Check back in 30 minutes.')
      }

      const lines = narratives.map((n, i) => {
        const tickers = n.suggested_tickers?.slice(0, 3).map(t => `$${t}`).join(' / ') || ''
        const filled = Math.floor(n.hype_score / 10)
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
        return `${i + 1}. *${n.title}*\n${bar} ${n.hype_score}/100\nWindow: ${n.estimated_window}\nAngles: ${tickers}`
      })

      const appUrl = getAppUrl()
      let message = `*Top Narratives*\n\n${lines.join('\n\n')}`
      if (appUrl) message += `\n\nLaunch: ${appUrl}/dashboard`

      await ctx.reply(message, { parse_mode: 'Markdown' })
    } catch {
      ctx.reply('Failed to fetch narratives. Try again shortly.')
    }
  })

  // Timing
  bot.hears(['Timing', '/timing'], async (ctx) => {
    await ctx.reply('Analyzing market conditions...')
    try {
      const signals = await collectMarketSignals('bsc')
      const fg        = signals.fear_greed.value
      const sentiment = signals.sentiment.sentiment
      const hot       = signals.dex_activity.hot_pairs_24h

      const score = Math.min(100, Math.round(
        (fg / 100 * 30) +
        (hot > 10 ? 30 : hot * 2) +
        (sentiment === 'bullish' ? 30 : sentiment === 'neutral_up' ? 20 : sentiment === 'neutral_down' ? 10 : 0) +
        (signals.narratives.length > 0 ? 10 : 0)
      ))

      const rec = score >= 70 ? 'LAUNCH NOW' : score >= 50 ? 'WAIT A FEW HOURS' : 'WAIT 2-3 DAYS'
      const filled = Math.floor(score / 10)
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)

      const appUrl = getAppUrl()
      let msg =
        `*Launch Timing Analysis*\n\n` +
        `Score: ${bar} ${score}/100\n` +
        `Signal: *${rec}*\n\n` +
        `BTC 24h: ${parseFloat(signals.sentiment.btc_24h) >= 0 ? '+' : ''}${signals.sentiment.btc_24h}%\n` +
        `Fear & Greed: ${fg}/100 (${signals.fear_greed.label})\n` +
        `Hot meme pairs: ${hot}\n` +
        `Market: ${sentiment}`

      if (signals.narratives[0]) {
        msg += `\n\nTop narrative: *${signals.narratives[0].title}* (${signals.narratives[0].hype_score}/100)`
      }
      if (appUrl) msg += `\n\nFull analysis: ${appUrl}/timing`

      await ctx.reply(msg, { parse_mode: 'Markdown' })
    } catch {
      ctx.reply('Failed to fetch market data. Try again shortly.')
    }
  })

  // /token <address> <chain>
  bot.command('token', async (ctx) => {
    const args    = ctx.message.text.split(' ')
    const address = args[1]
    const chain   = args[2] || 'bsc'

    if (!address) {
      return ctx.reply('Usage: /token <contract_address> <chain>\nExample: /token 0x1ee8... bsc')
    }

    await ctx.reply('Fetching token data...')
    try {
      const data = await getTokenData(address, chain)
      if (!data) {
        return ctx.reply('No DEX pair found. Add liquidity first.')
      }
      const change    = data.price_change_24h
      const changeStr = `${change >= 0 ? '+' : ''}${change?.toFixed(2)}%`
      await ctx.reply(
        `*Token Data*\n\n` +
        `Price: $${data.price_usd?.toFixed(8)}\n` +
        `Market Cap: $${(data.market_cap_usd / 1000).toFixed(1)}K\n` +
        `Volume 24h: $${(data.volume_24h / 1000).toFixed(1)}K\n` +
        `24h: ${changeStr}\n` +
        `Liquidity: $${(data.liquidity_usd / 1000).toFixed(1)}K`,
        { parse_mode: 'Markdown' }
      )
    } catch (err) {
      ctx.reply('Failed to fetch token data: ' + err.message)
    }
  })

  // My Tokens
  bot.hears(['My Tokens', '/mytoken', '/mytokens'], async (ctx) => {
    const chatId = ctx.from.id.toString()
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .single()
        .catch(() => ({ data: null }))

      if (!user) {
        const appUrl = getAppUrl()
        return ctx.reply(
          'No wallet linked to this Telegram account yet.\n\nConnect your wallet on 1launch and link your Telegram in Account settings.' +
          (appUrl ? `\n\n${appUrl}/account` : '')
        )
      }

      const { data: tokens } = await supabase
        .from('launched_tokens')
        .select('id, contract_address, chain, launched_at, token_drafts(name, ticker)')
        .eq('user_id', user.id)
        .order('launched_at', { ascending: false })
        .limit(5)

      if (!tokens?.length) {
        return ctx.reply('No tokens launched yet.')
      }

      const lines = await Promise.all(tokens.map(async (t) => {
        const market = await getTokenData(t.contract_address, t.chain).catch(() => null)
        const price  = market?.price_usd ? `$${market.price_usd.toFixed(8)}` : 'No pair yet'
        const change = market?.price_change_24h
          ? ` (${change >= 0 ? '+' : ''}${market.price_change_24h.toFixed(2)}%)`
          : ''
        return `*${t.token_drafts?.name}* ($${t.token_drafts?.ticker})\n${t.chain.toUpperCase()} · ${price}${change}`
      }))

      const appUrl = getAppUrl()
      let msg = `*Your Tokens*\n\n${lines.join('\n\n')}`
      if (appUrl) msg += `\n\nDashboard: ${appUrl}/dashboard/tokens`

      await ctx.reply(msg, { parse_mode: 'Markdown' })
    } catch {
      ctx.reply('Failed to fetch your tokens.')
    }
  })

  // Subscribe
  bot.hears(['Subscribe', '/subscribe'], async (ctx) => {
    const appUrl = getAppUrl()
    const msg =
      'Upgrade your plan.\n\n' +
      'Free — 1 launch, core tools\n' +
      'Builder — $49/mo — 5 launches, full toolkit\n' +
      'Pro — $149/mo — unlimited, vol bot included\n' +
      'Agency — $499/mo — white-label, priority support\n\n' +
      'Pay with BNB, SOL, USDT, or USDC. Auto-activates.' +
      (appUrl ? `\n\n${appUrl}/pricing` : '')
    await ctx.reply(msg)
  })

  // /alerts
  bot.command('alerts', async (ctx) => {
    const args   = ctx.message.text.trim().split(/\s+/)
    const chatId = ctx.from.id.toString()

    if (args[1] === 'set') {
      const address     = args[2]
      const chain       = args[3] || 'bsc'
      const targetPrice = parseFloat(args[4])

      if (!address || isNaN(targetPrice)) {
        return ctx.reply('Usage: /alerts set <address> <chain> <target_price>\nExample: /alerts set 0x1ee8... bsc 0.0001')
      }

      try {
        await supabase.from('price_alerts').insert({
          telegram_chat_id: chatId,
          contract_address:  address,
          chain,
          target_price:      targetPrice,
          triggered:         false,
          created_at:        new Date().toISOString(),
        })
        await ctx.reply(`Alert set. You will be notified when this token reaches $${targetPrice}.`)
      } catch {
        ctx.reply('Failed to set alert. Try again.')
      }

    } else if (args[1] === 'list') {
      const { data } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .eq('triggered', false)

      if (!data?.length) return ctx.reply('No active alerts. Use /alerts set to create one.')

      const lines = data.map(a =>
        `${a.contract_address.slice(0, 10)}... (${a.chain.toUpperCase()}) → $${a.target_price}`
      ).join('\n')
      await ctx.reply(`*Active Price Alerts*\n\n${lines}`, { parse_mode: 'Markdown' })

    } else if (args[1] === 'clear') {
      await supabase
        .from('price_alerts')
        .update({ triggered: true })
        .eq('telegram_chat_id', chatId)
        .eq('triggered', false)
      await ctx.reply('All alerts cleared.')

    } else {
      await ctx.reply(
        'Price Alert Commands:\n\n' +
        '/alerts set <address> <chain> <price> — set alert\n' +
        '/alerts list — view active alerts\n' +
        '/alerts clear — clear all alerts'
      )
    }
  })

  // Open App
  bot.hears('Open App', async (ctx) => {
    const appUrl = getAppUrl()
    if (!appUrl || appUrl.includes('localhost')) {
      return ctx.reply('The app is not deployed yet. Coming soon.')
    }
    try {
      await ctx.reply(
        'Open 1launch:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open 1launch', `${appUrl}/miniapp`)]
        ])
      )
    } catch {
      await ctx.reply(`1launch: ${appUrl}/miniapp`)
    }
  })

  bot.catch((err, ctx) => {
    console.error('[TelegramBot] Error:', err.message)
  })
}

async function sendNotification(chatId, message, options = {}) {
  const b = getBot()
  if (!b) return
  try {
    await b.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown', ...options })
  } catch (err) {
    console.warn('[TelegramBot] Failed to send notification:', err.message)
  }
}

function startBot() {
  const b = getBot()
  if (!b) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set — bot disabled')
    return
  }

  b.launch()
    .then(() => console.log('[TelegramBot] Bot started'))
    .catch(err => console.error('[TelegramBot] Failed to start:', err.message))

  process.once('SIGINT',  () => { try { b.stop('SIGINT')  } catch {} })
  process.once('SIGTERM', () => { try { b.stop('SIGTERM') } catch {} })
}

module.exports = { startBot, sendNotification, getBot }
