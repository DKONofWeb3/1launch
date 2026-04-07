// apps/api/src/routes/bot.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const {
  createSession,
  startSession,
  stopSession,
  getLiveStats,
  acceptToS,
} = require('../services/bot/botManager')

const botRouter = Router()

// POST /api/bot/create
// Creates a new bot session and returns deposit wallet addresses
botRouter.post('/create', async (req, res) => {
  try {
    const { token_id, chain, tier, network = 'testnet' } = req.body

    if (!token_id || !chain || !tier) {
      return res.status(400).json({ success: false, error: 'token_id, chain, tier required' })
    }

    // Get token address from DB
    const { data: token } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain')
      .eq('id', token_id)
      .maybeSingle()

    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    // Check for existing active session
    const { data: existing } = await supabase
      .from('bot_sessions')
      .select('id, status')
      .eq('token_id', token_id)
      .eq('chain', chain)
      .neq('status', 'stopped')
      .limit(1)

    if (existing?.length > 0) {
      return res.status(400).json({ success: false, error: 'A bot session already exists for this token. Stop it first.' })
    }

    const result = await createSession({
      token_id,
      chain,
      tier,
      network,
      token_address: token.contract_address,
    })

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[POST /bot/create]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/bot/tos/:sessionId — accept terms of service
botRouter.post('/tos/:sessionId', async (req, res) => {
  try {
    const result = await acceptToS(req.params.sessionId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/bot/start/:sessionId
botRouter.post('/start/:sessionId', async (req, res) => {
  try {
    const result = await startSession(req.params.sessionId)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[POST /bot/start]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/bot/stop/:sessionId
botRouter.post('/stop/:sessionId', async (req, res) => {
  try {
    const result = await stopSession(req.params.sessionId)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/bot/status/:sessionId — live stats
botRouter.get('/status/:sessionId', async (req, res) => {
  try {
    // Check in-memory first for live data
    const liveStats = getLiveStats(req.params.sessionId)

    if (liveStats) {
      return res.json({ success: true, data: { ...liveStats, source: 'live' } })
    }

    // Fall back to DB
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('status, stats, tier, chain, tos_accepted, created_at, started_at')
      .eq('id', req.params.sessionId)
      .maybeSingle()

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' })
    }

    res.json({ success: true, data: { ...session.stats, status: session.status, source: 'db', ...session } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/bot/sessions?token_id=
botRouter.get('/sessions', async (req, res) => {
  try {
    const { token_id } = req.query

    let query = supabase
      .from('bot_sessions')
      .select('id, token_id, chain, tier, status, stats, tos_accepted, created_at, started_at, stopped_at')
      .order('created_at', { ascending: false })

    if (token_id) query = query.eq('token_id', token_id)

    const { data, error } = await query
    if (error) throw error

    // Enrich with live stats where available
    const enriched = data.map(session => {
      const live = getLiveStats(session.id)
      return live ? { ...session, stats: live, status: 'running' } : session
    })

    res.json({ success: true, data: enriched })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/bot/wallets/:sessionId — get deposit wallet addresses (no private keys)
botRouter.get('/wallets/:sessionId', async (req, res) => {
  try {
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('wallets, chain, tier')
      .eq('id', req.params.sessionId)
      .maybeSingle()

    if (!session) return res.status(404).json({ success: false, error: 'Not found' })

    // Return addresses only — never private keys
    const addresses = (session.wallets || []).map((w, i) => ({
      index:   i + 1,
      address: w.address,
    }))

    res.json({ success: true, data: { addresses, chain: session.chain, tier: session.tier } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { botRouter }
