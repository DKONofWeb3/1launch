// apps/api/src/cron/priceAlertCron.js

const { supabase } = require('../lib/supabase')
const { getTokenData } = require('../services/dexscreenerService')
const { sendNotification } = require('../services/telegram/telegramBot')

async function runPriceAlertCheck() {
  try {
    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('triggered', false)

    if (!alerts?.length) return

    // Group by contract+chain to avoid duplicate fetches
    const tokenMap = new Map()
    for (const alert of alerts) {
      const key = `${alert.chain}_${alert.contract_address}`
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { contract_address: alert.contract_address, chain: alert.chain, alerts: [] })
      }
      tokenMap.get(key).alerts.push(alert)
    }

    for (const [, tokenData] of tokenMap) {
      try {
        const market = await getTokenData(tokenData.contract_address, tokenData.chain)
        if (!market?.price_usd) continue

        const currentPrice = market.price_usd

        for (const alert of tokenData.alerts) {
          const hit = alert.direction === 'below'
            ? currentPrice <= alert.target_price
            : currentPrice >= alert.target_price // default is 'above'

          if (hit) {
            // Send TG notification
            await sendNotification(
              alert.telegram_chat_id,
              `*Price Alert Triggered*\n\n` +
              `Token: \`${alert.contract_address.slice(0, 10)}...\`\n` +
              `Chain: ${alert.chain.toUpperCase()}\n` +
              `Current price: $${currentPrice.toFixed(8)}\n` +
              `Your target: $${alert.target_price}`
            )

            // Mark as triggered
            await supabase
              .from('price_alerts')
              .update({ triggered: true, triggered_at: new Date().toISOString() })
              .eq('id', alert.id)
          }
        }
      } catch {}
    }
  } catch (err) {
    console.error('[PriceAlertCron] Error:', err.message)
  }
}

module.exports = { runPriceAlertCheck }
