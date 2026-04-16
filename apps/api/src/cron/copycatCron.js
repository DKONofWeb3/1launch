// apps/api/src/cron/copycatCron.js

const { supabase }         = require('../lib/supabase')
const { findCopycats }     = require('../services/tokenSearchService')
const { sendNotification } = require('../services/telegram/telegramBot')

async function runCopycatScan() {
  console.log('[CopycatCron] Starting scan...')

  try {
    const { data: tokens, error } = await supabase
      .from('launched_tokens')
      .select('id, contract_address, chain, launched_at, user_id, token_drafts(name, ticker)')
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

        if (!Array.isArray(copycats) || copycats.length === 0) continue

        // Check which copycats we've already alerted on
        const existingResult = await supabase
          .from('copycat_alerts')
          .select('copycat_address')
          .eq('token_id', token.id)

        const alerted     = new Set((existingResult.data || []).map(r => r.copycat_address))
        const newCopycats = copycats.filter(c => !alerted.has(c.address))

        for (const copycat of newCopycats) {
          // Insert without .catch() — use proper async/await error handling
          const insertResult = await supabase
            .from('copycat_alerts')
            .insert({
              token_id:        token.id,
              copycat_address: copycat.address,
              copycat_name:    copycat.name,
              copycat_ticker:  copycat.ticker,
              copycat_chain:   copycat.chain,
              similarity:      copycat.similarity,
              volume_24h:      copycat.volume_24h,
              market_cap:      copycat.market_cap,
              dex_url:         copycat.dex_url,
              detected_at:     new Date().toISOString(),
            })

          if (insertResult.error) {
            console.warn(`[CopycatCron] Insert failed for ${copycat.ticker}:`, insertResult.error.message)
            continue
          }

          // TG alert if user has chat linked
          if (token.user_id) {
            const userResult = await supabase
              .from('users')
              .select('telegram_chat_id')
              .eq('id', token.user_id)
              .maybeSingle()

            if (userResult.data?.telegram_chat_id) {
              const msg =
                `*Copycat Alert — $${draft.ticker}*\n\n` +
                `New token detected: ${copycat.name} ($${copycat.ticker})\n` +
                `Chain: ${copycat.chain}\n` +
                `Volume 24h: $${(copycat.volume_24h || 0).toLocaleString()}\n` +
                `View: ${copycat.dex_url}`
              try {
                await sendNotification(userResult.data.telegram_chat_id, msg)
              } catch {}
            }
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