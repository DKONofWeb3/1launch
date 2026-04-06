// apps/api/src/routes/lplock.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')
const {
  getLPTokenAddress,
  getLPBalance,
  getExistingLocks,
  UNICRYPT_LOCKER_MAINNET,
  UNICRYPT_LOCKER_TESTNET,
} = require('../services/lpLockService')

const lplockRouter = Router()

// GET /api/lplock/:tokenId/info
// Returns LP pair address, balance, existing locks
lplockRouter.get('/:tokenId/info', async (req, res) => {
  try {
    const { wallet } = req.query

    const { data: token, error } = await supabase
      .from('launched_tokens')
      .select('contract_address, chain, network')
      .eq('id', req.params.tokenId)
      .single()

    if (error || !token) {
      return res.status(404).json({ success: false, error: 'Token not found' })
    }

    if (token.chain !== 'bsc') {
      return res.json({
        success: true,
        data: {
          supported: false,
          message: 'LP locking is currently supported on BSC only. Solana support coming soon.',
        }
      })
    }

    const network = token.network || 'mainnet'

    // Find LP pair address
    const lpTokenAddress = await getLPTokenAddress(token.contract_address, network)

    if (!lpTokenAddress) {
      return res.json({
        success: true,
        data: {
          supported: true,
          lp_pair: null,
          lp_balance: null,
          existing_locks: [],
          message: 'No liquidity pair found. Add liquidity to PancakeSwap first.',
        }
      })
    }

    // Get LP balance if wallet provided
    const lpBalance = wallet
      ? await getLPBalance(lpTokenAddress, wallet, network)
      : null

    // Get existing locks
    const existingLocks = wallet
      ? await getExistingLocks(wallet, lpTokenAddress, network)
      : []

    const lockerAddress = network === 'mainnet'
      ? UNICRYPT_LOCKER_MAINNET
      : UNICRYPT_LOCKER_TESTNET

    res.json({
      success: true,
      data: {
        supported: true,
        lp_pair:        lpTokenAddress,
        lp_balance:     lpBalance,
        existing_locks: existingLocks,
        locker_address: lockerAddress,
        unicrypt_url:   network === 'mainnet'
          ? `https://app.uncx.network/services/lock-liquidity?chain=bsc&address=${lpTokenAddress}`
          : null,
      }
    })
  } catch (err) {
    console.error('[GET /lplock/info]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/lplock/:tokenId/record
// Records a completed LP lock transaction (called after frontend tx completes)
lplockRouter.post('/:tokenId/record', async (req, res) => {
  try {
    const {
      lp_token_address,
      amount,
      unlock_date,
      tx_hash,
      lock_id,
      wallet_address,
    } = req.body

    const { data, error } = await supabase
      .from('lp_locks')
      .insert({
        token_id:        req.params.tokenId,
        lp_token_address,
        amount,
        unlock_date:     new Date(unlock_date * 1000).toISOString(),
        tx_hash,
        lock_id:         lock_id || null,
        wallet_address,
        platform:        'unicrypt',
        created_at:      new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Update launched_tokens to mark LP as locked
    await supabase
      .from('launched_tokens')
      .update({ lp_locked: true, lp_lock_tx: tx_hash })
      .eq('id', req.params.tokenId)

    res.json({ success: true, data })
  } catch (err) {
    console.error('[POST /lplock/record]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/lplock/:tokenId/locks — get all recorded locks for a token
lplockRouter.get('/:tokenId/locks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lp_locks')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { lplockRouter }
