// apps/api/src/services/rssScraper.js
// Pulls real-world trending content from RSS feeds across all categories

const axios = require('axios')

// Parse RSS XML without any npm package — pure regex
function parseRSS(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title       = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         item.match(/<title>(.*?)<\/title>/))?.[1]?.trim()
    const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                         item.match(/<description>(.*?)<\/description>/))?.[1]
                          ?.replace(/<[^>]+>/g, '')
                          ?.trim()
                          ?.slice(0, 300)
    const pubDate     = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim()
    const link        = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ||
                        item.match(/<link[^>]*href="([^"]+)"/)?.[1]?.trim()

    if (title && title.length > 10) {
      items.push({ title, description, pubDate, link })
    }
  }

  return items
}

const RSS_FEEDS = [
  // ── Breaking news ─────────────────────────────────────────────────────────
  { url: 'http://feeds.bbci.co.uk/news/rss.xml',                   category: 'news',          source: 'BBC News'       },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', category: 'news',        source: 'NY Times'       },
  { url: 'https://feeds.npr.org/1001/rss.xml',                      category: 'news',          source: 'NPR'            },
  { url: 'https://www.theguardian.com/world/rss',                   category: 'news',          source: 'The Guardian'   },

  // ── Politics & world events ───────────────────────────────────────────────
  { url: 'https://rss.politico.com/politics-news.xml',              category: 'politics',      source: 'Politico'       },
  { url: 'https://thehill.com/feed',                                 category: 'politics',      source: 'The Hill'       },

  // ── Tech ─────────────────────────────────────────────────────────────────
  { url: 'https://techcrunch.com/feed/',                             category: 'tech',          source: 'TechCrunch'     },
  { url: 'https://www.theverge.com/rss/index.xml',                  category: 'tech',          source: 'The Verge'      },
  { url: 'https://feeds.wired.com/wired/index',                     category: 'tech',          source: 'Wired'          },
  { url: 'https://www.producthunt.com/feed',                        category: 'tech',          source: 'Product Hunt'   },

  // ── Sports ────────────────────────────────────────────────────────────────
  { url: 'https://www.espn.com/espn/rss/news',                      category: 'sports',        source: 'ESPN'           },
  { url: 'https://www.skysports.com/rss/12040',                     category: 'sports',        source: 'Sky Sports'     },

  // ── Entertainment & celebrity ─────────────────────────────────────────────
  { url: 'https://www.tmz.com/rss.xml',                             category: 'entertainment', source: 'TMZ'            },
  { url: 'https://pagesix.com/feed/',                               category: 'entertainment', source: 'Page Six'       },
  { url: 'https://variety.com/feed/',                               category: 'entertainment', source: 'Variety'        },
  { url: 'https://deadline.com/feed/',                              category: 'entertainment', source: 'Deadline'       },

  // ── Finance & markets ─────────────────────────────────────────────────────
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/',   category: 'finance',       source: 'MarketWatch'    },
  { url: 'https://finance.yahoo.com/news/rssindex',                 category: 'finance',       source: 'Yahoo Finance'  },

  // ── Science & viral ───────────────────────────────────────────────────────
  { url: 'https://www.sciencedaily.com/rss/top.xml',                category: 'science',       source: 'ScienceDaily'   },
  { url: 'https://feeds.feedburner.com/TechCrunch',                 category: 'tech',          source: 'TechCrunch Alt' },
]

async function fetchFeed(feed) {
  try {
    const res = await axios.get(feed.url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 1launch-narrative-bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      maxRedirects: 3,
    })

    const items = parseRSS(res.data)

    return items.slice(0, 15).map(item => ({
      text:     item.title,
      detail:   item.description || '',
      score:    100, // RSS items are curated, treat as high signal
      source:   'rss',
      meta:     {
        source_name: feed.source,
        category:    feed.category,
        link:        item.link,
        pub_date:    item.pubDate,
      },
    }))
  } catch (err) {
    console.warn(`[RSS] ${feed.source} failed:`, err.message?.slice(0, 60))
    return []
  }
}

async function scrapeRSS() {
  // Fetch all feeds in parallel with a timeout to not block everything
  const results = await Promise.allSettled(
    RSS_FEEDS.map(feed => fetchFeed(feed))
  )

  const items = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Deduplicate by title similarity (simple: exact title match)
  const seen = new Set()
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
