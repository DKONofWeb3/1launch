const axios = require('axios')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

// ── Gemini (primary) ──────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
    }
  )
  return res.data.candidates[0].content.parts[0].text
}

// ── Groq (fallback) ───────────────────────────────────────────────────────────
async function callGroq(prompt) {
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1024,
    },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
  )
  return res.data.choices[0].message.content
}

// ── Unified call with fallback ────────────────────────────────────────────────
async function callAI(prompt) {
  for (let i = 0; i < 3; i++) {
    try {
      return await callGemini(prompt)
    } catch {
      try {
        return await callGroq(prompt)
      } catch {
        await new Promise(r => setTimeout(r, 4000 * (i + 1)))
      }
    }
  }
  throw new Error('AI unavailable after 3 retries')
}
// ── Parse JSON from AI response safely ───────────────────────────────────────
function parseAIJson(raw) {
  try {
    // Strip markdown code fences if present
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    console.error('[AI] Failed to parse JSON from response:', raw)
    return null
  }
}

module.exports = { callAI, parseAIJson }
