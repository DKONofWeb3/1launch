// apps/api/src/services/redditScraper.js
// Culture, news, sports, entertainment — NOT crypto

const axios = require('axios')

const SUBREDDITS = [
  // World events & news
  'worldnews', 'news', 'politics', 'USnews', 'geopolitics',
  // Tech & viral
  'technology', 'Futurology', 'singularity',
  // Culture & entertainment
  'entertainment', 'popculturechat', 'Oscars',
  // Sports moments
  'sports', 'nba', 'soccer', 'nfl', 'tennis',
  // Viral moments — no private/restricted subs
  'nottheonion', 'Unexpected', 'MadeMeSmile', 'interestingasfuck',
  // Trending culture
  'OutOfTheLoop', 'NoStupidQuestions',
]

async function fetchSubredditHot(subreddit, limit = 20) {
  try {
    const res = await axios.get(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 1launch-narrative-bot/1.0' },
        timeout: 10000,
      }
    )

    return res.data.data.children
      .map(post => ({
        title:    post.data.title,
        score:    post.data.score,
        comments: post.data.num_comments,
        ratio:    post.data.upvote_ratio,
        subreddit,
      }))
      .filter(p => p.score > 300)
  } catch (err) {
    console.warn(`[Reddit] r/${subreddit} failed: ${err.message?.slice(0, 40)}`)
    return []
  }
}

async function scrapeReddit() {
  const results = await Promise.all(SUBREDDITS.map(sub => fetchSubredditHot(sub)))
  const flat    = results.flat()
  const seen    = new Set()

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
      meta:   { subreddit: post.subreddit, comments: post.comments },
    }))
}

module.exports = { scrapeReddit }
