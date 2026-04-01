// apps/api/src/cron/narrativeCron.js

const { supabase }             = require('../lib/supabase')
const { scrapeReddit }         = require('../services/redditScraper')
const { scrapeRSS }            = require('../services/rssScraper')
const { scrapeGoogleTrends }   = require('../services/googleTrendsScraper')
const {
  computeHypeScore,
  estimateWindow,
  enrichNarrativeWithAI,
  clusterSignals,
} = require('../services/narrativeScorer')

async function runNarrativeCron() {
  console.log('[NarrativeCron] Starting scrape cycle...')

  try {
    // ── Step 1: Pull from all real-world sources in parallel ─────────────────
    const [redditSignals, rssSignals, trendsUS] = await Promise.all([
      scrapeReddit(),
      scrapeRSS(),
      scrapeGoogleTrends('US'),
    ])

    const allSignals = [...rssSignals, ...redditSignals, ...trendsUS]

    console.log(`[NarrativeCron] Collected ${allSignals.length} raw signals — RSS: ${rssSignals.length}, Reddit: ${redditSignals.length}, Trends: ${trendsUS.length}`)

    if (allSignals.length === 0) {
      console.warn('[NarrativeCron] No signals — check scrapers')
      return
    }

    // ── Step 2: Cluster into narrative groups ────────────────────────────────
    const clusters = clusterSignals(allSignals)
    console.log(`[NarrativeCron] Clustered into ${clusters.length} narrative groups`)

    // ── Step 3: Score all clusters, take top 15 ──────────────────────────────
    const scored = clusters
      .map(c => ({ ...c, hype_score: computeHypeScore(c.signals) }))
      .sort((a, b) => b.hype_score - a.hype_score)
      .slice(0, 15)

    // ── Step 4: AI evaluation — filter for actual memecoin potential ──────────
    const enriched = []
    for (const cluster of scored) {
      try {
        const ai = await enrichNarrativeWithAI(cluster.title, cluster.signals)
        if (!ai) continue // AI filtered it out (low meme potential)

        const sources = [...new Set(cluster.signals.map(s => s.meta?.source_name || s.source))]
        const window  = ai.estimated_window || estimateWindow(cluster.hype_score, sources)

        // Parse window into hours for expires_at
        const hoursMatch = window.match(/(\d+)/)
        const hours      = hoursMatch ? parseInt(hoursMatch[1]) + 4 : 8
        const expiresAt  = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

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
        await new Promise(r => setTimeout(r, 800)) // rate limit AI calls
      } catch (err) {
        console.warn('[NarrativeCron] Cluster enrichment failed:', err.message)
      }
    }

    if (enriched.length === 0) {
      console.warn('[NarrativeCron] No narratives passed the meme filter this cycle')
      return
    }

    // ── Step 5: Save to DB ───────────────────────────────────────────────────
    const { error } = await supabase.from('narratives').insert(enriched)

    if (error) {
      console.error('[NarrativeCron] Supabase error:', error.message)
    } else {
      console.log(`[NarrativeCron] Saved ${enriched.length} real-world narratives`)
    }

    // ── Step 6: Clean up expired ─────────────────────────────────────────────
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
