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

module.exports = { telegramRouter }
