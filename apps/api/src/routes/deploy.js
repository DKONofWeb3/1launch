const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const deployRouter = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Deploy routes
//
// ARCHITECTURE NOTE:
// In production, token deployment is signed by the USER's wallet (MetaMask/Phantom)
// on the FRONTEND. The backend never touches user private keys.
//
// The flow is:
// 1. Frontend calls /api/deploy/prepare → gets factory address + deploy fee
// 2. User signs the transaction in their wallet (MetaMask/Phantom)
// 3. Transaction goes directly to the blockchain
// 4. Frontend calls /api/deploy/record → backend saves the result to DB
//
// The server-side deploy route (/api/deploy/server-side) is ONLY for
// testnet testing when you want to bypass wallet signing.
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/deploy/config/:chain
// Returns the deployment config the frontend needs to build the transaction
deployRouter.get('/config/:chain', async (req, res) => {
  try {
    const { chain } = req.params
    const network = req.query.network || 'testnet'

    if (chain === 'bsc') {
      const { getChainConfig } = require('../services/deployer/bscDeployer')
      const config = getChainConfig(network)
      return res.json({
        success: true,
        data: {
          chain: 'bsc',
          network,
          factoryAddress: config.factoryAddress,
          rpc: config.rpc,
          chainId: config.chainId,
          explorerUrl: config.explorerUrl,
          // Fee in wei — frontend converts to BNB for display
          deployFeeWei: network === 'mainnet' ? '25000000000000000' : '1000000000000000',
        },
      })
    }

    if (chain === 'solana') {
      const network = req.query.network || 'devnet'
      return res.json({
        success: true,
        data: {
          chain: 'solana',
          network,
          rpc: network === 'mainnet'
            ? (process.env.HELIUS_SOLANA_URL || 'https://api.mainnet-beta.solana.com')
            : 'https://api.devnet.solana.com',
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
// Called by frontend AFTER a successful on-chain deploy
// Records the deployment result in our database
deployRouter.post('/record', async (req, res) => {
  try {
    const {
      draft_id,
      contract_address,
      chain,
      tx_hash,
      wallet_address,
      network = 'testnet',
    } = req.body

    if (!contract_address || !chain || !tx_hash || !wallet_address) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ wallet_address: wallet_address.toLowerCase(), chain, plan: 'free' })
        .select()
        .single()
      user = newUser
    }

    // Update draft status to live
    if (draft_id) {
           try {
        await supabase.from('token_drafts').update({ status: 'failed' }).eq('id', req.body.draft_id)
      } catch {}
    }

    // Record the launched token
    const { data: launched, error } = await supabase
      .from('launched_tokens')
      .insert({
        user_id:          user.id,
        draft_id:         draft_id || null,
        contract_address: contract_address.toLowerCase(),
        chain,
        tx_hash,
        audit_scan_done:  false,
        tg_setup_done:    false,
        volume_bot_tier:  'none',
      })
      .select()
      .single()

    if (error) throw error

    // Update narrative tokens_launched count if draft has a narrative
    if (draft_id) {
      const { data: draft } = await supabase
        .from('token_drafts')
        .select('narrative_id')
        .eq('id', draft_id)
        .single()

      if (draft?.narrative_id) {
        await supabase.rpc('increment_narrative_launches', {
          narrative_id: draft.narrative_id,
        }).catch(() => {})
      }
    }

    res.json({ success: true, data: launched })
  } catch (err) {
    console.error('[POST /deploy/record]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/deploy/server-side
// TESTNET ONLY — platform wallet deploys on behalf of user (no MetaMask needed)
// Remove or gate this behind admin auth before going to mainnet
deployRouter.post('/server-side', async (req, res) => {
  try {
    const { draft_id, chain = 'bsc', network = 'testnet' } = req.body

    if (!draft_id) {
      return res.status(400).json({ success: false, error: 'draft_id required' })
    }

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('token_drafts')
      .select('*')
      .eq('id', draft_id)
      .single()

    if (draftError || !draft) {
      return res.status(404).json({ success: false, error: 'Draft not found' })
    }

    // Update status to deploying
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
        totalSupply:  draft.total_supply,
        ownerAddress: process.env.PLATFORM_WALLET_ADDRESS,
        network,
      })
    } else if (chain === 'solana') {
      const { deployTokenServerSide } = require('../services/deployer/solanaDeployer')
      result = await deployTokenServerSide({
        name:         draft.name,
        symbol:       draft.ticker,
        totalSupply:  draft.total_supply,
        ownerAddress: process.env.SOLANA_PLATFORM_WALLET_ADDRESS,
        network,
      })
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported chain' })
    }

    // Update draft to live
    await supabase
      .from('token_drafts')
      .update({ status: 'live' })
      .eq('id', draft_id)

    // Save to launched_tokens
    const { data: launched } = await supabase
      .from('launched_tokens')
      .insert({
        draft_id,
        contract_address: result.contractAddress.toLowerCase(),
        chain,
        tx_hash:          result.txHash,
        audit_scan_done:  false,
        tg_setup_done:    false,
        volume_bot_tier:  'none',
      })
      .select()
      .single()

    res.json({
      success: true,
      data: {
        ...launched,
        explorerUrl: result.explorerUrl,
        txUrl: result.txUrl,
      },
    })
  } catch (err) {
    console.error('[POST /deploy/server-side]', err.message)

    // Mark draft as failed
    if (req.body.draft_id) {
      await supabase
        .from('token_drafts')
        .update({ status: 'failed' })
        .eq('id', req.body.draft_id)
        .catch(() => {})
    }

    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { deployRouter }
