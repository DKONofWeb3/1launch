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

    // Find hot narratives that have NOT been alerted yet
    // We track this with an `alerted` boolean on the narrative itself
    const { data: hot } = await supabase
      .from('narratives')
      .select('id, title, hype_score')
      .gte('hype_score', 80)
      .gt('expires_at', new Date().toISOString())
      .eq('alerted', false)          // only narratives we haven't alerted for yet
      .order('hype_score', { ascending: false })
      .limit(1)

    if (!hot?.length) return

    const n      = hot[0]
    const appUrl = process.env.WEB_URL || ''
    const msg    =
      `*Hot narrative detected*\n\n` +
      `*${n.title}*\nScore: ${n.hype_score}/100\n\n` +
      (appUrl ? `Launch now: ${appUrl}/launch?narrative=${n.id}` : '')

    // Send to all users with active narrative alerts
    for (const alert of alerts) {
      await sendNotification(alert.telegram_chat_id, msg).catch(() => {})
      await new Promise(r => setTimeout(r, 100))
    }

    // Mark this narrative as alerted so we never fire it again
    await supabase
      .from('narratives')
      .update({ alerted: true })
      .eq('id', n.id)

    console.log(`[NarrativeAlertCron] Alert sent to ${alerts.length} users for "${n.title}"`)
  } catch (err) {
    console.error('[NarrativeAlertCron]', err.message)
  }
}

module.exports = { runNarrativeAlertCron }