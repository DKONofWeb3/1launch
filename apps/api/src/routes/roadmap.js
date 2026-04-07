// apps/api/src/routes/roadmap.js

const { Router } = require('express')
const { callAI, parseAIJson } = require('../lib/ai')
const { supabase } = require('../lib/supabase')

const roadmapRouter = Router()

async function generateRoadmap({ name, ticker, chain, narrative, description }) {
  const prompt = `
You are a memecoin launch strategist. Generate a detailed 30-day post-launch action plan.

Token: ${name} ($${ticker})
Chain: ${chain || 'BSC'}
Narrative: ${narrative || 'memecoin'}
Description: ${description || ''}

Create a realistic, actionable 30-day plan. Respond ONLY with valid JSON, no markdown, no code fences:

{
  "overview": "2-3 sentence summary of the post-launch strategy",
  "weeks": [
    {
      "week": 1,
      "title": "short title for this week",
      "focus": "one sentence describing the week's main objective",
      "tasks": [
        {
          "day": "Day 1-2",
          "category": "one of: community | marketing | trading | technical | listings",
          "task": "specific actionable task",
          "detail": "brief explanation of how to execute this"
        }
      ]
    }
  ],
  "milestones": [
    { "day": 7,  "milestone": "first milestone to hit by day 7"  },
    { "day": 14, "milestone": "second milestone by day 14" },
    { "day": 30, "milestone": "main goal by day 30" }
  ],
  "kpis": [
    { "metric": "metric name", "target": "specific target value", "how": "how to measure it" }
  ]
}

Rules:
- 4 weeks, each with 3-5 tasks
- Tasks should be specific and actionable, not vague
- Mix community building, marketing, trading activity, and listing goals
- Milestones should be measurable
- Include 4-5 KPIs
- Respond ONLY with the JSON object
`
  const raw = await callAI(prompt)
  return parseAIJson(raw)
}

// POST /api/roadmap/generate
roadmapRouter.post('/generate', async (req, res) => {
  try {
    const { token_id, name, ticker, chain, description, narrative } = req.body

    if (!name || !ticker) {
      return res.status(400).json({ success: false, error: 'name and ticker required' })
    }

    const parsed = await generateRoadmap({ name, ticker, chain, description, narrative })
    if (!parsed) {
      return res.status(503).json({ success: false, error: 'AI is rate limited. Try again in 1 minute.' })
    }

    const roadmap = {
      ...parsed,
      meta: { name, ticker, chain: chain || 'BSC', generated_at: new Date().toISOString() }
    }

    if (token_id) {
      try {
        await supabase
          .from('roadmaps')
          .upsert({ token_id, content: roadmap, generated_at: new Date().toISOString() })
      } catch {}
    }

    res.json({ success: true, data: roadmap })
  } catch (err) {
    console.error('[POST /roadmap/generate]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/roadmap/:tokenId
roadmapRouter.get('/:tokenId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return res.json({ success: true, data: null })
    res.json({ success: true, data: data.content })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { roadmapRouter }