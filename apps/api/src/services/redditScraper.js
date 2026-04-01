// apps/api/src/services/redditScraper.js
// Tracks culture, news, sports, entertainment — NOT crypto subs

const axios = require('axios')

const SUBREDDITS = [
  // World events & news
  'worldnews', 'news', 'politics', 'USnews',
  // Tech & viral
  'technology', 'Futurology', 'artificial',
  // Culture & entertainment
  'entertainment', 'popculturechat', 'celebrity',
  // Sports moments
  'sports', 'nba', 'soccer', 'nfl',
  // Viral & memes
  'all', 'nottheonion', 'Unexpected', 'MadeMeSmile',
  // Trending slang & culture
  'OutOfTheLoop', 'TrueOffMyChest', 'AITA',
]

async function fetchSubredditHot(subreddit, limit = 20) {
  try {
    const res = await axios.get(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: { 'User-Agent': '1launch-narrative-bot/1.0' },
        timeout: 8000,
      }
    )
    return res.data.data.children
      .map(post => ({
        title:       post.data.title,
        score:       post.data.score,
        comments:    post.data.num_comments,
        ratio:       post.data.upvote_ratio,
        created_utc: post.data.created_utc,
        subreddit,
        url:         `https://reddit.com${post.data.permalink}`,
      }))
      .filter(p => p.score > 500) // only meaningful posts
  } catch (err) {
    console.warn(`[Reddit] r/${subreddit} failed:`, err.message)
    return []
  }
}

async function scrapeReddit() {
  const results = await Promise.all(
    SUBREDDITS.map(sub => fetchSubredditHot(sub))
  )

  const flat = results.flat()
  const seen = new Set()

  return flat
    .filter(p => {
      if (seen.has(p.title)) return false
      seen.add(p.title)
      return true
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)
    .map(post => ({
      text:   post.title,
      score:  post.score,
      source: 'reddit',
      meta:   { subreddit: post.subreddit, comments: post.comments, ratio: post.ratio },
    }))
}

module.exports = { scrapeReddit }
