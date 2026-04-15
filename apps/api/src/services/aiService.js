// apps/api/src/services/aiService.js
//
// OpenRouter integration with model tiering:
//   - google/gemini-flash-1.5       → narrative grading (high volume, cheap)
//   - meta-llama/llama-3.1-8b-instruct → token generation (fast, near-instant)
//
// Concurrency: p-limit caps simultaneous AI calls so we never flood the API
// Caching:     narrative grades are saved to Supabase — only re-graded if new

const OpenAI  = require('openai')
const pLimit  = require('p-limit').default || require('p-limit')

// ── Client ────────────────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey:  process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://1launchos.xyz',
    'X-Title':      '1launch',
  },
})

// ── Concurrency limiters ──────────────────────────────────────────────────────
// Narrative grading runs in batches (cron) — allow up to 5 at once
// Token generation is user-facing — allow up to 10 at once

const narrativeLimit  = pLimit(5)
const generationLimit = pLimit(10)

// ── Models ────────────────────────────────────────────────────────────────────

const MODELS = {
  narrative:   'google/gemini-flash-1.5',
  generation:  'meta-llama/llama-3.1-8b-instruct',
}

// ── Narrative grading ─────────────────────────────────────────────────────────
// Used by narrativeCron. Checks DB cache first — only calls AI for new narratives.

async function gradeNarrative(narrative, supabase) {
  // Check cache — if we already graded this narrative, return cached result
  if (narrative.id) {
    const { data: cached } = await supabase
      .from('narratives')
      .select('ai_grade, ai_summary, ai_token_angles')
      .eq('id', narrative.id)
      .not('ai_grade', 'is', null)
      .maybeSingle()

    if (cached?.ai_grade) {
      return {
        grade:        cached.ai_grade,
        summary:      cached.ai_summary,
        tokenAngles:  cached.ai_token_angles,
        fromCache:    true,
      }
    }
  }

  return narrativeLimit(async () => {
    const prompt = `You are a crypto narrative analyst. Grade this trending topic for memecoin potential.

Topic: "${narrative.title}"
Source: ${narrative.source || 'unknown'}
Score: ${narrative.score || 0}

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "grade": <number 1-10>,
  "summary": "<2 sentence summary of why this is or isn't good for a memecoin>",
  "token_angles": ["<angle 1>", "<angle 2>", "<angle 3>"],
  "window": "<how long this narrative will stay hot: hours/days/weeks>",
  "risk": "<low|medium|high>"
}`

    const response = await openrouter.chat.completions.create({
      model:       MODELS.narrative,
      max_tokens:  300,
      temperature: 0.3,
      messages:    [{ role: 'user', content: prompt }],
    })

    const raw  = response.choices[0]?.message?.content || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      parsed = { grade: 5, summary: narrative.title, token_angles: [], window: 'days', risk: 'medium' }
    }

    // Save to DB so we don't re-grade this narrative
    if (narrative.id && supabase) {
      await supabase
        .from('narratives')
        .update({
          ai_grade:         parsed.grade,
          ai_summary:       parsed.summary,
          ai_token_angles:  parsed.token_angles,
          ai_window:        parsed.window,
          ai_risk:          parsed.risk,
        })
        .eq('id', narrative.id)
    }

    return {
      grade:       parsed.grade,
      summary:     parsed.summary,
      tokenAngles: parsed.token_angles,
      window:      parsed.window,
      risk:        parsed.risk,
      fromCache:   false,
    }
  })
}

// ── Token generation — single call, full JSON output ─────────────────────────
// One API call returns everything: name, ticker, lore, tweets, bios.
// This prevents multiple round-trips and cuts latency significantly.

async function generateTokenDetails({ narrative, userPrompt }) {
  return generationLimit(async () => {
    const context = userPrompt || narrative?.title || 'a viral internet trend'

    const prompt = `You are a memecoin branding expert. Generate complete token details for a memecoin based on this trend/idea: "${context}"

Respond with ONLY valid JSON, no markdown, no backticks, no explanation:
{
  "name": "<catchy memecoin name, 2-3 words max>",
  "ticker": "<3-5 uppercase letters>",
  "lore": "<2-3 sentence backstory/narrative for the token, written like a crypto manifesto>",
  "twitter_bio": "<Twitter/X bio under 160 chars, punchy and memeable>",
  "tg_bio": "<Telegram group description under 200 chars>",
  "first_tweets": [
    "<launch tweet 1 — hype, under 280 chars, include ticker>",
    "<launch tweet 2 — community focused, under 280 chars>",
    "<launch tweet 3 — meme/funny angle, under 280 chars>"
  ],
  "logo_prompt": "<detailed image generation prompt for the token logo, describe style/colors/subject>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"]
}`

    const response = await openrouter.chat.completions.create({
      model:       MODELS.generation,
      max_tokens:  800,
      temperature: 0.85,
      messages:    [{ role: 'user', content: prompt }],
    })

    const raw   = response.choices[0]?.message?.content || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()

    try {
      return JSON.parse(clean)
    } catch {
      // Fallback if JSON is malformed
      return {
        name:         'MoonToken',
        ticker:       'MOON',
        lore:         `Born from the depths of the internet, ${context} became a movement.`,
        twitter_bio:  `The official token of ${context}. To the moon. 🚀`,
        tg_bio:       `Welcome to the ${context} community. DYOR. NFA.`,
        first_tweets: [
          `$MOON is live. The ${context} era has begun. 🌕`,
          `Community > everything. $MOON holders are early.`,
          `Wen moon? Now. $MOON 🚀`,
        ],
        logo_prompt:  `Minimalist crypto logo for a token called MOON, dark background, silver moon, neon glow`,
        tags:         ['memecoin', 'community', 'viral'],
      }
    }
  })
}

// ── Batch grade narratives ────────────────────────────────────────────────────
// Used by cron — grades multiple narratives concurrently (respects p-limit cap)

async function batchGradeNarratives(narratives, supabase) {
  const results = await Promise.allSettled(
    narratives.map(n => gradeNarrative(n, supabase))
  )
  return results.map((r, i) => ({
    narrativeId: narratives[i].id,
    ...(r.status === 'fulfilled' ? r.value : { grade: 5, error: r.reason?.message }),
  }))
}

module.exports = {
  gradeNarrative,
  generateTokenDetails,
  batchGradeNarratives,
  MODELS,
}