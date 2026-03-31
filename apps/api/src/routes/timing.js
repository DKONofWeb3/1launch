// apps/api/src/routes/timing.js

const { Router } = require('express')
const { callAI } = require('../lib/ai')
const { collectMarketSignals } = require('../services/launchTimingService')

const timingRouter = Router()

// GET /api/timing/analyze?chain=bsc
// Collects all market signals and runs AI analysis
timingRouter.get('/analyze', async (req, res) => {
  try {
    const chain = req.query.chain || 'bsc'

    // Collect all market signals in parallel
    const signals = await collectMarketSignals(chain)

    // Build AI prompt with all the data
    const prompt = `
You are a crypto market analyst specializing in memecoin launches. Analyze these current market conditions and provide a launch timing recommendation.

Current Market Data:
- BTC 24h change: ${signals.sentiment.btc_24h}%
- ETH 24h change: ${signals.sentiment.eth_24h}%
- ${chain === 'bsc' ? 'BNB' : 'SOL'} 24h change: ${chain === 'bsc' ? signals.sentiment.bnb_24h : signals.sentiment.sol_24h}%
- Market Sentiment: ${signals.sentiment.sentiment}
- Fear & Greed Index: ${signals.fear_greed.value}/100 (${signals.fear_greed.label})
- ${chain === 'bsc' ? `BSC Gas: ${signals.gas.low}-${signals.gas.high} Gwei` : `Solana TPS: ${signals.solana.tps} (${signals.solana.status})`}
- DexScreener Memecoin Activity: ${signals.dex_activity.activity_level} (${signals.dex_activity.hot_pairs_24h} hot pairs in 24h)
- Top Narrative Hype Scores: ${signals.narratives.slice(0,3).map(n => `${n.title}: ${n.hype_score}/100`).join(', ') || 'none active'}
Based on these conditions, provide a launch timing analysis. Respond ONLY with JSON:

{
  "recommendation": "one of: launch_now | wait_hours | wait_days | avoid",
  "confidence": number between 0-100,
  "window": "human readable time window like 'Next 2-4 hours' or 'Tomorrow morning' or 'Wait 2-3 days'",
  "score": number 0-100 representing overall launch readiness,
  "summary": "2-3 sentence plain English explanation of current conditions and recommendation",
  "factors": [
    { "factor": "factor name", "impact": "positive|negative|neutral", "detail": "brief explanation" }
  ],
  "best_time": "specific recommendation like 'Launch between 2-4 PM UTC when US market overlaps with EU'",
  "warnings": ["any specific warnings or things to watch out for, or empty array"]
}

Factors to analyze: market sentiment, gas prices/network fees, fear & greed index, memecoin narrative activity, competitor launch timing.
Respond ONLY with JSON.
`

    const raw = await callAI(prompt)

    // Parse AI response
    let analysis
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      analysis = JSON.parse(clean)
    } catch {
      // If AI fails to return valid JSON, create a basic analysis from raw data
      const sentiment = signals.sentiment.sentiment
      const fg = signals.fear_greed.value
      const score = Math.round(
        (fg / 100 * 30) +
        (signals.dex_activity.hot_pairs_24h > 10 ? 30 : signals.dex_activity.hot_pairs_24h * 2) +
        (sentiment === 'bullish' ? 30 : sentiment === 'neutral_up' ? 20 : sentiment === 'neutral_down' ? 10 : 0) +
        (signals.narratives.length > 0 ? 10 : 0)
      )

      analysis = {
        recommendation: score > 70 ? 'launch_now' : score > 50 ? 'wait_hours' : 'wait_days',
        confidence: 60,
        window: score > 70 ? 'Next 2-4 hours' : 'Next 24-48 hours',
        score,
        summary: `Market is currently ${sentiment}. Fear & Greed at ${fg}. ${signals.dex_activity.hot_pairs_24h} hot meme pairs active.`,
        factors: [],
        best_time: 'Launch during peak trading hours 2-4 PM UTC',
        warnings: [],
      }
    }

    res.json({
      success: true,
      data: {
        analysis,
        signals: {
          sentiment:   signals.sentiment,
          fear_greed:  signals.fear_greed,
          gas:         signals.gas,
          solana:      signals.solana,
          dex_activity: signals.dex_activity,
          top_narrative: signals.narratives[0] || null,
          timestamp:   signals.timestamp,
        }
      }
    })
  } catch (err) {
    console.error('[GET /timing/analyze]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { timingRouter }
