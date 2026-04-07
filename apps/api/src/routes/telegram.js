const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const { generateTelegramSetup } = require('../services/telegram/telegramSetup')

const telegramRouter = Router()

// GET /api/telegram/setup/:tokenId — generate TG setup for a launched token
telegramRouter.get('/setup/:tokenId', async (req, res) => {
  try {
    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select(`*, token_drafts(*)`)
      .eq('id', req.params.tokenId)
      .single()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    const setup = generateTelegramSetup(token.token_drafts, token)
    res.json({ success: true, data: setup })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/telegram/setup/:tokenId/complete — mark TG setup as done
telegramRouter.post('/setup/:tokenId/complete', async (req, res) => {
  try {
    const { tg_link } = req.body

    const { error } = await supabase
      .from('launched_tokens')
      .update({
        tg_setup_done: true,
        tg_link: tg_link || null,
      })
      .eq('id', req.params.tokenId)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/telegram/link-wallet
// Called from web when user connects wallet — links their wallet to their TG session
telegramRouter.post('/link-wallet', async (req, res) => {
  try {
    const { wallet_address, telegram_id } = req.body
    if (!wallet_address || !telegram_id) {
      return res.status(400).json({ success: false, error: 'wallet_address and telegram_id required' })
    }

    // Find TG user
    const { data: tgUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', String(telegram_id))
      .maybeSingle()

    if (tgUser) {
      // Update their wallet
      await supabase
        .from('users')
        .update({ wallet_address: wallet_address.toLowerCase() })
        .eq('id', tgUser.id)
      return res.json({ success: true, message: 'Wallet linked to Telegram account' })
    }

    // No TG user — find or create by wallet
    const { data: walletUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .maybeSingle()

    if (walletUser) {
      await supabase
        .from('users')
        .update({ telegram_id: String(telegram_id) })
        .eq('id', walletUser.id)
      return res.json({ success: true, message: 'Telegram linked to wallet account' })
    }

    res.json({ success: false, error: 'No matching account found' })
  } catch (err) {
    console.error('[POST /telegram/link-wallet]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/telegram/session/:telegramId
// Returns user data for a TG session — used by mini app
telegramRouter.get('/session/:telegramId', async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, wallet_address, plan, telegram_username, created_at')
      .eq('telegram_id', req.params.telegramId)
      .maybeSingle()

    if (!user) return res.json({ success: true, data: null })
    res.json({ success: true, data: user })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { telegramRouter }
