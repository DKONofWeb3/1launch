// apps/api/src/services/rssScraper.js

const axios = require('axios')

function parseRSS(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const item  = match[1]
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   item.match(/<title>(.*?)<\/title>/))?.[1]?.replace(/<[^>]+>/g, '').trim()
    const link  = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim()
    if (title && title.length > 10) items.push({ title, link })
  }
  return items
}

// Google News RSS — served from Google's global CDN, works everywhere
// Format: https://news.google.com/rss/search?q=TOPIC&hl=en-US&gl=US&ceid=US:en
// Category feeds are most reliable
const RSS_FEEDS = [
  // ── Google News category feeds (global CDN, always works) ────────────────
  { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',                           category: 'news',          source: 'Google News Top' },
  { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US',        category: 'news',          source: 'Google News World' },
  { url: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US',       category: 'politics',      source: 'Google News US' },
  { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US',   category: 'tech',          source: 'Google News Tech' },
  { url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US',       category: 'sports',        source: 'Google News Sports' },
  { url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US',category: 'entertainment',  source: 'Google News Entertainment' },
  { url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US',     category: 'finance',       source: 'Google News Business' },
  { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US',      category: 'science',       source: 'Google News Science' },
  { url: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US',       category: 'health',        source: 'Google News Health' },

  // ── Proven-working feeds from last run ───────────────────────────────────
  { url: 'https://feeds.npr.org/1001/rss.xml',                                  category: 'news',          source: 'NPR'              },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',           category: 'news',          source: 'NY Times'         },
  { url: 'https://www.theguardian.com/world/rss',                               category: 'news',          source: 'The Guardian'     },
  { url: 'http://rss.cnn.com/rss/edition.rss',                                  category: 'news',          source: 'CNN'              },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                           category: 'news',          source: 'Al Jazeera'       },
  { url: 'https://rss.politico.com/politics-news.xml',                          category: 'politics',      source: 'Politico'         },
  { url: 'https://techcrunch.com/feed/',                                        category: 'tech',          source: 'TechCrunch'       },
  { url: 'https://www.theverge.com/rss/index.xml',                              category: 'tech',          source: 'The Verge'        },
  { url: 'https://hnrss.org/frontpage',                                         category: 'tech',          source: 'Hacker News'      },
  { url: 'https://www.producthunt.com/feed',                                    category: 'tech',          source: 'Product Hunt'     },
  { url: 'https://www.espn.com/espn/rss/news',                                  category: 'sports',        source: 'ESPN'             },
]

async function fetchFeed(feed) {
  try {
    const res = await axios.get(feed.url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/rss+xml, application/xml, text/xml, */*',
      },
      maxRedirects: 5,
    })
    const items = parseRSS(res.data)
    return items.slice(0, 15).map(item => ({
      text:   item.title,
      score:  100,
      source: 'rss',
      meta:   { source_name: feed.source, category: feed.category, link: item.link },
    }))
  } catch (err) {
    console.warn(`[RSS] ${feed.source} failed: ${err.message?.slice(0, 50)}`)
    return []
  }
}

async function scrapeRSS() {
  const results = await Promise.allSettled(RSS_FEEDS.map(feed => fetchFeed(feed)))
  const items   = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
  const seen    = new Set()
  const deduped = items.filter(item => {
    const key = item.text.toLowerCase().slice(0, 60)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  console.log(`[RSS] Collected ${deduped.length} items from ${RSS_FEEDS.length} feeds`)
  return deduped
}

module.exports = { scrapeRSS }
