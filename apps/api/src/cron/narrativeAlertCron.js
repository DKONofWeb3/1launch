// apps/api/src/cron/narrativeAlertCron.js

const { supabase }         = require('../lib/supabase')
const { sendNotification } = require('../services/telegram/telegramBot')

async function runNarrativeAlertCron() {
  try {
    // Any users with active narrative alerts?
    const { data: alerts } = await supabase
      .from('narrative_alerts')
      .select('telegram_chat_id')
      .eq('triggered', false)

    if (!alerts?.length) return

    // Any hot narratives right now?
    const { data: hot } = await supabase
      .from('narratives')
      .select('id, title, hype_score')
      .gte('hype_score', 80)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (!hot?.length) return

    const n      = hot[0]
    const appUrl = process.env.WEB_URL || ''
    const msg    =
      `*Hot narrative detected*\n\n` +
      `*${n.title}*\nScore: ${n.hype_score}/100\n\n` +
      (appUrl ? `Launch now: ${appUrl}/launch?narrative=${n.id}` : '')

    for (const alert of alerts) {
      await sendNotification(alert.telegram_chat_id, msg).catch(() => {})
      await new Promise(r => setTimeout(r, 100))
    }

    console.log(`[NarrativeAlertCron] Alert sent to ${alerts.length} users for "${n.title}"`)
  } catch (err) {
    console.error('[NarrativeAlertCron]', err.message)
  }
}

module.exports = { runNarrativeAlertCron }
