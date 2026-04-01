// apps/api/src/services/narrativeScorer.js
// Evaluates ANY trending signal for memecoin launch potential

const { callAI, parseAIJson } = require('../lib/ai')

// ── Cluster signals by topic similarity ──────────────────────────────────────
function clusterSignals(signals) {
  const clusters = []
  const used = new Set()

  for (let i = 0; i < signals.length; i++) {
    if (used.has(i)) continue
    const base    = signals[i]
    const group   = [base]
    const baseWords = extractKeywords(base.text)
    used.add(i)

    for (let j = i + 1; j < signals.length; j++) {
      if (used.has(j)) continue
      const other      = signals[j]
      const otherWords = extractKeywords(other.text)
      const overlap    = baseWords.filter(w => otherWords.includes(w)).length
      if (overlap >= 2) {
        group.push(other)
        used.add(j)
      }
    }

    clusters.push({
      title:   base.text.slice(0, 120),
      signals: group,
    })
  }

  return clusters.filter(c => c.signals.length >= 1)
}

function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for',
    'of', 'and', 'or', 'but', 'with', 'that', 'this', 'has', 'was', 'are', 'it',
    'as', 'by', 'be', 'have', 'from', 'not', 'they', 'his', 'her', 'its'])

  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
}

// ── Hype score from signal metadata ──────────────────────────────────────────
function computeHypeScore(signals) {
  const sourceWeights = {
    google_trends: 1.2, // trending searches = proven volume
    reddit:        1.0,
    rss:           0.9, // news = real events
  }

  const categoryBoosts = {
    entertainment: 1.3, // celebrity drama makes great memes
    politics:      1.4, // political moments = instant memes
    sports:        1.2, // sports moments = instant memes
    tech:          1.0,
    finance:       0.9,
    news:          1.1,
  }

  let score = 40 // base
  const sourceMultiplier = sourceWeights[signals[0]?.source] || 1.0
  const categoryBoost    = categoryBoosts[signals[0]?.meta?.category] || 1.0

  // More signals = more corroboration = higher score
  score += Math.min(signals.length * 8, 40)

  // Reddit score signal
  const redditSignals = signals.filter(s => s.source === 'reddit')
  if (redditSignals.length > 0) {
    const maxScore = Math.max(...redditSignals.map(s => s.score))
    score += Math.min(maxScore / 1000, 15)
  }

  // Google Trends traffic signal
  const trendsSignals = signals.filter(s => s.source === 'google_trends')
  if (trendsSignals.length > 0) {
    const maxScore = Math.max(...trendsSignals.map(s => s.score))
    score += maxScore * 0.2
  }

  return Math.min(99, Math.round(score * sourceMultiplier * categoryBoost))
}

function estimateWindow(hypeScore, sources) {
  // High hype score = shorter window (more urgency)
  if (hypeScore >= 85) return '1-3 hrs'
  if (hypeScore >= 70) return '3-8 hrs'
  if (hypeScore >= 55) return '8-24 hrs'
  if (hypeScore >= 40) return '1-2 days'
  return '2-3 days'
}

// ── Main: AI evaluates memecoin potential ────────────────────────────────────
async function enrichNarrativeWithAI(title, signals) {
  const context = signals.slice(0, 5).map(s =>
    `[${s.source}${s.meta?.category ? ' / ' + s.meta.category : ''}] ${s.text}`
  ).join('\n')

  const prompt = `You are an expert memecoin narrative analyst. Your job is to evaluate whether a trending real-world moment has potential to become a successful memecoin launch.

The best memecoin narratives come from:
- Breaking news events (political drama, celebrity incidents, viral moments)
- Trending cultural moments (new slang, viral videos, memes)  
- Sports milestones (championship wins, iconic plays, athlete drama)
- Tech announcements that the internet goes crazy about
- Anything that makes people say "someone is definitely making a coin about this"

Trending moment to evaluate:
"${title}"

Supporting signals:
${context}

Evaluate this for memecoin launch potential. Respond ONLY with JSON:

{
  "title": "short catchy narrative title (max 8 words, no emojis)",
  "summary": "1-2 sentences explaining why this moment is memeable and what makes it a good launch opportunity",
  "memecoin_angle": "the specific joke/narrative angle for the token (e.g. 'Political chaos coin', 'Celebrity beef token', 'AI takeover meme')",
  "suggested_tickers": ["3-5 ticker suggestions, short, punchy, related to the moment"],
  "estimated_window": "how long this narrative stays hot (e.g. '2-6 hrs', '1-2 days')",
  "urgency": "one of: breaking | hot | warm | evergreen",
  "category": "one of: politics | sports | entertainment | tech | finance | culture | world_events",
  "meme_score": number 0-100 representing pure meme potential (100 = guaranteed banger),
  "why_it_works": "one sentence on why this would make people want to buy"
}

If this has zero memecoin potential (boring corporate news, medical studies, etc), still respond with JSON but set meme_score below 20.
Respond ONLY with JSON.`

  try {
    const raw    = await callAI(prompt)
    const parsed = parseAIJson(raw)
    if (!parsed || !parsed.title) return null

    // Filter out low potential narratives
    if ((parsed.meme_score || 0) < 25) {
      console.log(`[NarrativeScorer] Filtered low-meme signal: ${title.slice(0, 50)}`)
      return null
    }

    return parsed
  } catch (err) {
    console.warn('[NarrativeScorer] AI enrichment failed:', err.message)
    return null
  }
}

module.exports = { clusterSignals, computeHypeScore, estimateWindow, enrichNarrativeWithAI }
