// apps/api/src/routes/whitepaper.js

const { Router } = require('express')
const { callAI, parseAIJson } = require('../lib/ai')
const { supabase } = require('../lib/supabase')

const whitepaperRouter = Router()

// ── AI content generation ─────────────────────────────────────────────────────
async function generateContent({ name, ticker, chain, description, total_supply, narrative }) {
  const prompt = `
You are a crypto copywriter. Write a professional litepaper for a memecoin.

Token: ${name} ($${ticker})
Chain: ${chain || 'BSC'}
Total Supply: ${Number(total_supply || 1000000000).toLocaleString()}
Narrative: ${narrative || 'memecoin'}
Description: ${description || ''}

CRITICAL: Return ONLY valid JSON with NO duplicate keys. Each key must appear exactly once.
Use arrays for multi-paragraph sections.

{
  "tagline": "one line under 12 words",
  "abstract": ["paragraph one", "paragraph two"],
  "problem": ["paragraph one", "paragraph two"],
  "solution": ["paragraph one", "paragraph two", "paragraph three"],
  "tokenomics_overview": ["paragraph one", "paragraph two"],
  "total_supply_label": "${Number(total_supply || 1000000000).toLocaleString()} ${ticker}",
  "distribution": [
    { "label": "Public / Liquidity Pool", "percentage": 80 },
    { "label": "Marketing & Partnerships", "percentage": 10 },
    { "label": "Development Fund", "percentage": 5 },
    { "label": "Community Rewards", "percentage": 5 }
  ],
  "roadmap": [
    { "phase": "Phase 1", "title": "Launch", "items": ["item1", "item2", "item3"] },
    { "phase": "Phase 2", "title": "Growth", "items": ["item1", "item2", "item3"] },
    { "phase": "Phase 3", "title": "Expansion", "items": ["item1", "item2", "item3"] }
  ],
  "community": ["paragraph one", "paragraph two"],
  "disclaimer": "standard crypto disclaimer in one paragraph"
}

Respond ONLY with the JSON object. No markdown. No code fences. No duplicate keys.
`
  const raw = await callAI(prompt)
  return parseAIJson(raw)
}

