// apps/api/src/lib/ai.js
//
// OpenRouter-backed AI service.
//
// Model tiering:
//   NARRATIVE (cron grading)  → google/gemini-flash-1.5   (high-volume, cheap)
//   LAUNCH (user generation)  → meta-llama/llama-3.1-8b-instruct (near-instant)
//
// callAI()         — auto-detects which model to use based on prompt content
// callAILaunch()   — always uses the launch model (called from generate.js)
// parseAIJson()    — unchanged, safe JSON extraction

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const MODEL_NARRATIVE = 'google/gemini-flash-1.5'
const MODEL_LAUNCH    = 'meta-llama/llama-3.1-8b-instruct'

// ── Concurrency limiter ───────────────────────────────────────────────────────
// Prevents simultaneous launch requests from timing out under load.
// Max 5 concurrent AI calls — queues the rest.

class ConcurrencyQueue {
  constructor(max = 5) {
    this.max     = max
    this.running = 0
    this.queue   = []
  }
  run(fn) {
    return new Promise((resolve, reject) => {
      const task = () => {
        this.running++
        Promise.resolve(fn())
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this.running--
            if (this.queue.length > 0) this.queue.shift()()
          })
      }
      if (this.running < this.max) task()
      else this.queue.push(task)
    })
  }
}

const queue = new ConcurrencyQueue(5)

// ── Core fetch ────────────────────────────────────────────────────────────────

async function openRouterCall({ model, prompt, temperature = 0.8, maxTokens = 1024 }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in environment')

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://1launchos.xyz',
      'X-Title':       '1launch',
    },
    body: JSON.stringify({
      model,
      messages:    [{ role: 'user', content: prompt }],
      temperature,
      max_tokens:  maxTokens,
      // JSON mode — OpenRouter passes this to models that support it
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 120)}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter returned empty content')
  return content
}

// ── Public API ────────────────────────────────────────────────────────────────

// callAI — used by narrativeScorer (cron) and anywhere that isn't user-triggered.
// Uses the narrative model (gemini-flash-1.5) — cheap, handles high volume.
async function callAI(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await openRouterCall({
        model:       MODEL_NARRATIVE,
        prompt,
        temperature: 0.7,
        maxTokens:   1024,
      })
    } catch (err) {
      console.warn(`[AI] callAI attempt ${attempt + 1} failed:`, err.message.slice(0, 80))
      if (attempt < retries - 1) await sleep(1500 * (attempt + 1))
    }
  }
  throw new Error('AI unavailable after retries')
}

// callAILaunch — used by generate.js for user-triggered token generation.
// Uses the launch model (llama-3.1-8b) — near-instant, queued for concurrency.
async function callAILaunch(prompt, retries = 3) {
  return queue.run(async () => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await openRouterCall({
          model:       MODEL_LAUNCH,
          prompt,
          temperature: 0.9,
          maxTokens:   900,
        })
      } catch (err) {
        console.warn(`[AI] callAILaunch attempt ${attempt + 1} failed:`, err.message.slice(0, 80))
        if (attempt < retries - 1) await sleep(1000 * (attempt + 1))
      }
    }
    throw new Error('Launch AI unavailable after retries')
  })
}

// callAIWithRetry — legacy alias, kept for backwards compatibility
async function callAIWithRetry(prompt, maxRetries = 3) {
  return callAI(prompt, maxRetries)
}

// ── Parse JSON safely ─────────────────────────────────────────────────────────

function parseAIJson(raw) {
  if (!raw) return null
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch {}
    }
    return null
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

module.exports = { callAI, callAILaunch, callAIWithRetry, parseAIJson }