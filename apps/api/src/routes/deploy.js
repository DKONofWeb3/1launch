// apps/api/src/routes/deploy.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const deployRouter = Router()

// ── Helper: normalise contract address for storage ────────────────────────────
// BSC/EVM: case-insensitive → lowercase
// Solana:  case-SENSITIVE base58 → preserve exactly

function normaliseAddress(address, chain) {
  if (!address) return address
  if (chain === 'solana') return address
  return address.toLowerCase()
}

// ── Helper: find or create user by their BSC/EVM wallet ──────────────────────
// User identity is ALWAYS the connected BSC wallet (0x...).
// Never pass a Solana address here — it won't match any user row.

async function resolveUserId(bscWallet) {
  if (!bscWallet) return null
  const normalised = bscWallet.toLowerCase()

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', normalised)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created } = await supabase
    .from('users')
    .insert({ wallet_address: normalised, plan: 'free' })
    .select('id')
    .single()

  return created?.id || null
}

// GET /api/deploy/config/:chain
deployRouter.get('/config/:chain', async (req, res) => {
  try {
    const { chain } = req.params
    const network   = req.query.network || 'mainnet'

    if (chain === 'bsc') {
      const { getChainConfig } = require('../services/deployer/bscDeployer')
      const config = getChainConfig(network)
      return res.json({
        success: true,
        data: {
          chain:          'bsc',
          network,
          factoryAddress: config.factoryAddress,
          rpc:            config.rpc,
          chainId:        config.chainId,
          explorerUrl:    config.explorerUrl,
          deployFeeWei:   network === 'mainnet' ? '25000000000000000' : '1000000000000000',
        },
      })
    }

    if (chain === 'solana') {
      return res.json({
        success: true,
        data: {
          chain:    'solana',
          network,
          rpc:      process.env.HELIUS_SOLANA_URL || 'https://api.mainnet-beta.solana.com',
          decimals: 9,
        },
      })
    }

    res.status(400).json({ success: false, error: 'Unsupported chain' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/deploy/record
// Called by frontend AFTER successful client-side BSC deploy
deployRouter.post('/record', async (req, res) => {
  try {
    const {
      draft_id,
      contract_address,
      chain,
      tx_hash,
      wallet_address,   // always the user's BSC wallet
      network = 'mainnet',
    } = req.body

    if (!contract_address || !chain || !tx_hash || !wallet_address) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const userId = await resolveUserId(wallet_address)
    if (!userId) {
      return res.status(500).json({ success: false, error: 'Failed to resolve user' })
    }

    if (draft_id) {
      await supabase.from('token_drafts').update({ status: 'live' }).eq('id', draft_id)
    }

    const launchResult = await supabase
      .from('launched_tokens')
      .insert({
        user_id:          userId,
        draft_id:         draft_id || null,
        contract_address: normaliseAddress(contract_address, chain),
        chain,
        tx_hash,
        launched_at:      new Date().toISOString(),
      })
      .select()
      .single()

    if (launchResult.error) throw launchResult.error

    if (draft_id) {
      const draftResult = await supabase
        .from('token_drafts').select('narrative_id').eq('id', draft_id).maybeSingle()
      if (draftResult.data?.narrative_id) {
        await supabase.rpc('increment_narrative_launches', {
          narrative_id: draftResult.data.narrative_id,
        })
      }
    }

    res.json({ success: true, data: launchResult.data })
  } catch (err) {
    console.error('[POST /deploy/record]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/deploy/server-side
deployRouter.post('/server-side', async (req, res) => {
  try {
    const {
      draft_id,
      chain = 'bsc',
      network = 'mainnet',
      wallet_address,        // ← user's BSC wallet (0x...) — used for user identity
      solana_owner_address,  // ← user's Solana wallet — only used as token destination
    } = req.body

    if (!draft_id) {
      return res.status(400).json({ success: false, error: 'draft_id required' })
    }

    const draftResult = await supabase
      .from('token_drafts').select('*').eq('id', draft_id).maybeSingle()

    if (draftResult.error || !draftResult.data) {
      return res.status(404).json({ success: false, error: 'Draft not found' })
    }

    const draft = draftResult.data

    await supabase.from('token_drafts').update({ status: 'deploying' }).eq('id', draft_id)

    let result

    if (chain === 'bsc') {
      const { deployTokenServerSide } = require('../services/deployer/bscDeployer')
      result = await deployTokenServerSide({
        name:         draft.name,
        symbol:       draft.ticker,
        totalSupply:  draft.total_supply || '1000000000',
        ownerAddress: wallet_address || process.env.PLATFORM_WALLET_ADDRESS,
        network,
      })
    } else if (chain === 'solana') {
      const { deployTokenServerSide } = require('../services/deployer/solanaDeployer')
      result = await deployTokenServerSide({
        name:         draft.name,
        symbol:       draft.ticker,
        totalSupply:  parseInt(draft.total_supply) || 1000000000,
        decimals:     9,
        // Tokens are sent to the user's Solana wallet.
        // Falls back to platform Solana wallet if not provided.
        ownerAddress: solana_owner_address || process.env.SOLANA_PLATFORM_WALLET_ADDRESS,
        network,
        description:  draft.lore || draft.description || '',
        logoUrl:      draft.logo_url || '',
      })
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported chain' })
    }

    // User identity = BSC wallet always. This is what links the token to the dashboard.
    const userId = await resolveUserId(wallet_address)

    await supabase.from('token_drafts').update({ status: 'live' }).eq('id', draft_id)

    const launchResult = await supabase
      .from('launched_tokens')
      .insert({
        user_id:          userId,   // never null now — always tied to BSC wallet
        draft_id,
        contract_address: normaliseAddress(result.contractAddress, chain),
        chain,
        tx_hash:          result.txHash,
        launched_at:      new Date().toISOString(),
      })
      .select()
      .single()

    if (launchResult.error) throw launchResult.error

    res.json({
      success: true,
      data: {
        ...launchResult.data,
        contract_address: result.contractAddress,
        explorerUrl:      result.explorerUrl,
        txUrl:            result.txUrl,
      },
    })
  } catch (err) {
    console.error('[POST /deploy/server-side]', err.message)
    if (req.body.draft_id) {
      await supabase.from('token_drafts').update({ status: 'failed' }).eq('id', req.body.draft_id)
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { deployRouter }