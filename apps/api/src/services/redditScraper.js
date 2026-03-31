const axios = require('axios')

const SUBREDDITS = [
  'CryptoCurrency',
  'memecoins',
  'SatoshiStreetBets',
  'solana',
  'BNBChain',
  'memecoin',
]

// Reddit's public JSON API — no auth needed for public subreddits
async function fetchSubredditHot(subreddit, limit = 25) {
  try {
    const res = await axios.get(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: {
          // Reddit requires a User-Agent or it 429s you
          'User-Agent': '1launch-narrative-bot/1.0',
        },
        timeout: 8000,
      }
    )
    return res.data.data.children.map((post) => ({
      title: post.data.title,
      score: post.data.score,
      upvote_ratio: post.data.upvote_ratio,
      num_comments: post.data.num_comments,
      created_utc: post.data.created_utc,
      subreddit,
    }))
  } catch (err) {
    console.warn(`[Reddit] Failed to fetch r/${subreddit}:`, err.message)
    return []
  }
}

// Pull from all subreddits in parallel
async function scrapeReddit() {
  const results = await Promise.all(
    SUBREDDITS.map((sub) => fetchSubredditHot(sub))
  )
  const flat = results.flat()

  // Sort by score descending, return top 40
  return flat
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((post) => ({
      text: post.title,
      score: post.score,
      source: 'reddit',
      meta: { subreddit: post.subreddit, upvote_ratio: post.upvote_ratio },
    }))
}

module.exports = { scrapeReddit }
