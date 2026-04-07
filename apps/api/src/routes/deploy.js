// apps/api/src/routes/deploy.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const deployRouter = Router()

// GET /api/deploy/config/:chain
deployRouter.get('/config/:chain', async (req, res) => {
  try {
    const { chain } = req.params
    const network = req.query.network || 'mainnet'

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
          chain:   'solana',
          network,
          rpc:     process.env.HELIUS_SOLANA_URL || 'https://api.mainnet-beta.solana.com',
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
// Called by frontend AFTER successful on-chain deploy
deployRouter.post('/record', async (req, res) => {
  try {
    const {
      draft_id,
      contract_address,
      chain,
      tx_hash,
      wallet_address,
      network = 'mainnet',
    } = req.body

    if (!contract_address || !chain || !tx_hash || !wallet_address) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Find or create user — no .catch() chaining
    const userResult = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .maybeSingle()

    let userId = userResult.data?.id

    if (!userId) {
      const newUserResult = await supabase
        .from('users')
        .insert({ wallet_address: wallet_address.toLowerCase(), plan: 'free' })
        .select('id')
        .single()
      userId = newUserResult.data?.id
    }

    if (!userId) {
      return res.status(500).json({ success: false, error: 'Failed to resolve user' })
    }

    // Update draft status to live
    if (draft_id) {
      await supabase
        .from('token_drafts')
        .update({ status: 'live' })
        .eq('id', draft_id)
    }

    // Record the launched token
    const launchResult = await supabase
      .from('launched_tokens')
      .insert({
        user_id:          userId,
        draft_id:         draft_id || null,
        contract_address: contract_address.toLowerCase(),
        chain,
        tx_hash,
        launched_at:      new Date().toISOString(),
      })
      .select()
      .single()

    if (launchResult.error) throw launchResult.error

    // Update narrative tokens_launched count
    if (draft_id) {
      const draftResult = await supabase
        .from('token_drafts')
        .select('narrative_id')
        .eq('id', draft_id)
        .maybeSingle()

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
// Platform wallet deploys on behalf of user (used when no factory contract yet)
deployRouter.post('/server-side', async (req, res) => {
  try {
    const { draft_id, chain = 'bsc', network = 'mainnet', wallet_address } = req.body

    if (!draft_id) {
      return res.status(400).json({ success: false, error: 'draft_id required' })
    }

    // Fetch the draft
    const draftResult = await supabase
      .from('token_drafts')
      .select('*')
      .eq('id', draft_id)
      .maybeSingle()

    if (draftResult.error || !draftResult.data) {
      return res.status(404).json({ success: false, error: 'Draft not found' })
    }

    const draft = draftResult.data

    // Mark as deploying
    await supabase
      .from('token_drafts')
      .update({ status: 'deploying' })
      .eq('id', draft_id)

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
        ownerAddress: wallet_address || process.env.SOLANA_PLATFORM_WALLET_ADDRESS,
        network,
      })
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported chain' })
    }

    // Find or create user
    let userId = null
    if (wallet_address) {
      const uResult = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet_address.toLowerCase())
        .maybeSingle()

      userId = uResult.data?.id

      if (!userId) {
        const newU = await supabase
          .from('users')
          .insert({ wallet_address: wallet_address.toLowerCase(), plan: 'free' })
          .select('id')
          .single()
        userId = newU.data?.id
      }
    }

    // Mark draft live
    await supabase
      .from('token_drafts')
      .update({ status: 'live' })
      .eq('id', draft_id)

    // Save launched token
    const launchResult = await supabase
      .from('launched_tokens')
      .insert({
        user_id:          userId,
        draft_id,
        contract_address: result.contractAddress.toLowerCase(),
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
        explorerUrl: result.explorerUrl,
        txUrl:       result.txUrl,
      },
    })
  } catch (err) {
    console.error('[POST /deploy/server-side]', err.message)

    // Mark draft as failed — no .catch() chaining
    if (req.body.draft_id) {
      await supabase
        .from('token_drafts')
        .update({ status: 'failed' })
        .eq('id', req.body.draft_id)
    }

    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { deployRouter }