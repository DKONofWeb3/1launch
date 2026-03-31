// apps/api/src/routes/kols.js

const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const kolsRouter = Router()

// GET /api/kols — list all KOLs with filters
kolsRouter.get('/', async (req, res) => {
  try {
    const { chain, niche, sort = 'engagement_rate', order = 'desc' } = req.query

    let query = supabase
      .from('kols')
      .select('*')
      .eq('active', true)
      .order(sort, { ascending: order === 'asc' })

    const { data, error } = await query
    if (error) throw error

    // Filter by chain or niche if provided (JSONB array contains)
    let filtered = data || []
    if (chain && chain !== 'all') {
      filtered = filtered.filter(k => k.chain_focus?.includes(chain))
    }
    if (niche && niche !== 'all') {
      filtered = filtered.filter(k => k.niches?.includes(niche))
    }

    res.json({ success: true, data: filtered })
  } catch (err) {
    console.error('[GET /kols]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/kols/:id
kolsRouter.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !data) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/kols/:id/report
kolsRouter.post('/:id/report', async (req, res) => {
  try {
    const { reason } = req.body
    if (!reason) return res.status(400).json({ success: false, error: 'reason required' })

    const { error } = await supabase
      .from('kol_reports')
      .insert({
        kol_id: req.params.id,
        reason,
        created_at: new Date().toISOString(),
      })

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/kols/:id/rate
kolsRouter.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'rating must be 1-5' })
    }

    // Get current rating data
    const { data: kol } = await supabase
      .from('kols')
      .select('rating, rating_count')
      .eq('id', req.params.id)
      .single()

    if (!kol) return res.status(404).json({ success: false, error: 'KOL not found' })

    // Recalculate average
    const newCount = (kol.rating_count || 0) + 1
    const newRating = ((kol.rating || 0) * (kol.rating_count || 0) + rating) / newCount

    await supabase
      .from('kols')
      .update({ rating: Math.round(newRating * 10) / 10, rating_count: newCount })
      .eq('id', req.params.id)

    res.json({ success: true, data: { rating: newRating, rating_count: newCount } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/kols/:id/book — create a booking request
kolsRouter.post('/:id/book', async (req, res) => {
  try {
    const { token_id, service, message, budget } = req.body

    const { data, error } = await supabase
      .from('kol_bookings')
      .insert({
        kol_id:    req.params.id,
        token_id:  token_id || null,
        service:   service || null,
        message:   message || null,
        budget:    budget || null,
        status:    'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { kolsRouter }
