const { Router } = require('express')
const { supabase } = require('../lib/supabase')

const narrativeRouter = Router()

// GET /api/narratives — get all active narratives sorted by hype score
narrativeRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('narratives')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('hype_score', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('[GET /narratives]', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/narratives/:id
narrativeRouter.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('narratives')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ success: false, error: 'Not found' })

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = { narrativeRouter }
