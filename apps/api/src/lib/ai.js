// apps/api/src/lib/ai.js

const axios = require('axios')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY   = process.env.GROQ_API_KEY

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
    },
    { timeout: 20000 }
  )
  return res.data.candidates[0].content.parts[0].text
}

// ── Groq ──────────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens:  1024,
    },
    {
      headers:  { Authorization: `Bearer ${GROQ_API_KEY}` },
      timeout:  20000,
    }
  )
  return res.data.choices[0].message.content
}

// ── Unified call: Gemini first, Groq fallback, retry on rate limit ────────────
async function callAI(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        return await callGemini(prompt)
      } catch (err) {
        const status = err.response?.status
        if (status === 429) {
          // Rate limited — wait and try Groq
          console.warn(`[AI] Gemini rate limited, trying Groq...`)
          await sleep(1000 * (attempt + 1))
        } else {
          console.warn('[AI] Gemini failed:', err.message?.slice(0, 60))
        }
      }
    }

    // Try Groq
    if (GROQ_API_KEY) {
      try {
        return await callGroq(prompt)
      } catch (err) {
        const status = err.response?.status
        if (status === 429) {
          const waitMs = 2000 * Math.pow(2, attempt) // 2s, 4s, 8s
          console.warn(`[AI] Groq rate limited, waiting ${waitMs}ms...`)
          await sleep(waitMs)
        } else {
          console.warn('[AI] Groq failed:', err.message?.slice(0, 60))
        }
      }
    }

    if (attempt < retries - 1) {
      await sleep(1500 * (attempt + 1))
    }
  }

  throw new Error('AI unavailable after retries')
}

// ── Parse JSON safely ─────────────────────────────────────────────────────────
function parseAIJson(raw) {
  if (!raw) return null
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    // Try to extract JSON object from response
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch {}
    }
    return null
  }
}

// callAIWithRetry — for user-triggered requests, waits longer between retries
async function callAIWithRetry(prompt, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAI(prompt)
    } catch (err) {
      if (i === maxRetries - 1) throw err
      const wait = 3000 * (i + 1) // 3s, 6s, 9s, 12s
      console.warn(`[AI] Retry ${i + 1}/${maxRetries} in ${wait}ms...`)
      await sleep(wait)
    }
  }
}

module.exports = { callAI, callAIWithRetry, parseAIJson }
