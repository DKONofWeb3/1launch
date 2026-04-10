// apps/api/src/services/telegram/telegramBot.js
// FULL FILE — fixes: BUTTON_DATA_INVALID (short callback data), proper token list UX

const { Telegraf, Markup } = require('telegraf')
const { supabase }         = require('../../lib/supabase')
const { getTokenData }     = require('../dexscreenerService')

let bot        = null
let botStarted = false

function getAppUrl() { return process.env.WEB_URL || null }

function mainKeyboard() {
  return Markup.keyboard([
    ['Narratives',  'Launch Token'],
    ['My Tokens',   'Alerts'],
    ['Subscribe',   'Settings'],
    ['Help'],
  ]).resize()
}

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(6)}`
}

function getTgId(ctx) { return String(ctx.from.id) }

// ── Alert session — stores chain/token selection between steps ─────────────────
async function saveAlertSession(tgId, data) {
  try {
    await supabase.from('alert_sessions').upsert({
      telegram_chat_id: tgId,
      data:             JSON.stringify(data),
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'telegram_chat_id' })
  } catch (err) {
    console.warn('[TG] saveAlertSession failed:', err.message)
  }
}

async function getAlertSession(tgId) {
  try {
    const { data } = await supabase
      .from('alert_sessions')
      .select('data')
      .eq('telegram_chat_id', tgId)
      .maybeSingle()
    return data ? JSON.parse(data.data) : null
  } catch { return null }
}

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
      await supabase.from('users')
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
      appUrl ? Markup.inlineKeyboard([[Markup.button.webApp('Open 1launch App', `${appUrl}/dashboard`)]]) : {}
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

      if (!narratives?.length) return ctx.reply('No active narratives right now. Check back in 30 minutes.', mainKeyboard())

      const appUrl = getAppUrl()
      for (const n of narratives) {
        const tickers = (n.suggested_tickers || []).slice(0, 3).map(t => `$${t}`).join(' / ')
        const filled  = Math.floor(n.hype_score / 10)
        const bar     = '[' + '|'.repeat(filled) + '-'.repeat(10 - filled) + ']'
        const why     = n.why_it_works ? `\n_${n.why_it_works}_` : ''
        const msg     = `*${n.title}*\n${bar} ${n.hype_score}/100\nWindow: ${n.estimated_window}\nTickers: ${tickers}` + why
        const btns    = appUrl ? Markup.inlineKeyboard([[Markup.button.url('Launch From This Narrative', `${appUrl}/launch?narrative=${n.id}`)]]) : {}
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
    await ctx.reply('Select an option:', Markup.inlineKeyboard([
      [Markup.button.url('Browse Narratives + Launch', `${appUrl}/dashboard`)],
      [Markup.button.url('Launch Custom Token', `${appUrl}/launch`)],
    ]))
  })

  // ── My Tokens ───────────────────────────────────────────────────────────────
  bot.hears(['My Tokens', '/mytokens'], async (ctx) => {
    const user = await getOrCreateUser(ctx)
    if (!user || !user.id) {
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
        return ctx.reply('No tokens launched yet.', appUrl ? Markup.inlineKeyboard([[Markup.button.url('Launch Now', `${appUrl}/dashboard`)]]) : {})
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

        const msg = `*${draft?.name}* ($${draft?.ticker})\nChain: ${t.chain.toUpperCase()}\nPrice: ${price}${change}\nMCap: ${mcap}\n\`${t.contract_address}\``
        const tokenUrl = appUrl ? `${appUrl}/dashboard/tokens/${t.id}` : null
        await ctx.reply(msg, { parse_mode: 'Markdown', ...(tokenUrl ? Markup.inlineKeyboard([[Markup.button.url('View Dashboard', tokenUrl)]]) : {}) })
        await new Promise(r => setTimeout(r, 300))
      }
      await ctx.reply(`Showing ${tokens.length} token(s).`, mainKeyboard())
    } catch (err) {
      console.error('[TG myTokens]', err.message)
      ctx.reply('Failed to fetch tokens.', mainKeyboard())
    }
  })

  // ── Alerts ───────────────────────────────────────────────────────────────────
  bot.hears(['Alerts', '/alerts'], async (ctx) => {
    await ctx.reply(
      'Alerts — what do you want to track?',
      Markup.inlineKeyboard([
        [Markup.button.callback('Price Alert',              'ap')],
        [Markup.button.callback('MCap Milestone',           'am')],
        [Markup.button.callback('New Hot Narrative (80+)',  'an')],
        [Markup.button.callback('View My Alerts',           'al')],
        [Markup.button.callback('Clear All Alerts',         'ac')],
      ])
    )
  })

  // Narrative alert
  bot.action('an', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)
    try {
      const { data: existing } = await supabase
        .from('narrative_alerts')
        .select('id')
        .eq('telegram_chat_id', tgId)
        .eq('triggered', false)
        .maybeSingle()

      if (existing) return ctx.reply('You already have a hot narrative alert active.', mainKeyboard())

      const { error } = await supabase.from('narrative_alerts').insert({
        telegram_chat_id: tgId,
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      if (error) return ctx.reply('Failed to save alert: ' + error.message, mainKeyboard())
      ctx.reply('Done. You will be notified when a narrative scores 80+.', mainKeyboard())
    } catch (err) {
      ctx.reply('Failed to set alert.', mainKeyboard())
    }
  })

  // Step 1: pick alert type → pick chain
  bot.action('ap', async (ctx) => {
    await ctx.answerCbQuery()
    await saveAlertSession(getTgId(ctx), { type: 'price' })
    await ctx.reply('Price Alert — select chain:', Markup.inlineKeyboard([
      [Markup.button.callback('BSC',    'ac_bsc')],
      [Markup.button.callback('Solana', 'ac_sol')],
    ]))
  })

  bot.action('am', async (ctx) => {
    await ctx.answerCbQuery()
    await saveAlertSession(getTgId(ctx), { type: 'mcap' })
    await ctx.reply('MCap Milestone — select chain:', Markup.inlineKeyboard([
      [Markup.button.callback('BSC',    'ac_bsc')],
      [Markup.button.callback('Solana', 'ac_sol')],
    ]))
  })

  // Step 2: chain selected → show user's tokens on that chain as buttons
  async function showTokensForAlert(ctx, chain) {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)
    const session = await getAlertSession(tgId)
    await saveAlertSession(tgId, { ...session, chain })

    const user = await getOrCreateUser(ctx)
    if (!user?.id) return ctx.reply('Link your wallet first using Settings.', mainKeyboard())

    const { data: tokens } = await supabase
      .from('launched_tokens')
      .select('id, contract_address, token_drafts(name, ticker)')
      .eq('user_id', user.id)
      .eq('chain', chain)
      .limit(8)

    if (!tokens?.length) return ctx.reply(`No tokens launched on ${chain.toUpperCase()} yet.`, mainKeyboard())

    // Store token list in session so we can look up by index (avoids long callback data)
    const tokenList = tokens.map(t => ({
      address: t.contract_address,
      name:    t.token_drafts?.name,
      ticker:  t.token_drafts?.ticker,
    }))
    await saveAlertSession(tgId, { ...session, chain, tokens: tokenList })

    const buttons = tokenList.map((t, i) => [
      Markup.button.callback(`${t.name} ($${t.ticker})`, `at_${i}`)
    ])
    await ctx.reply('Select the token to track:', Markup.inlineKeyboard(buttons))
  }

  bot.action('ac_bsc', (ctx) => showTokensForAlert(ctx, 'bsc'))
  bot.action('ac_sol', (ctx) => showTokensForAlert(ctx, 'solana'))

  // Step 3: token selected → show price/mcap options
  bot.action(/^at_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const tgId    = getTgId(ctx)
    const idx     = parseInt(ctx.match[1])
    const session = await getAlertSession(tgId)

    if (!session?.tokens?.[idx]) return ctx.reply('Session expired. Start again with Alerts.', mainKeyboard())

    const token = session.tokens[idx]
    await saveAlertSession(tgId, { ...session, selectedToken: token })

    const market = await getTokenData(token.address, session.chain).catch(() => null)

    if (session.type === 'price') {
      const current = market?.price_usd || 0
      const suggestions = current > 0
        ? [
            { label: `2x — $${(current * 2).toFixed(8)}`,  val: (current * 2).toFixed(8) },
            { label: `5x — $${(current * 5).toFixed(8)}`,  val: (current * 5).toFixed(8) },
            { label: `10x — $${(current * 10).toFixed(8)}`, val: (current * 10).toFixed(8) },
          ]
        : []

      const buttons = [
        ...suggestions.map(s => [Markup.button.callback(s.label, `av_${s.val}`)]),
        [Markup.button.callback('Custom price', 'avcustom')],
      ]
      await ctx.reply(
        `Set price alert for *${token.name}*${current ? `\nCurrent: $${current.toFixed(8)}` : ''}`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      )
    } else {
      const current = market?.market_cap_usd || 0
      const milestones = [
        { label: '$10K',  val: '10000'   },
        { label: '$50K',  val: '50000'   },
        { label: '$100K', val: '100000'  },
        { label: '$500K', val: '500000'  },
        { label: '$1M',   val: '1000000' },
      ].filter(m => parseInt(m.val) > current).slice(0, 4)

      const buttons = [
        ...milestones.map(m => [Markup.button.callback(m.label, `av_${m.val}`)]),
        [Markup.button.callback('Custom target', 'avcustom')],
      ]
      await ctx.reply(
        `Set MCap alert for *${token.name}*${current ? `\nCurrent: ${fmt(current)}` : ''}`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      )
    }
  })

  // Step 4a: preset value selected → save alert
  bot.action(/^av_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery()
    const tgId    = getTgId(ctx)
    const value   = parseFloat(ctx.match[1])
    const session = await getAlertSession(tgId)

    if (!session?.selectedToken) return ctx.reply('Session expired. Start again with Alerts.', mainKeyboard())

    try {
      await supabase.from('price_alerts').insert({
        telegram_chat_id: tgId,
        alert_type:       session.type,
        contract_address: session.selectedToken.address,
        chain:            session.chain,
        target_price:     value,
        triggered:        false,
        created_at:       new Date().toISOString(),
      })
      const label = session.type === 'mcap' ? `MCap: ${fmt(value)}` : `Price: $${value}`
      ctx.reply(`Alert set — ${label}\n\nYou will be notified when *${session.selectedToken.name}* reaches this level.`, { parse_mode: 'Markdown', ...mainKeyboard() })
    } catch (err) {
      ctx.reply('Failed to save alert: ' + err.message, mainKeyboard())
    }
  })

  // Step 4b: custom value — ask user to type
  bot.action('avcustom', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId    = getTgId(ctx)
    const session = await getAlertSession(tgId)
    await saveAlertSession(tgId, { ...session, awaitingCustom: true })
    await ctx.reply(
      session?.type === 'price'
        ? 'Send the target price as a number:\nExample: `0.0001`'
        : 'Send the target MCap in USD as a number:\nExample: `100000` for $100K',
      { parse_mode: 'Markdown' }
    )
  })

  // View alerts
  bot.action('al', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)

    const [{ data: priceAlerts }, { data: narAlerts }] = await Promise.all([
      supabase.from('price_alerts').select('*').eq('telegram_chat_id', tgId).eq('triggered', false),
      supabase.from('narrative_alerts').select('*').eq('telegram_chat_id', tgId).eq('triggered', false),
    ])

    const all = [...(priceAlerts || []), ...(narAlerts || []).map(a => ({ ...a, alert_type: 'narrative' }))]
    if (!all.length) return ctx.reply('No active alerts.', mainKeyboard())

    const lines = all.map(a => {
      if (a.alert_type === 'narrative') return 'Hot narrative alert (80+)'
      if (a.alert_type === 'mcap')      return `MCap ${fmt(a.target_price)} — ${a.contract_address?.slice(0, 8)}... (${a.chain?.toUpperCase()})`
      return `Price $${a.target_price} — ${a.contract_address?.slice(0, 8)}... (${a.chain?.toUpperCase()})`
    }).join('\n')

    ctx.reply(`*Active Alerts (${all.length})*\n\n${lines}`, { parse_mode: 'Markdown', ...mainKeyboard() })
  })

  // Clear alerts
  bot.action('ac', async (ctx) => {
    await ctx.answerCbQuery()
    const tgId = getTgId(ctx)
    await Promise.all([
      supabase.from('price_alerts').update({ triggered: true }).eq('telegram_chat_id', tgId).eq('triggered', false),
      supabase.from('narrative_alerts').update({ triggered: true }).eq('telegram_chat_id', tgId).eq('triggered', false),
    ])
    ctx.reply('All alerts cleared.', mainKeyboard())
  })

  // ── Text handler — wallet linking + custom alert value ───────────────────────
  bot.on('text', async (ctx) => {
    const text     = ctx.message.text.trim()
    const tgId     = getTgId(ctx)
    const knownBtns = ['Narratives', 'Launch Token', 'My Tokens', 'Alerts', 'Market', 'Subscribe', 'Settings', 'Help']

    if (text.startsWith('/') || knownBtns.includes(text)) return

    // Check if user is in custom alert flow
    const session = await getAlertSession(tgId)
    if (session?.awaitingCustom) {
      const value = parseFloat(text.replace(/[^0-9.]/g, ''))
      if (isNaN(value) || value <= 0) return ctx.reply('Send a valid number. Example: 100000', mainKeyboard())

      try {
        await supabase.from('price_alerts').insert({
          telegram_chat_id: tgId,
          alert_type:       session.type,
          contract_address: session.selectedToken.address,
          chain:            session.chain,
          target_price:     value,
          triggered:        false,
          created_at:       new Date().toISOString(),
        })
        // Clear session
        await supabase.from('alert_sessions').delete().eq('telegram_chat_id', tgId)
        const label = session.type === 'mcap' ? `MCap: ${fmt(value)}` : `Price: $${value}`
        return ctx.reply(`Alert set — ${label}`, mainKeyboard())
      } catch (err) {
        return ctx.reply('Failed to save: ' + err.message, mainKeyboard())
      }
    }

    // Wallet address detection
    const isBSC    = /^0x[a-fA-F0-9]{40}$/.test(text)
    const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)
    if (!isBSC && !isSolana) return

    const appUrl = getAppUrl()
    await ctx.reply('Checking wallet...')

    try {
      const { data: existingWalletUser } = await supabase
        .from('users')
        .select('id, telegram_id, wallet_address')
        .eq('wallet_address', text.toLowerCase())
        .maybeSingle()

      if (!existingWalletUser) {
        return ctx.reply(
          'This wallet has not been connected to 1launch yet.\n\n1. Open 1launch in your MetaMask or Phantom browser\n2. Connect this wallet\n3. Come back here and paste it again',
          appUrl ? Markup.inlineKeyboard([[Markup.button.url('Open 1launch', `${appUrl}/dashboard`)]]) : {}
        )
      }

      // Link telegram to this wallet record
      await supabase.from('users').update({
        telegram_id:       tgId,
        telegram_chat_id:  String(ctx.chat?.id || ctx.from.id),
        telegram_username: ctx.from.username || null,
      }).eq('id', existingWalletUser.id)

      const short = `${text.slice(0, 6)}...${text.slice(-4)}`
      await ctx.reply(
        `Wallet linked: \`${short}\`\n\nYour tokens and alerts are now synced. Tap My Tokens to see your launches.`,
        { parse_mode: 'Markdown', ...mainKeyboard() }
      )
    } catch (err) {
      console.error('[TG wallet link]', err.message)
      ctx.reply('Something went wrong. Try again.', mainKeyboard())
    }
  })

  // Market command removed — not needed

  // ── Subscribe ───────────────────────────────────────────────────────────────
  bot.hears(['Subscribe', '/subscribe'], async (ctx) => {
    const appUrl = getAppUrl()
    await ctx.reply(
      '*1launch Pricing*\n\nBSC deploy — $15 per token\nSolana deploy — $6 per token\n\nVolume Bot — $29 / $79 / $149 per token\nKeeps your chart alive after launch.\n\nPay per launch. No monthly fees.',
      { parse_mode: 'Markdown', ...(appUrl ? Markup.inlineKeyboard([[Markup.button.url('Get Started', `${appUrl}/dashboard`)]]) : {}) }
    )
  })

  // ── Settings ────────────────────────────────────────────────────────────────
  bot.hears(['Settings', '/settings'], async (ctx) => {
    const user   = await getOrCreateUser(ctx)
    const appUrl = getAppUrl()
    const wallet = user?.wallet_address
      ? `Wallet linked: \`${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-4)}\``
      : 'No wallet linked yet'
    const plan = `Plan: *${user?.plan || 'free'}*`
    const linkNote = !user?.wallet_address
      ? '\n\nTo link your wallet, paste your wallet address here. Make sure you have already connected it on 1launch web first.'
      : ''
    await ctx.reply(
      `*Your Account*\n\n${wallet}\n${plan}${linkNote}`,
      { parse_mode: 'Markdown', ...(appUrl && !user?.wallet_address ? Markup.inlineKeyboard([[Markup.button.url('Connect on Web First', `${appUrl}/dashboard`)]]) : {}) }
    )
  })

  // ── Help ────────────────────────────────────────────────────────────────────
  bot.hears(['Help', '/help'], async (ctx) => {
    await ctx.reply(
      '*1launch Bot*\n\nNarratives — trending meme narratives\nLaunch Token — start a launch\nMy Tokens — your deployed tokens\nAlerts — price, mcap & narrative alerts\nSubscribe — view pricing\nSettings — account and wallet info',
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
        `*Token Data*\n\nPrice: $${data.price_usd?.toFixed(8)}\nMCap: ${fmt(data.market_cap_usd)}\nVol 24h: ${fmt(data.volume_24h)}\n24h: ${change >= 0 ? '+' : ''}${change?.toFixed(2)}%\nLiquidity: ${fmt(data.liquidity_usd)}`,
        { parse_mode: 'Markdown', ...mainKeyboard() }
      )
    } catch { ctx.reply('Failed.', mainKeyboard()) }
  })

  bot.catch((err) => { console.error('[TelegramBot]', err.message) })
}

