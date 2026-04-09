// apps/api/src/services/telegram/telegramBot.js

const { Telegraf, Markup } = require('telegraf')
const { supabase }         = require('../../lib/supabase')
const { getTokenData }     = require('../dexscreenerService')

let bot        = null
let botStarted = false

function getAppUrl() { return process.env.WEB_URL || null }

// ── Main keyboard ─────────────────────────────────────────────────────────────
function mainKeyboard() {
  return Markup.keyboard([
    ['Narratives',  'Launch Token'],
    ['My Tokens',   'Alerts'],
    ['Market',      'Subscribe'],
    ['Settings',    'Help'],
  ]).resize()
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(6)}`
}

// ── Get TG ID consistently ────────────────────────────────────────────────────
function getTgId(ctx) { return String(ctx.from.id) }

// ── Get or create user ────────────────────────────────────────────────────────
async function getOrCreateUser(ctx) {
  const tgId   = getTgId(ctx)
  const chatId = String(ctx.chat?.id || ctx.from.id)

  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, wallet_address, plan')
      .eq('telegram_id', tgId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('users')
        .update({ telegram_chat_id: chatId, telegram_username: ctx.from.username || null })
        .eq('telegram_id', tgId)
      return existing
    }

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        telegram_id:       tgId,
        telegram_chat_id:  chatId,
        telegram_username: ctx.from.username || null,
        plan:              'free',
        created_at:        new Date().toISOString(),
      })
      .select('id, wallet_address, plan')
      .single()

    if (insertErr) {
      console.warn('[TG] insert failed:', insertErr.message)
      // Return a minimal user object so bot doesn't crash
      return { id: null, wallet_address: null, plan: 'free' }
    }

    console.log(`[TG] New user: ${ctx.from.username || tgId}`)
    return newUser
  } catch (err) {
    console.warn('[TG] getOrCreateUser failed:', err.message)
    return null
  }
}

function setupHandlers(bot) {

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    await getOrCreateUser(ctx)
    const name   = ctx.from.first_name || 'anon'
    const appUrl = getAppUrl()

    await ctx.reply(
      `gm ${name}.\n\n1launch — AI-powered memecoin launcher.\nNarrative to live token in under 5 minutes.`,
      appUrl
        ? Markup.inlineKeyboard([[Markup.button.webApp('Open 1launch App', `${appUrl}/dashboard`)]])
        : {}
    )
    await ctx.reply('Use the buttons below to navigate.', mainKeyboard())
  })

  // ── Narratives ──────────────────────────────────────────────────────────────
  bot.hears(['Narratives', '/narratives'], async (ctx) => {
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
        const tickers  = (n.suggested_tickers || []).slice(0, 3).map(t => `$${t}`).join(' / ')
        const filled   = Math.floor(n.hype_score / 10)
        const bar      = '[' + '|'.repeat(filled) + '-'.repeat(10 - filled) + ']'
        const launched = n.tokens_launched > 0 ? `\n${n.tokens_launched} token(s) already launched` : ''
        const why      = n.why_it_works ? `\n_${n.why_it_works}_` : ''

        const msg =
          `*${n.title}*\n` +
          `${bar} ${n.hype_score}/100\n` +
          `Window: ${n.estimated_window}${launched}\n` +
          `Tickers: ${tickers}` + why

        const btns = appUrl
          ? Markup.inlineKeyboard([[Markup.button.url('Launch From This Narrative', `${appUrl}/launch?narrative=${n.id}`)]])
          : {}

        await ctx.reply(msg, { parse_mode: 'Markdown', ...btns })
        await new Promise(r => setTimeout(r, 300))
      }

      await ctx.reply('Select a narrative above to launch from it.', mainKeyboard())
    } catch (err) {
      console.error('[TG narratives]', err.message)
      ctx.reply('Failed to fetch narratives.', mainKeyboard())
    }
  })

  // ── Launch Token ────────────────────────────────────────────────────────────
  bot.hears(['Launch Token', '/launch'], async (ctx) => {
    const appUrl = getAppUrl()
    if (!appUrl) return ctx.reply('Platform unavailable.', mainKeyboard())

    await ctx.reply(
      'Select an option:',
      Markup.inlineKeyboard([
        [Markup.button.url('Browse Narratives + Launch', `${appUrl}/dashboard`)],
        [Markup.button.url('Launch Custom Token', `${appUrl}/launch`)],
      ])
    )
  })

  // ── My Tokens ───────────────────────────────────────────────────────────────
  bot.hears(['My Tokens', '/mytokens'], async (ctx) => {
    const user = await getOrCreateUser(ctx)
    if (!user) {
      const appUrl = getAppUrl()
      return ctx.reply(
        'No tokens launched yet. Launch your first token from the feed.',
        appUrl ? Markup.inlineKeyboard([[Markup.button.url('Browse Narratives', `${appUrl}/dashboard`)]]) : {}
      )
    }

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
          'No tokens launched yet.',
          appUrl
            ? Markup.inlineKeyboard([[Markup.button.url('Launch Now', `${appUrl}/dashboard`)]])
            : {}
        )
      }

      const appUrl = getAppUrl()

      for (const t of tokens) {
        const draft  = t.token_drafts
        const market = await getTokenData(t.contract_address, t.chain).catch(() => null)
        const price  = market?.price_usd ? `$${market.price_usd.toFixed(8)}` : 'No pair yet'
        const mcap   = market?.market_cap_usd ? fmt(market.market_cap_usd) : '--'
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

      await ctx.reply(`Showing ${tokens.length} token(s).`, mainKeyboard())
    } catch (err) {
      console.error('[TG myTokens]', err.message)
      ctx.reply('Failed to fetch tokens.', mainKeyboard())
    }
  })

  // ── Alerts ──────────────────────────────────────────────────────────────────
  bot.hears(['Alerts', '/alerts'], async (ctx) => {
    await ctx.reply(
      'Alerts — what do you want to track?',
      Markup.inlineKeyboard([
        [Markup.button.callback('Price Alert', 'alert_start_price')],
        [Markup.button.callback('MCap Milestone', 'alert_start_mcap')],
        [Markup.button.callback('New Hot Narrative (80+)', 'alert_narrative')],
        [Markup.button.callback('View My Alerts', 'alert_list')],
        [Markup.button.callback('Clear All Alerts', 'alert_clear')],
      ])
    )
  })

  // Narrative alert
  bot.action('alert_narrative', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)
    try {
      // Check if already set
      const { data: existing } = await supabase
        .from('price_alerts')
        .select('id')
        .eq('telegram_chat_id', tgId)
        .eq('alert_type', 'narrative')
        .eq('triggered', false)
        .maybeSingle()

      if (existing) {
        return ctx.reply('You already have a hot narrative alert active.', mainKeyboard())
      }

      await supabase.from('price_alerts').insert({
        telegram_chat_id: tgId,
        alert_type:       'narrative',
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      ctx.reply('Done. You will be notified when a narrative scores 80+.', mainKeyboard())
    } catch {
      ctx.reply('Failed to set alert.', mainKeyboard())
    }
  })

  // Price/MCap alert — first pick chain
  bot.action('alert_start_price', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply(
      'Price Alert — select chain:',
      Markup.inlineKeyboard([
        [Markup.button.callback('BSC', 'alert_chain_bsc_price')],
        [Markup.button.callback('Solana', 'alert_chain_sol_price')],
      ])
    )
  })

  bot.action('alert_start_mcap', async (ctx) => {
    await ctx.answerCbQuery()
    await ctx.reply(
      'MCap Milestone — select chain:',
      Markup.inlineKeyboard([
        [Markup.button.callback('BSC', 'alert_chain_bsc_mcap')],
        [Markup.button.callback('Solana', 'alert_chain_sol_mcap')],
      ])
    )
  })

  // After chain selected — show their tokens on that chain
  async function showTokensForAlert(ctx, chain, alertType) {
    const user = await getOrCreateUser(ctx)
    if (!user) return ctx.reply('Could not find your account. Try /start again.')

    const { data: tokens } = await supabase
      .from('launched_tokens')
      .select('id, contract_address, token_drafts(name, ticker)')
      .eq('user_id', user.id)
      .eq('chain', chain)
      .limit(10)

    if (!tokens?.length) {
      return ctx.reply(`No tokens launched on ${chain.toUpperCase()} yet.`, mainKeyboard())
    }

    const buttons = tokens.map(t => [
      Markup.button.callback(
        `${t.token_drafts?.name} ($${t.token_drafts?.ticker})`,
        `alert_token_${alertType}_${t.contract_address}_${chain}`
      )
    ])

    await ctx.reply(
      `Select the token to track:`,
      Markup.inlineKeyboard(buttons)
    )
  }

  bot.action('alert_chain_bsc_price', async (ctx) => {
    await ctx.answerCbQuery()
    await showTokensForAlert(ctx, 'bsc', 'price')
  })
  bot.action('alert_chain_sol_price', async (ctx) => {
    await ctx.answerCbQuery()
    await showTokensForAlert(ctx, 'solana', 'price')
  })
  bot.action('alert_chain_bsc_mcap', async (ctx) => {
    await ctx.answerCbQuery()
    await showTokensForAlert(ctx, 'bsc', 'mcap')
  })
  bot.action('alert_chain_sol_mcap', async (ctx) => {
    await ctx.answerCbQuery()
    await showTokensForAlert(ctx, 'solana', 'mcap')
  })

  // After token selected — show price/mcap options
  bot.action(/^alert_token_(price|mcap)_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const alertType = ctx.match[1]
    const address   = ctx.match[2]
    const chain     = ctx.match[3]

    // Fetch live data for suggestions
    const market = await getTokenData(address, chain).catch(() => null)

    if (alertType === 'price') {
      const current = market?.price_usd || 0
      const suggestions = current > 0
        ? [2, 5, 10].map(x => ({ label: `${x}x — $${(current * x).toFixed(8)}`, value: (current * x).toFixed(8) }))
        : []

      const buttons = [
        ...suggestions.map(s => [Markup.button.callback(s.label, `alert_set_price_${address}_${chain}_${s.value}`)]),
        [Markup.button.callback('Custom price', `alert_custom_price_${address}_${chain}`)],
      ]

      await ctx.reply(
        `Set price alert for \`${address.slice(0, 10)}...\`${current ? `\nCurrent: $${current.toFixed(8)}` : ''}`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      )
    } else {
      const current = market?.market_cap_usd || 0
      const milestones = [
        { label: '$10K', value: 10000 },
        { label: '$50K', value: 50000 },
        { label: '$100K', value: 100000 },
        { label: '$500K', value: 500000 },
        { label: '$1M',   value: 1000000 },
      ].filter(m => m.value > current)

      const buttons = [
        ...milestones.slice(0, 4).map(m => [Markup.button.callback(m.label, `alert_set_mcap_${address}_${chain}_${m.value}`)]),
        [Markup.button.callback('Custom target', `alert_custom_mcap_${address}_${chain}`)],
      ]

      await ctx.reply(
        `Set MCap alert for \`${address.slice(0, 10)}...\`${current ? `\nCurrent MCap: ${fmt(current)}` : ''}`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      )
    }
  })

  // Set alert from button
  bot.action(/^alert_set_(price|mcap)_(.+)_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const type    = ctx.match[1]
    const address = ctx.match[2]
    const chain   = ctx.match[3]
    const value   = parseFloat(ctx.match[4])
    const tgId    = getTgId(ctx)

    try {
      await supabase.from('price_alerts').insert({
        telegram_chat_id: tgId,
        alert_type:       type,
        contract_address: address,
        chain,
        target_price:     value,
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      const label = type === 'mcap' ? `MCap: ${fmt(value)}` : `Price: $${value}`
      ctx.reply(`Alert set — ${label}`, mainKeyboard())
    } catch {
      ctx.reply('Failed to save alert.', mainKeyboard())
    }
  })

  // Custom price/mcap — ask user to type
  bot.action(/^alert_custom_(price|mcap)_(.+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const type    = ctx.match[1]
    const address = ctx.match[2]
    const chain   = ctx.match[3]
    const tgId    = getTgId(ctx)

    // Store pending state in DB temp
    await supabase.from('price_alerts').insert({
      telegram_chat_id: tgId,
      alert_type:       `pending_${type}`,
      contract_address: address,
      chain,
      triggered:        false,
      created_at:       new Date().toISOString(),
    })

    ctx.reply(
      type === 'price'
        ? 'Send the target price (e.g. 0.0001):'
        : 'Send the target MCap in USD (e.g. 100000 for $100K):'
    )
  })

  // View alerts
  bot.action('alert_list', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)

    const { data } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('telegram_chat_id', tgId)
      .eq('triggered', false)
      .not('alert_type', 'like', 'pending_%')

    if (!data?.length) return ctx.reply('No active alerts.', mainKeyboard())

    const lines = data.map(a => {
      if (a.alert_type === 'narrative') return 'Hot narrative (80+)'
      if (a.alert_type === 'mcap')      return `MCap ${fmt(a.target_price)} — ${a.contract_address?.slice(0, 10)}... (${a.chain?.toUpperCase()})`
      return `Price $${a.target_price} — ${a.contract_address?.slice(0, 10)}... (${a.chain?.toUpperCase()})`
    }).join('\n')

    ctx.reply(`*Active Alerts (${data.length})*\n\n${lines}`, { parse_mode: 'Markdown', ...mainKeyboard() })
  })

  // Clear alerts
  bot.action('alert_clear', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)
    await supabase.from('price_alerts').update({ triggered: true }).eq('telegram_chat_id', tgId).eq('triggered', false)
    ctx.reply('All alerts cleared.', mainKeyboard())
  })

  // ── Market overview ─────────────────────────────────────────────────────────
  bot.hears(['Market', '/market'], async (ctx) => {
    await ctx.reply('Fetching market data...')
    try {
      const axios = require('axios')
      const res   = await axios.get('https://api.alternative.me/fng/', { timeout: 6000 })
      const fg    = res.data?.data?.[0]
      const value = parseInt(fg?.value || 50)
      const label = fg?.value_classification || 'Neutral'
      const bar   = '[' + '|'.repeat(Math.floor(value / 10)) + '-'.repeat(10 - Math.floor(value / 10)) + ']'

      const { data: narratives } = await supabase
        .from('narratives')
        .select('title, hype_score')
        .gt('expires_at', new Date().toISOString())
        .order('hype_score', { ascending: false })
        .limit(3)

      let msg = `*Market Overview*\n\nFear & Greed: ${bar}\n${value}/100 — *${label}*\n\n`

      if (narratives?.length) {
        msg += `*Top Narratives Right Now:*\n`
        narratives.forEach((n, i) => { msg += `${i + 1}. ${n.title} (${n.hype_score}/100)\n` })
      }

      const rec = value >= 70 ? 'Good time to launch.' : value >= 45 ? 'Decent conditions.' : 'Cautious market — launch anyway if narrative is strong.'
      msg += `\n_${rec}_`

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainKeyboard() })
    } catch {
      ctx.reply('Failed to fetch market data.', mainKeyboard())
    }
  })

  // ── Subscribe ───────────────────────────────────────────────────────────────
  bot.hears(['Subscribe', '/subscribe'], async (ctx) => {
    const appUrl = getAppUrl()
    const msg =
      '*1launch Pricing*\n\n' +
      'BSC deploy — $15 per token\n' +
      'Solana deploy — $6 per token\n\n' +
      'Volume Bot — $29 / $79 / $149 per token\nKeeps your chart alive after launch.\n\n' +
      'Pay per launch. No monthly fees.'

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...(appUrl ? Markup.inlineKeyboard([[Markup.button.url('Get Started Free', `${appUrl}/dashboard`)]]) : {}),
    })
  })

  // ── Settings ────────────────────────────────────────────────────────────────
  bot.hears(['Settings', '/settings'], async (ctx) => {
    const user   = await getOrCreateUser(ctx)
    const appUrl = getAppUrl()

    const wallet = user?.wallet_address
      ? `Wallet linked: \`${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-4)}\``
      : 'No wallet linked yet'
    const plan = `Plan: *${user?.plan || 'free'}*`

    const linkInstructions = !user?.wallet_address
      ? '\n\nTo link your wallet, paste your wallet address here (BSC or Solana). Make sure you have already connected that wallet on 1launch web first.'
      : ''

    await ctx.reply(
      `*Your Account*\n\n${wallet}\n${plan}${linkInstructions}`,
      {
        parse_mode: 'Markdown',
        ...(appUrl && !user?.wallet_address
          ? Markup.inlineKeyboard([[Markup.button.url('Connect on Web First', `${appUrl}/dashboard`)]])
          : {}),
      }
    )
  })

  // ── Wallet address message handler ───────────────────────────────────────────
  // Detects when user pastes a wallet address (BSC 0x... or Solana base58)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim()

    // Ignore if it's a command or button press
    if (text.startsWith('/')) return
    const knownButtons = ['Narratives', 'Launch Token', 'My Tokens', 'Alerts', 'Market', 'Subscribe', 'Settings', 'Help']
    if (knownButtons.includes(text)) return

    // Detect wallet address format
    const isBSC     = /^0x[a-fA-F0-9]{40}$/.test(text)
    const isSolana  = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)

    if (!isBSC && !isSolana) return // not a wallet address, ignore

    const tgId   = getTgId(ctx)
    const appUrl = getAppUrl()

    await ctx.reply('Checking wallet...')

    try {
      // Check if this wallet exists in the system
      const { data: existingWalletUser } = await supabase
        .from('users')
        .select('id, telegram_id, wallet_address')
        .eq('wallet_address', text.toLowerCase())
        .maybeSingle()

      if (!existingWalletUser) {
        // Wallet not in system — they haven't connected it on web yet
        return ctx.reply(
          `This wallet has not been connected to 1launch yet.\n\nYou need to:\n1. Open 1launch in your MetaMask or Phantom browser\n2. Connect this wallet\n3. Come back here and paste it again`,
          appUrl
            ? Markup.inlineKeyboard([[Markup.button.url('Open 1launch', `${appUrl}/dashboard`)]])
            : {}
        )
      }

      // Wallet exists — get the TG user
      const { data: tgUser } = await supabase
        .from('users')
        .select('id, wallet_address')
        .eq('telegram_id', tgId)
        .maybeSingle()

      if (tgUser) {
        // Link wallet to TG user
        await supabase
          .from('users')
          .update({ wallet_address: text.toLowerCase() })
          .eq('telegram_id', tgId)

        // Also update the wallet's existing record with TG info if different
        if (existingWalletUser.id !== tgUser.id) {
          // Merge — copy telegram_id to the wallet's record, remove the separate TG record
          await supabase
            .from('users')
            .update({ telegram_id: tgId, telegram_chat_id: String(ctx.chat?.id || ctx.from.id) })
            .eq('id', existingWalletUser.id)
        }
      } else {
        // No TG user yet — update the wallet record with TG info
        await supabase
          .from('users')
          .update({
            telegram_id:       tgId,
            telegram_chat_id:  String(ctx.chat?.id || ctx.from.id),
            telegram_username: ctx.from.username || null,
          })
          .eq('id', existingWalletUser.id)
      }

      const short = `${text.slice(0, 6)}...${text.slice(-4)}`
      await ctx.reply(
        `Wallet linked: \`${short}\`\n\nYour tokens and alerts are now synced. Tap My Tokens to see your launches.`,
        { parse_mode: 'Markdown', ...mainKeyboard() }
      )
    } catch (err) {
      console.error('[TG wallet link]', err.message)
      ctx.reply('Something went wrong. Try again or use /start to reset.', mainKeyboard())
    }
  })

  // ── Help ────────────────────────────────────────────────────────────────────
  bot.hears(['Help', '/help'], async (ctx) => {
    await ctx.reply(
      '*1launch Bot*\n\n' +
      'Narratives — trending meme narratives\n' +
      'Launch Token — start a launch\n' +
      'My Tokens — your deployed tokens\n' +
      'Alerts — price, mcap & narrative alerts\n' +
      'Market — Fear & Greed + top narratives\n' +
      'Subscribe — view and upgrade plans\n' +
      'Settings — account and wallet info',
      { parse_mode: 'Markdown', ...mainKeyboard() }
    )
  })

  // ── /token lookup ────────────────────────────────────────────────────────────
  bot.command('token', async (ctx) => {
    const args    = ctx.message.text.split(' ')
    const address = args[1]
    const chain   = args[2] || 'bsc'
    if (!address) return ctx.reply('Usage: /token <address> <chain>', mainKeyboard())

    await ctx.reply('Fetching...')
    try {
      const data = await getTokenData(address, chain)
      if (!data) return ctx.reply('No DEX pair found.', mainKeyboard())

      const change = data.price_change_24h
      await ctx.reply(
        `*Token Data*\n\n` +
        `Price: $${data.price_usd?.toFixed(8)}\n` +
        `MCap: ${fmt(data.market_cap_usd)}\n` +
        `Vol 24h: ${fmt(data.volume_24h)}\n` +
        `24h: ${change >= 0 ? '+' : ''}${change?.toFixed(2)}%\n` +
        `Liquidity: ${fmt(data.liquidity_usd)}`,
        { parse_mode: 'Markdown', ...mainKeyboard() }
      )
    } catch { ctx.reply('Failed.', mainKeyboard()) }
  })

  bot.catch((err) => { console.error('[TelegramBot]', err.message) })
}