// ── HTML to PDF via html-pdf-node ─────────────────────────────────────────────
function buildHTML(data, meta) {
  const { name, ticker, chain } = meta
  const joinParas = (arr) => Array.isArray(arr)
    ? arr.map(p => `<p>${p}</p>`).join('')
    : `<p>${arr || ''}</p>`

  const distBars = (data.distribution || []).map(d => `
    <div class="dist-row">
      <span class="dist-label">${d.label}</span>
      <div class="dist-bar-bg">
        <div class="dist-bar-fill" style="width:${d.percentage}%"></div>
      </div>
      <span class="dist-pct">${d.percentage}%</span>
    </div>
  `).join('')

  const roadmapCards = (data.roadmap || []).map(p => `
    <div class="roadmap-card">
      <div class="phase-label">${p.phase}</div>
      <div class="phase-title">${p.title}</div>
      <ul>
        ${(p.items || []).map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0A0A0F;
    color: #F9FAFB;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.7;
  }
  .page { max-width: 800px; margin: 0 auto; padding: 60px 60px 80px; }

  /* Cover */
  .cover {
    text-align: center;
    padding: 80px 0 60px;
    border-bottom: 1px solid #1E1E2E;
    margin-bottom: 48px;
  }
  .cover .type-label {
    font-size: 9px; letter-spacing: 4px; color: #4B5563;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .cover h1 { font-size: 36px; font-weight: 900; color: #F9FAFB; letter-spacing: -1px; margin-bottom: 8px; }
  .cover .ticker-line { font-size: 18px; font-weight: 700; color: #00FF88; margin-bottom: 16px; }
  .cover .tagline { font-size: 12px; color: #6B7280; font-style: italic; margin-bottom: 32px; }
  .cover-meta { display: flex; justify-content: center; gap: 48px; }
  .cover-meta .meta-item .meta-label { font-size: 8px; letter-spacing: 2px; color: #4B5563; text-transform: uppercase; margin-bottom: 4px; }
  .cover-meta .meta-item .meta-value { font-size: 12px; font-weight: 700; color: #F9FAFB; }

  /* Sections */
  .section { margin-bottom: 40px; }
  .section-title {
    font-size: 9px; font-weight: 700; letter-spacing: 3px;
    color: #00FF88; text-transform: uppercase;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(0,255,136,0.2);
    margin-bottom: 16px;
  }
  .section p { color: #9CA3AF; margin-bottom: 12px; }

  /* Distribution bars */
  .dist-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .dist-label { width: 180px; font-size: 10px; color: #9CA3AF; flex-shrink: 0; }
  .dist-bar-bg { flex: 1; height: 6px; background: #1E1E2E; border-radius: 3px; overflow: hidden; }
  .dist-bar-fill { height: 100%; background: #00FF88; border-radius: 3px; }
  .dist-pct { width: 36px; text-align: right; font-size: 10px; font-weight: 700; color: #00FF88; }

  /* Roadmap */
  .roadmap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .roadmap-card {
    background: #0E0E16; border: 1px solid #1E1E2E;
    border-radius: 8px; padding: 16px;
  }
  .phase-label { font-size: 8px; font-weight: 700; letter-spacing: 2px; color: #00FF88; text-transform: uppercase; margin-bottom: 4px; }
  .phase-title { font-size: 13px; font-weight: 700; color: #F9FAFB; margin-bottom: 12px; }
  .roadmap-card ul { padding-left: 0; list-style: none; }
  .roadmap-card li { font-size: 10px; color: #6B7280; padding: 4px 0; border-bottom: 1px solid #0A0A0F; }
  .roadmap-card li::before { content: "— "; color: #00FF88; }

  /* Supply stat */
  .supply-stat { background: #0E0E16; border: 1px solid #1E1E2E; border-radius: 8px; padding: 14px 20px; margin-bottom: 20px; display: inline-block; }
  .supply-stat .s-label { font-size: 8px; letter-spacing: 2px; color: #4B5563; text-transform: uppercase; margin-bottom: 4px; }
  .supply-stat .s-value { font-size: 14px; font-weight: 700; color: #F9FAFB; }

  /* Footer */
  .doc-footer {
    margin-top: 60px; padding-top: 20px;
    border-top: 1px solid #1E1E2E;
    font-size: 9px; color: #374151;
  }
  .disclaimer-text { color: #4B5563; margin-bottom: 12px; }

  /* Grid texture background */
  body::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,255,136,0.012) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,136,0.012) 1px, transparent 1px);
    background-size: 40px 40px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div class="type-label">Litepaper</div>
    <h1>${name}</h1>
    <div class="ticker-line">$${ticker}</div>
    <div class="tagline">"${data.tagline || ''}"</div>
    <div class="cover-meta">
      <div class="meta-item">
        <div class="meta-label">Chain</div>
        <div class="meta-value">${chain}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Supply</div>
        <div class="meta-value">${data.total_supply_label || ''}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Version</div>
        <div class="meta-value">1.0</div>
      </div>
    </div>
  </div>

  <!-- Abstract -->
  <div class="section">
    <div class="section-title">Abstract</div>
    ${joinParas(data.abstract)}
  </div>

  <!-- Problem -->
  <div class="section">
    <div class="section-title">The Problem</div>
    ${joinParas(data.problem)}
  </div>

  <!-- Solution -->
  <div class="section">
    <div class="section-title">The Solution</div>
    ${joinParas(data.solution)}
  </div>

  <!-- Tokenomics -->
  <div class="section">
    <div class="section-title">Tokenomics</div>
    ${joinParas(data.tokenomics_overview)}
    <div class="supply-stat">
      <div class="s-label">Total Supply</div>
      <div class="s-value">${data.total_supply_label || ''}</div>
    </div>
    <div>${distBars}</div>
  </div>

  <!-- Roadmap -->
  <div class="section">
    <div class="section-title">Roadmap</div>
    <div class="roadmap-grid">${roadmapCards}</div>
  </div>

  <!-- Community -->
  <div class="section">
    <div class="section-title">Community</div>
    ${joinParas(data.community)}
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <p class="disclaimer-text"><strong>Disclaimer:</strong> ${data.disclaimer || ''}</p>
    <p>Generated by 1launch · ${new Date().toLocaleDateString()}</p>
  </div>

</div>
</body>
</html>`
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/whitepaper/:tokenId/download — stream PDF
whitepaperRouter.get('/:tokenId/download', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whitepapers')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'No whitepaper found. Generate one first.' })
    }

    const content = data.content
    const html = buildHTML(content, {
      name: content.meta?.name || 'Token',
      ticker: content.meta?.ticker || 'TOKEN',
      chain: content.meta?.chain || 'BSC',
    })

    // Use html-pdf-node to render PDF
    const htmlPdf = require('html-pdf-node')
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    }
    const file = { content: html }
    const pdfBuffer = await htmlPdf.generatePdf(file, options)

    const filename = `${content.meta?.name || 'token'}_litepaper.pdf`
      .replace(/[^a-zA-Z0-9_\-.]/g, '_')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(pdfBuffer)
  } catch (err) {
    console.error('[GET /whitepaper/download]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/whitepaper/generate
whitepaperRouter.post('/generate', async (req, res) => {
  try {
    const { token_id, name, ticker, chain, description, total_supply, narrative } = req.body

    if (!name || !ticker) {
      return res.status(400).json({ success: false, error: 'name and ticker required' })
    }

    const parsed = await generateContent({ name, ticker, chain, description, total_supply, narrative })

    if (!parsed) {
      return res.status(500).json({ success: false, error: 'AI failed to generate whitepaper content' })
    }

    const whitepaper = {
      ...parsed,
      meta: {
        name, ticker,
        chain: chain || 'BSC',
        total_supply: Number(total_supply || 1000000000).toLocaleString(),
        generated_at: new Date().toISOString(),
      }
    }

    if (token_id) {
      try {
        await supabase
          .from('whitepapers')
          .upsert({ token_id, content: whitepaper, generated_at: new Date().toISOString() })
      } catch {}
    }

    res.json({ success: true, data: whitepaper })
  } catch (err) {
    console.error('[POST /whitepaper/generate]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/whitepaper/:tokenId
whitepaperRouter.get('/:tokenId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whitepapers')
      .select('*')
      .eq('token_id', req.params.tokenId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return res.json({ success: true, data: null })
    res.json({ success: true, data: data.content })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { whitepaperRouter }
