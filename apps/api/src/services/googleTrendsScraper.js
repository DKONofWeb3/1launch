// apps/api/src/services/googleTrendsScraper.js
// Gets daily trending searches from Google Trends RSS

const axios = require('axios')

async function scrapeGoogleTrends(geo = 'US') {
  try {
    const res = await axios.get(
      `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/rss+xml, text/xml, */*',
        },
      }
    )

    const xml   = res.data
    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const block     = match[1]
      const title     = block.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<[^>]+>/g, '').trim()
      const traffic   = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1]?.trim()
      const newsTitle = block.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1]?.replace(/<[^>]+>/g, '').trim()

      if (!title) continue

      let trafficNum = 0
      if (traffic) {
        const t = traffic.replace(/[^0-9KMB.]/g, '')
        if (t.includes('B'))     trafficNum = parseFloat(t) * 1000000000
        else if (t.includes('M')) trafficNum = parseFloat(t) * 1000000
        else if (t.includes('K')) trafficNum = parseFloat(t) * 1000
        else                      trafficNum = parseInt(t) || 0
      }

      items.push({
        text:   newsTitle ? `${title} — ${newsTitle}` : title,
        score:  Math.min(100, Math.floor(trafficNum / 10000)),
        source: 'google_trends',
        meta:   { query: title, traffic, geo },
      })
    }

    console.log(`[GoogleTrends] ${items.length} trending searches for ${geo}`)
    return items.slice(0, 20)
  } catch (err) {
    console.warn('[GoogleTrends] Failed:', err.message)
    return []
  }
}

module.exports = { scrapeGoogleTrends }