// ── Send daily digest ─────────────────────────────────────────────────────────
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
      `${i + 1}. *${n.title}* — ${n.hype_score}/100`
    ).join('\n')

    const msg = `gm. Today's top narratives:\n\n${lines}\n\n${appUrl ? `Launch: ${appUrl}/dashboard` : ''}`

    const { data: users } = await supabase
      .from('users')
      .select('telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    for (const user of (users || [])) {
      await sendNotification(user.telegram_chat_id, msg).catch(() => {})
      await new Promise(r => setTimeout(r, 50))
    }
    console.log(`[TG] Daily digest sent to ${users?.length || 0} users`)
  } catch (err) {
    console.error('[TG] Daily digest failed:', err.message)
  }
}

// ── Price alert checker ───────────────────────────────────────────────────────
async function checkPriceAlerts() {
  try {
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('triggered', false)
      .not('contract_address', 'is', null)
      .not('alert_type', 'like', 'pending_%')
      .limit(50)

    for (const alert of (alerts || [])) {
      try {
        const market = await getTokenData(alert.contract_address, alert.chain || 'bsc')
        if (!market) continue

        const current = alert.alert_type === 'mcap' ? market.market_cap_usd : market.price_usd
        if (!current || current < alert.target_price) continue

        const label = alert.alert_type === 'mcap'
          ? `MCap reached ${fmt(current)}`
          : `Price reached $${market.price_usd?.toFixed(8)}`

        await sendNotification(
          alert.telegram_chat_id,
          `*Alert triggered*\n\n${label}\n\`${alert.contract_address.slice(0, 10)}...\``
        )

        await supabase
          .from('price_alerts')
          .update({ triggered: true, triggered_at: new Date().toISOString() })
          .eq('id', alert.id)
      } catch {}
    }

    // Narrative alerts
    const { data: narAlerts } = await supabase
      .from('price_alerts')
      .select('telegram_chat_id')
      .eq('alert_type', 'narrative')
      .eq('triggered', false)

    if (narAlerts?.length) {
      const { data: hot } = await supabase
        .from('narratives')
        .select('title, hype_score, id')
        .gte('hype_score', 80)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (hot?.length) {
        const n      = hot[0]
        const appUrl = getAppUrl()
        const msg    = `*Hot narrative detected*\n\n*${n.title}*\nScore: ${n.hype_score}/100\n\n${appUrl ? `Launch now: ${appUrl}/launch?narrative=${n.id}` : ''}`

        for (const a of narAlerts) {
          await sendNotification(a.telegram_chat_id, msg).catch(() => {})
          await new Promise(r => setTimeout(r, 50))
        }
      }
    }
  } catch (err) {
    console.error('[TG] checkPriceAlerts failed:', err.message)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function sendNotification(chatId, message, options = {}) {
  const b = getBot()
  if (!b || !chatId) return
  try {
    await b.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown', ...options })
  } catch (err) {
    console.warn('[TG] Notification failed:', err.message?.slice(0, 60))
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
    console.warn('[TelegramBot] Already running — skipping')
    return
  }
  const b = getBot()
  if (!b) {
    console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set')
    return
  }
  botStarted = true
  b.launch()
    .then(() => console.log('[TelegramBot] Started'))
    .catch(err => console.error('[TelegramBot] Failed:', err.message))

  process.once('SIGINT',  () => { try { b.stop('SIGINT')  } catch {} })
  process.once('SIGTERM', () => { try { b.stop('SIGTERM') } catch {} })
}

module.exports = { startBot, sendNotification, getBot, checkPriceAlerts, sendDailyDigest }