// apps/api/src/routes/memekit.js

const { Router } = require('express')
const { callAIWithRetry, parseAIJson } = require('../lib/ai')
const { supabase } = require('../lib/supabase')

const memekitRouter = Router()

// POST /api/memekit/generate
// Body: { token_id, name, ticker, narrative, description }
memekitRouter.post('/generate', async (req, res) => {
  try {
    const { token_id, name, ticker, narrative, description } = req.body

    if (!name || !ticker) {
      return res.status(400).json({ success: false, error: 'name and ticker required' })
    }

    const prompt = `
You are a memecoin marketing expert. Generate 5 viral meme concepts for this token.

Token: ${name} ($${ticker})
Narrative: ${narrative || 'crypto memecoin'}
Description: ${description || ''}

Each meme should be shareable, funny, and drive FOMO or community pride.
Respond ONLY with valid JSON, no markdown, no explanation:

{
  "memes": [
    {
      "title": "short meme title",
      "caption": "the actual text/caption that goes on or under the meme (punchy, under 20 words)",
      "concept": "describe what the image should look like (for image generation)",
      "image_prompt": "detailed prompt for AI image generation: cartoon style, white background, funny, memeable, crypto theme, ${name}, $${ticker}",
      "type": "one of: wojak | pepe_style | chad | stonks | distracted | drake | custom"
    }
  ]
}

Rules:
- Captions must be punchy and shareable
- Image prompts must be detailed enough to generate a clear image
- Mix different meme formats
- Keep it degen but not offensive
- Respond ONLY with the JSON object
`

    const raw = await callAIWithRetry(prompt)
    const parsed = parseAIJson(raw)

    if (!parsed?.memes) {
      return res.status(500).json({ success: false, error: 'AI failed to generate meme concepts' })
    }

    // Generate image URLs via Pollinations.ai for each meme
    const memesWithImages = parsed.memes.map((meme, i) => ({
      ...meme,
      id: `meme_${i + 1}`,
      image_url: `https://image.pollinations.ai/prompt/${encodeURIComponent(meme.image_prompt)}?width=512&height=512&nologo=true&seed=${Date.now() + i}`,
    }))

    // Save to DB if token_id provided
    if (token_id) {
      await supabase
        .from('meme_kits')
        .upsert({
          token_id,
          memes: memesWithImages,
          generated_at: new Date().toISOString(),
        })
        .catch(() => {}) // non-blocking
    }

    res.json({ success: true, data: { memes: memesWithImages } })
  } catch (err) {
    console.error('[POST /memekit/generate]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/memekit/:tokenId — get saved meme kit for a token
memekitRouter.get('/:tokenId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meme_kits')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return res.json({ success: true, data: null })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { memekitRouter }
