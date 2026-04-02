// apps/api/src/services/googleTrendsScraper.js
// Uses Google News search for trending topics — works globally

const axios = require('axios')

const TRENDING_SEARCHES = [
  'viral today',
  'breaking news',
  'trending now',
  'just happened',
]

async function scrapeGoogleTrends() {
  const results = []

  for (const query of TRENDING_SEARCHES) {
    try {
      const res = await axios.get(
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
        {
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept':     'application/rss+xml, text/xml, */*',
          },
        }
      )

      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      while ((match = itemRegex.exec(res.data)) !== null) {
        const block = match[1]
        const title = block.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim()
        if (title && title.length > 10) {
          results.push({
            text:   title,
            score:  70,
            source: 'google_trends',
            meta:   { query },
          })
        }
      }
    } catch (err) {
      console.warn(`[GoogleTrends] Query "${query}" failed: ${err.message?.slice(0, 40)}`)
    }
  }

  // Deduplicate
  const seen    = new Set()
  const deduped = results.filter(r => {
    const key = r.text.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  console.log(`[GoogleTrends] Got ${deduped.length} trending items via Google News search`)
  return deduped.slice(0, 30)
}

module.exports = { scrapeGoogleTrends }
