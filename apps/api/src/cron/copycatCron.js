// apps/api/src/cron/copycatCron.js

const { supabase } = require('../lib/supabase')
const { findCopycats } = require('../services/tokenSearchService')
const { sendNotification } = require('../services/telegram/telegramBot')

// Runs every hour — checks all launched tokens for new copycats
async function runCopycatScan() {
  console.log('[CopycatCron] Starting scan...')

  try {
    // Get all launched tokens with their draft info
    const { data: tokens, error } = await supabase
      .from('launched_tokens')
      .select(`
        id, contract_address, chain, launched_at,
        token_drafts(name, ticker)
      `)
      .limit(50)

    if (error || !tokens?.length) return

    for (const token of tokens) {
      const draft = token.token_drafts
      if (!draft?.name || !draft?.ticker) continue

      try {
        const copycats = await findCopycats(
          draft.name,
          draft.ticker,
          token.contract_address,
          token.launched_at
        )

        if (!copycats.length) continue

        // Check which ones we haven't alerted about yet
        const { data: existing } = await supabase
          .from('copycat_alerts')
          .select('copycat_address')
          .eq('token_id', token.id)

        const alerted = new Set(existing || []).map((r => r.copycat_address))
        const newCopycats = copycats.filter(c => !alerted.has(c.address))

        for (const copycat of newCopycats) {
          // Save to DB
          await supabase
            .from('copycat_alerts')
            .insert({
              token_id:         token.id,
              copycat_address:  copycat.address,
              copycat_name:     copycat.name,
              copycat_ticker:   copycat.ticker,
              copycat_chain:    copycat.chain,
              similarity:       copycat.similarity,
              volume_24h:       copycat.volume_24h,
              market_cap:       copycat.market_cap,
              dex_url:          copycat.dex_url,
              detected_at:      new Date().toISOString(),
            })
            .catch(() => {})

          // Send TG alert if user has a linked TG chat
          const { data: user } = await supabase
            .from('users')
            .select('telegram_chat_id')
            .eq('id', token.user_id || '')
            .single()
            .catch(() => ({ data: null }))

          if (user?.telegram_chat_id) {
            const msg =
              `*Copycat Alert — $${draft.ticker}*\n\n` +
              `New token detected with similar ${copycat.similarity === 'exact_ticker' ? 'ticker' : 'name'}:\n\n` +
              `Name: ${copycat.name} ($${copycat.ticker})\n` +
              `Chain: ${copycat.chain}\n` +
              `Volume 24h: $${copycat.volume_24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n` +
              `Address: \`${copycat.address}\`\n\n` +
              `Warn your community to watch out for this.\n` +
              `View: ${copycat.dex_url}`

            await sendNotification(user.telegram_chat_id, msg)
          }
        }

        if (newCopycats.length > 0) {
          console.log(`[CopycatCron] Found ${newCopycats.length} new copycats for $${draft.ticker}`)
        }
      } catch (err) {
        console.warn(`[CopycatCron] Failed for ${draft.ticker}:`, err.message)
      }
    }

    console.log('[CopycatCron] Scan complete')
  } catch (err) {
    console.error('[CopycatCron] Fatal error:', err.message)
  }
}

module.exports = { runCopycatScan }
