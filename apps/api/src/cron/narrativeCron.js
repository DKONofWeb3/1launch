const { supabase } = require('../lib/supabase')
const { scrapeReddit } = require('../services/redditScraper')
const { scrapeGoogleTrends } = require('../services/googleTrendsScraper')
const { scrapeTikTokTrending } = require('../services/tiktokScraper')
const { scrapeDexScreener, scrapeCoinGeckoTrending } = require('../services/onchainScraper')
const {
  computeHypeScore,
  estimateWindow,
  enrichNarrativeWithAI,
  clusterSignals,
} = require('../services/narrativeScorer')

async function runNarrativeCron() {
  console.log('[NarrativeCron] Starting scrape cycle...')

  try {
    // ── Step 1: Pull from all sources in parallel ───────────────────────────
    const [redditSignals, trendsSignals, tiktokSignals, dexSignals, geckoSignals] =
      await Promise.all([
        scrapeReddit(),
        scrapeGoogleTrends('US'),
        scrapeTikTokTrending(),
        scrapeDexScreener(),
        scrapeCoinGeckoTrending(),
      ])

    const allSignals = [
      ...redditSignals,
      ...trendsSignals,
      ...tiktokSignals,
      ...dexSignals,
      ...geckoSignals,
    ]

    console.log(`[NarrativeCron] Collected ${allSignals.length} raw signals`)

    if (allSignals.length === 0) {
      console.warn('[NarrativeCron] No signals collected — check scrapers')
      return
    }

    // ── Step 2: Cluster into narratives ─────────────────────────────────────
    const clusters = clusterSignals(allSignals)
    console.log(`[NarrativeCron] Clustered into ${clusters.length} narratives`)

    // ── Step 3: Score + enrich top 10 clusters ───────────────────────────────
    const topClusters = clusters
      .map((c) => ({ ...c, hype_score: computeHypeScore(c.signals) }))
      .sort((a, b) => b.hype_score - a.hype_score)
      .slice(0, 10)

    // ── Step 4: AI enrich each cluster (sequential to avoid rate limits) ────
    const enriched = []
    for (const cluster of topClusters) {
      const ai = await enrichNarrativeWithAI(cluster.title, cluster.signals)
      if (!ai) continue

      const sources = [...new Set(cluster.signals.map((s) => s.source))]
      const windowEstimate = estimateWindow(cluster.hype_score, sources)

      // Parse window into hours for expires_at
      const hoursMatch = windowEstimate.match(/(\d+)/)
      const hours = hoursMatch ? parseInt(hoursMatch[1]) + 2 : 6
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

      enriched.push({
        title: cluster.title,
        summary: ai.summary || cluster.title,
        hype_score: cluster.hype_score,
        estimated_window: ai.estimated_window || windowEstimate,
        sources,
        suggested_angles: ai.suggested_angles || [],
        suggested_tickers: ai.suggested_tickers || [],
        tokens_launched: 0,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })

      // Small delay between AI calls to respect free tier limits
      await new Promise((r) => setTimeout(r, 3000))
    }

    // ── Step 5: Upsert into Supabase ─────────────────────────────────────────
    if (enriched.length === 0) {
      console.warn('[NarrativeCron] No enriched narratives to save')
      return
    }

    const { error } = await supabase
      .from('narratives')
      .insert(enriched)

    if (error) {
      console.error('[NarrativeCron] Supabase insert error:', error.message)
    } else {
      console.log(`[NarrativeCron] Saved ${enriched.length} narratives to DB`)
    }

    // ── Step 6: Clean up expired narratives ──────────────────────────────────
    await supabase
      .from('narratives')
      .delete()
      .lt('expires_at', new Date().toISOString())

    console.log('[NarrativeCron] Cycle complete ✓')
  } catch (err) {
    console.error('[NarrativeCron] Fatal error:', err.message)
  }
}

module.exports = { runNarrativeCron }
