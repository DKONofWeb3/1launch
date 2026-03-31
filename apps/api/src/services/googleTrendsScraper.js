const axios = require('axios')

// Google Trends daily trending searches — no API key required
// Returns JSON of today's trending searches for a given geo
async function scrapeGoogleTrends(geo = 'US') {
  try {
   const res = await axios.get(
  `https://trends.google.com/trends/api/dailytrends?hl=en-US&geo=${geo}&tz=360`,
  { timeout: 10000 }
)

    // Google prepends ")]}',\n" to prevent JSON hijacking — strip it
    const raw = res.data.replace(")]}',\n", '')
    const parsed = JSON.parse(raw)

    const trendingSearches =
      parsed.default.trendingSearchesDays[0]?.trendingSearches || []

    return trendingSearches.map((item) => ({
      text: item.title.query,
      traffic: item.formattedTraffic, // e.g. "200K+"
      relatedQueries: item.relatedQueries?.map((q) => q.query) || [],
      source: 'google_trends',
      meta: { geo, traffic: item.formattedTraffic },
    }))
  } catch (err) {
    console.warn('[Google Trends] Fetch failed:', err.message)
    return []
  }
}

module.exports = { scrapeGoogleTrends }
