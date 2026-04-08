const { Router } = require('express')
const { callAI, parseAIJson } = require('../lib/ai')
const { supabase } = require('../lib/supabase')

const generateRouter = Router()

// POST /api/generate/token
// Body: { narrative_id?, narrative_title, narrative_summary, chain }
generateRouter.post('/token', async (req, res) => {
  try {
    const { narrative_title, narrative_summary, chain = 'bsc' } = req.body

    if (!narrative_title) {
      return res.status(400).json({ success: false, error: 'narrative_title is required' })
    }

    const prompt = `
You are a memecoin launch strategist and creative director. Generate a complete token identity for a memecoin based on this trending narrative.

Narrative: "${narrative_title}"
Context: "${narrative_summary || ''}"
Chain: ${chain.toUpperCase()}

Generate a complete, creative, degen-style memecoin identity. Respond ONLY with a valid JSON object — no markdown, no explanation, no code fences.

{
  "name": "Full token name (2-4 words max, punchy, memeable)",
  "ticker": "Ticker symbol (2-6 uppercase letters, no $)",
  "description": "Token lore/description (2-3 sentences, hype-driven, community-focused, meme energy)",
  "logo_prompt": "A prompt for generating a logo image (describe the character/mascot/symbol clearly, cartoon style, white background)",
  "tg_bio": "Telegram group bio (1-2 sentences, degen tone, include ticker)",
  "twitter_bio": "Twitter/X bio (under 160 chars, punchy, include ticker and chain)",
  "first_tweets": [
    "Tweet 1 — announcement style, hype, under 240 chars",
    "Tweet 2 — community call to action, under 240 chars",
    "Tweet 3 — narrative hook, why this memecoin matters, under 240 chars",
    "Tweet 4 — FOMO tweet, under 240 chars",
    "Tweet 5 — based/degen tweet, under 240 chars"
  ],
  "suggested_angles": ["angle 1", "angle 2", "angle 3"],
  "launch_mechanism": "fair_launch",
  "total_supply": "1000000000",
  "tax_buy": 0,
  "tax_sell": 0
}

Rules:
- Name and ticker must be directly tied to the narrative
- Description should be exciting and memeable, not corporate
- Tweets should feel authentic to crypto Twitter culture
- No placeholder text — every field must be real, usable content
- Respond ONLY with the JSON object
`

    const raw = await callAI(prompt)
    const parsed = parseAIJson(raw)

    if (!parsed) {
      return res.status(500).json({ success: false, error: 'AI failed to generate valid token data' })
    }

    // Generate logo URL via Pollinations.ai (free, no key needed)
    const logoPrompt = encodeURIComponent(
      parsed.logo_prompt || `${parsed.name} memecoin logo cartoon mascot white background`
    )
    const logoUrl = `https://image.pollinations.ai/prompt/${logoPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`

    res.json({
      success: true,
      data: {
        ...parsed,
        logo_url: logoUrl,
        chain,
      },
    })
  } catch (err) {
    console.error('[POST /generate/token]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/generate/regenerate-field
// Regenerate a single field (name, ticker, description, tweets)
generateRouter.post('/regenerate-field', async (req, res) => {
  try {
    const { field, narrative_title, current_token } = req.body

    const fieldPrompts = {
      name: `Generate 5 alternative memecoin names for a coin based on the narrative "${narrative_title}". Current name: "${current_token?.name}". Respond ONLY with JSON: { "options": ["name1", "name2", "name3", "name4", "name5"] }`,
      ticker: `Generate 5 alternative ticker symbols for a memecoin called "${current_token?.name}" based on the narrative "${narrative_title}". Respond ONLY with JSON: { "options": ["TK1", "TK2", "TK3", "TK4", "TK5"] }`,
      description: `Write 3 alternative descriptions for a memecoin called "${current_token?.name}" (${current_token?.ticker}) based on the narrative "${narrative_title}". Degen, hype-driven, meme culture tone. Respond ONLY with JSON: { "options": ["desc1", "desc2", "desc3"] }`,
      tweets: `Write 5 fresh crypto Twitter posts for a memecoin called "${current_token?.name}" ($${current_token?.ticker}) based on the narrative "${narrative_title}". Authentic degen CT voice. Respond ONLY with JSON: { "options": ["tweet1", "tweet2", "tweet3", "tweet4", "tweet5"] }`,
    }

    const prompt = fieldPrompts[field]
    if (!prompt) return res.status(400).json({ success: false, error: 'Invalid field' })

    const raw = await callAI(prompt)
    const parsed = parseAIJson(raw)

    res.json({ success: true, data: parsed })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/generate/save-draft
generateRouter.post('/save-draft', async (req, res) => {
  try {
    const draft = req.body
    const wallet = draft.wallet_address?.toLowerCase() || null

    // Find or create user if wallet provided
    let userId = null
    if (wallet) {
      let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet)
        .maybeSingle()

      if (!user) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({ wallet_address: wallet, plan: 'free' })
          .select('id')
          .maybeSingle()
        user = newUser
      }
      userId = user?.id || null
    }

    console.log('[save-draft] userId:', userId, 'wallet:', wallet)

    const { data, error } = await supabase
      .from('token_drafts')
      .insert({
        user_id:          userId,
        narrative_id:     draft.narrative_id || null,
        name:             draft.name,
        ticker:           draft.ticker,
        description:      draft.description,
        logo_url:         draft.logo_url,
        chain:            draft.chain,
        total_supply:     draft.total_supply || '1000000000',
        tax_buy:          draft.tax_buy || 0,
        tax_sell:         draft.tax_sell || 0,
        launch_mechanism: draft.launch_mechanism || 'fair_launch',
        lp_lock:          draft.lp_lock ?? true,
        renounce:         draft.renounce ?? false,
        tg_bio:           draft.tg_bio || '',
        twitter_bio:      draft.twitter_bio || '',
        first_tweets:     draft.first_tweets || [],
        status:           'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[save-draft] insert error:', error.message, error.details, error.hint)
      throw error
    }
    console.log('[save-draft] saved with id:', data?.id)

    // Increment tokens_launched on the narrative
    if (userId && draft.narrative_id) {
      try {
        await supabase.rpc('increment_narrative_launches', {
          narrative_id: draft.narrative_id,
        })
      } catch {}
    }

    res.json({ success: true, data })
  } catch (err) {
    console.error('[save-draft] caught:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { generateRouter }
