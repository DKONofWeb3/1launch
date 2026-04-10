// apps/api/src/routes/telegram.js

const { Router }   = require('express')
const { supabase } = require('../lib/supabase')

const telegramRouter = Router()

// GET /api/telegram/wallet?telegram_id=xxx
// Used by mini app on load to auto-detect linked wallet
telegramRouter.get('/wallet', async (req, res) => {
  try {
    const { telegram_id } = req.query
    if (!telegram_id) return res.status(400).json({ success: false, error: 'telegram_id required' })

    const { data: user } = await supabase
      .from('users')
      .select('wallet_address, plan')
      .eq('telegram_id', String(telegram_id))
      .maybeSingle()

    if (!user || !user.wallet_address) {
      return res.json({ success: true, data: null })
    }

    res.json({ success: true, data: { wallet_address: user.wallet_address, plan: user.plan } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/telegram/link-wallet
telegramRouter.post('/link-wallet', async (req, res) => {
  try {
    const { telegram_id, wallet_address } = req.body
    if (!telegram_id || !wallet_address) {
      return res.status(400).json({ success: false, error: 'telegram_id and wallet_address required' })
    }

    const { data: walletUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .maybeSingle()

    if (!walletUser) {
      return res.json({ success: false, error: 'Wallet not connected to 1launch yet' })
    }

    await supabase
      .from('users')
      .update({ telegram_id: String(telegram_id) })
      .eq('id', walletUser.id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { telegramRouter }