// ── Daily digest ──────────────────────────────────────────────────────────────
async function sendDailyDigest() {
  try {
    const { data: narratives } = await supabase
      .from('narratives')
      .select('title, hype_score')
      .gt('expires_at', new Date().toISOString())
      .order('hype_score', { ascending: false })
      .limit(5)

    if (!narratives?.length) return
    const appUrl = getAppUrl()
    const lines  = narratives.map((n, i) => `${i + 1}. *${n.title}* — ${n.hype_score}/100`).join('\n')
    const msg    = `gm. Today's top narratives:\n\n${lines}\n\n${appUrl ? `Launch: ${appUrl}/dashboard` : ''}`

    const { data: users } = await supabase.from('users').select('telegram_chat_id').not('telegram_chat_id', 'is', null)
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

        await sendNotification(alert.telegram_chat_id, `*Alert triggered*\n\n${label}\n\`${alert.contract_address.slice(0, 10)}...\``)

        try {
          await supabase.from('price_alerts')
            .update({ triggered: true, triggered_at: new Date().toISOString() })
            .eq('id', alert.id)
        } catch (e) { console.warn('[TG] alert update failed:', e.message) }
      } catch {}
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
  if (botStarted) { console.warn('[TelegramBot] Already running — skipping'); return }
  const b = getBot()
  if (!b) { console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not set'); return }
  botStarted = true
  b.launch()
    .then(() => console.log('[TelegramBot] Started'))
    .catch(err => console.error('[TelegramBot] Failed:', err.message))
  process.once('SIGINT',  () => { try { b.stop('SIGINT')  } catch {} })
  process.once('SIGTERM', () => { try { b.stop('SIGTERM') } catch {} })
}

module.exports = { startBot, sendNotification, getBot, checkPriceAlerts, sendDailyDigest }
