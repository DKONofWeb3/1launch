// apps/api/src/services/bot/botManager.js

const { ethers } = require('ethers')
const { Keypair } = require('@solana/web3.js')
const { supabase } = require('../../lib/supabase')
const { BOT_TIERS, randomInterval } = require('./botConfig')
const { runCycle: bscRunCycle } = require('./bscBotExecutor')
const { runCycle: solRunCycle } = require('./solanaBotExecutor')

// ── In-memory session registry ────────────────────────────────────────────────
// Key: sessionId → { timer, stats, running }
const activeSessions = new Map()

// ── Wallet generation ─────────────────────────────────────────────────────────
function generateBSCWallets(count) {
  return Array.from({ length: count }, () => {
    const wallet = ethers.Wallet.createRandom()
    return {
      address:     wallet.address,
      private_key: wallet.privateKey,
    }
  })
}

function generateSolanaWallets(count) {
  return Array.from({ length: count }, () => {
    const kp = Keypair.generate()
    return {
      address:     kp.publicKey.toBase58(),
      private_key: JSON.stringify(Array.from(kp.secretKey)),
    }
  })
}

// ── Create a new bot session ──────────────────────────────────────────────────
async function createSession({ token_id, chain, tier, network, user_id }) {
  const config  = BOT_TIERS[tier]
  if (!config) throw new Error(`Invalid tier: ${tier}`)

  // Generate wallets
  const wallets = chain === 'solana'
    ? generateSolanaWallets(config.walletCount)
    : generateBSCWallets(config.walletCount)

  // Save session to DB
  const { data: session, error } = await supabase
    .from('bot_sessions')
    .insert({
      token_id,
      user_id:      user_id || null,
      chain,
      tier,
      network,
      status:       'stopped',
      wallets:      wallets, // stored as JSONB — in prod, encrypt private keys
      stats: {
        cycles:    0,
        buys:      0,
        sells:     0,
        volumeUSD: 0,
        lastTrade: null,
        errors:    0,
      },
      tos_accepted: false,
      created_at:   new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  return {
    session_id:      session.id,
    deposit_wallets: wallets.map(w => ({ address: w.address })), // never return private keys to frontend
    tier_config:     config,
  }
}

// ── Start a session ───────────────────────────────────────────────────────────
async function startSession(sessionId) {
  if (activeSessions.has(sessionId)) {
    throw new Error('Session already running')
  }

  // Load from DB
  const { data: session, error } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error || !session) throw new Error('Session not found')
  if (!session.tos_accepted)  throw new Error('ToS not accepted')
  if (session.status === 'running') throw new Error('Already running')

  // Update status
  await supabase
    .from('bot_sessions')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', sessionId)

  const stats = { ...session.stats }
  let lastWalletIdx = -1
  let running = true

  const runLoop = async () => {
    if (!running) return

    try {
      const cycleRunner = session.chain === 'solana' ? solRunCycle : bscRunCycle

      lastWalletIdx = await cycleRunner({
        wallets:      session.wallets,
        tokenAddress: session.token_address,
        tier:         session.tier,
        network:      session.network,
        stats,
        lastWalletIdx,
      })

      // Persist stats to DB
      await supabase
        .from('bot_sessions')
        .update({ stats })
        .eq('id', sessionId)
        .catch(() => {})
    } catch (err) {
      stats.errors = (stats.errors || 0) + 1
      console.error(`[BotManager] Session ${sessionId} cycle error:`, err.message)
    }

    if (!running) return

    // Schedule next cycle
    const interval = randomInterval(session.tier)
    console.log(`[BotManager] Session ${sessionId} next cycle in ${Math.round(interval / 1000)}s`)
    const timer = setTimeout(runLoop, interval)
    activeSessions.set(sessionId, { timer, stats, running: true })
  }

  // Store in registry
  activeSessions.set(sessionId, { timer: null, stats, running: true })

  // Start immediately
  runLoop()

  return { started: true }
}

// ── Stop a session ────────────────────────────────────────────────────────────
async function stopSession(sessionId) {
  const entry = activeSessions.get(sessionId)

  if (entry) {
    entry.running = false
    if (entry.timer) clearTimeout(entry.timer)
    activeSessions.delete(sessionId)
  }

  await supabase
    .from('bot_sessions')
    .update({ status: 'stopped', stopped_at: new Date().toISOString() })
    .eq('id', sessionId)

  return { stopped: true }
}

// ── Get live stats ────────────────────────────────────────────────────────────
function getLiveStats(sessionId) {
  const entry = activeSessions.get(sessionId)
  return entry ? { running: true, ...entry.stats } : null
}

// ── Accept ToS ────────────────────────────────────────────────────────────────
async function acceptToS(sessionId) {
  await supabase
    .from('bot_sessions')
    .update({ tos_accepted: true })
    .eq('id', sessionId)
  return { accepted: true }
}

// ── Restore sessions on API restart ──────────────────────────────────────────
// Called on boot to restart any sessions that were running when server died
async function restoreRunningSessions() {
  try {
    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id')
      .eq('status', 'running')

    if (!sessions?.length) return

    console.log(`[BotManager] Restoring ${sessions.length} running sessions...`)
    for (const s of sessions) {
      startSession(s.id).catch(err =>
        console.error(`[BotManager] Failed to restore session ${s.id}:`, err.message)
      )
    }
  } catch (err) {
    console.error('[BotManager] Failed to restore sessions:', err.message)
  }
}

module.exports = {
  createSession,
  startSession,
  stopSession,
  getLiveStats,
  acceptToS,
  restoreRunningSessions,
}
