// apps/api/src/cron/narrativeCron.js

const { supabase }           = require('../lib/supabase')
const { scrapeReddit }       = require('../services/redditScraper')
const { scrapeRSS }          = require('../services/rssScraper')
const { scrapeGoogleTrends } = require('../services/googleTrendsScraper')
const {
  computeHypeScore,
  estimateWindow,
  enrichNarrativeWithAI,
  clusterSignals,
} = require('../services/narrativeScorer')

async function runNarrativeCron() {
  console.log('[NarrativeCron] Starting scrape cycle...')

  try {
    // ── Collect signals ───────────────────────────────────────────────────────
    const [rssSignals, redditSignals, trendsSignals] = await Promise.all([
      scrapeRSS(),
      scrapeReddit(),
      scrapeGoogleTrends(),
    ])

    const allSignals = [...rssSignals, ...redditSignals, ...trendsSignals]
    console.log(`[NarrativeCron] Collected ${allSignals.length} raw signals — RSS: ${rssSignals.length}, Reddit: ${redditSignals.length}, Trends: ${trendsSignals.length}`)

    if (allSignals.length === 0) return

    // ── Cluster ───────────────────────────────────────────────────────────────
    const clusters = clusterSignals(allSignals)
    console.log(`[NarrativeCron] Clustered into ${clusters.length} narrative groups`)

    // ── Score top 8 ──────────────────────────────────────────────────────────
    const scored = clusters
      .map(c => ({ ...c, hype_score: computeHypeScore(c.signals) }))
      .sort((a, b) => b.hype_score - a.hype_score)
      .slice(0, 15)

    // ── Fetch existing active narratives to deduplicate ───────────────────────
    const { data: existing } = await supabase
      .from('narratives')
      .select('title')
      .gt('expires_at', new Date().toISOString())

    const existingTitles = new Set(
      (existing || []).map(n => n.title.toLowerCase().slice(0, 40))
    )

    // ── AI enrich — skip if title already active ──────────────────────────────
    const enriched = []
    for (const cluster of scored) {
      try {
        const ai = await enrichNarrativeWithAI(cluster.title, cluster.signals)
        if (!ai) continue

        // Deduplicate — skip if same/similar narrative already in feed
        const titleKey = (ai.title || cluster.title).toLowerCase().slice(0, 40)
        if (existingTitles.has(titleKey)) {
          console.log(`[NarrativeCron] Skipping duplicate: "${ai.title}"`)
          continue
        }
        existingTitles.add(titleKey)

        const sources = [...new Set(cluster.signals.map(s => s.meta?.source_name || s.source))]
        const window  = ai.estimated_window || estimateWindow(cluster.hype_score, sources)

        // Expire in 3 hours — keeps feed fresh
        const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()

        enriched.push({
          title:             ai.title || cluster.title.slice(0, 120),
          summary:           ai.summary || '',
          hype_score:        Math.min(99, Math.max(ai.meme_score || cluster.hype_score, cluster.hype_score)),
          estimated_window:  window,
          sources:           sources.slice(0, 5),
          suggested_angles:  ai.memecoin_angle ? [ai.memecoin_angle] : [],
          suggested_tickers: ai.suggested_tickers || [],
          category:          ai.category || 'culture',
          urgency:           ai.urgency || 'hot',
          why_it_works:      ai.why_it_works || '',
          tokens_launched:   0,
          expires_at:        expiresAt,
          created_at:        new Date().toISOString(),
        })

        console.log(`[NarrativeCron] Narrative: "${ai.title}" — meme score: ${ai.meme_score}`)
        await new Promise(r => setTimeout(r, 2000))
      } catch (err) {
        console.warn('[NarrativeCron] Enrichment failed:', err.message)
      }
    }

    if (enriched.length === 0) {
      console.warn('[NarrativeCron] No new narratives this cycle')
      return
    }

    // ── Enforce max 20 active narratives ─────────────────────────────────────
    const { count: activeCount } = await supabase
      .from('narratives')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString())

    if ((activeCount || 0) >= 20) {
      // Delete the oldest ones to make room
      const toDelete = (activeCount || 0) + enriched.length - 20
      if (toDelete > 0) {
        const { data: oldest } = await supabase
          .from('narratives')
          .select('id')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true })
          .limit(toDelete)

        if (oldest?.length) {
          await supabase
            .from('narratives')
            .delete()
            .in('id', oldest.map(n => n.id))
          console.log(`[NarrativeCron] Removed ${oldest.length} old narratives to stay at 20 cap`)
        }
      }
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const { error } = await supabase.from('narratives').insert(enriched)
    if (error) {
      console.error('[NarrativeCron] Supabase error:', error.message)
    } else {
      console.log(`[NarrativeCron] Saved ${enriched.length} new narratives`)
    }

    // ── Clean up expired ──────────────────────────────────────────────────────
    await supabase
      .from('narratives')
      .delete()
      .lt('expires_at', new Date().toISOString())

    console.log('[NarrativeCron] Cycle complete')
  } catch (err) {
    console.error('[NarrativeCron] Fatal error:', err.message)
  }
}

module.exports = { runNarrativeCron }
