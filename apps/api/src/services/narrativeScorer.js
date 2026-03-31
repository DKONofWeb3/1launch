const { callAI, parseAIJson } = require('../lib/ai')

// ── Hype Score Calculator ─────────────────────────────────────────────────────
// Takes raw signals and computes a 0–100 hype score based on:
// - Source diversity (how many different sources mention this)
// - Reddit score / upvotes
// - Google Trends traffic volume
// - Recency (how fresh the signal is)

function computeHypeScore(signals) {
  let score = 0

  const sourceSet = new Set(signals.map((s) => s.source))
  // More sources = more cross-platform momentum
  score += Math.min(sourceSet.size * 15, 40)

  // Reddit score contribution
  const redditSignals = signals.filter((s) => s.source === 'reddit')
  if (redditSignals.length > 0) {
    const maxScore = Math.max(...redditSignals.map((s) => s.score || 0))
    // Cap contribution at 30 points, log-scaled
    score += Math.min(Math.log10(maxScore + 1) * 10, 30)
  }

  // Google Trends contribution
  const trendsSignals = signals.filter((s) => s.source === 'google_trends')
  if (trendsSignals.length > 0) {
    score += 20
    // Bonus if traffic is high (200K+ etc)
    const highTraffic = trendsSignals.some((s) =>
      (s.meta?.traffic || '').includes('M+') || parseInt(s.meta?.traffic) > 100000
    )
    if (highTraffic) score += 10
  }

  // On-chain signal bonus
  if (sourceSet.has('dexscreener') || sourceSet.has('coingecko')) score += 15

  // TikTok bonus — early signal
  if (sourceSet.has('tiktok')) score += 10

  return Math.min(Math.round(score), 100)
}

// ── Estimate narrative window ─────────────────────────────────────────────────
function estimateWindow(hypeScore, sources) {
  // Higher hype = shorter window (moves fast, dies fast)
  if (hypeScore >= 80) return '1–3 hrs'
  if (hypeScore >= 60) return '3–8 hrs'
  if (hypeScore >= 40) return '8–24 hrs'
  return '1–3 days'
}

// ── AI Enrichment ─────────────────────────────────────────────────────────────
// Ask AI to generate token angles, suggested tickers, and a summary
async function enrichNarrativeWithAI(narrativeTitle, signals) {
  const prompt = `
You are a memecoin launch strategist. A new trending narrative has been detected across crypto social media.

Narrative: "${narrativeTitle}"

Raw signals from the web:
${signals.slice(0, 5).map((s) => `- [${s.source}] ${s.text}`).join('\n')}

Generate creative memecoin launch angles for this narrative. Respond ONLY with a valid JSON object, no markdown, no explanation:

{
  "summary": "1-2 sentence explanation of why this narrative is trending and why it's memeable",
  "suggested_angles": ["ANGLE1", "ANGLE2", "ANGLE3"],
  "suggested_tickers": ["TICK1", "TICK2", "TICK3"],
  "estimated_window": "rough time estimate like '3-6 hrs' or '1-2 days'"
}

Rules:
- Tickers must be 2–6 characters, uppercase
- Angles are short token name concepts (1–3 words)
- Keep it degen, punchy, memeable
- Respond ONLY with the JSON object
`

  try {
    const raw = await callAI(prompt)
    const parsed = parseAIJson(raw)
    return parsed
  } catch (err) {
    console.warn('[NarrativeScorer] AI enrichment failed:', err.message)
    return {
      summary: narrativeTitle,
      suggested_angles: [],
      suggested_tickers: [],
      estimated_window: '3–6 hrs',
    }
  }
}

// ── Group signals into narrative clusters ────────────────────────────────────
// Simple keyword overlap grouping — no ML needed for MVP
function clusterSignals(allSignals) {
  const clusters = {}

  for (const signal of allSignals) {
    const words = signal.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)

    // Use the most meaningful word as cluster key
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'been', 'they'])
    const keyWord = words.find((w) => !stopWords.has(w)) || words[0]

    if (!keyWord) continue

    if (!clusters[keyWord]) {
      clusters[keyWord] = {
        title: keyWord.toUpperCase(),
        signals: [],
      }
    }
    clusters[keyWord].signals.push(signal)
  }

  // Return clusters with 2+ signals — single mentions aren't trends
  return Object.values(clusters).filter((c) => c.signals.length >= 2)
}

module.exports = { computeHypeScore, estimateWindow, enrichNarrativeWithAI, clusterSignals }
