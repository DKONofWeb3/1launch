// TikTok scraper using Playwright (headless Chromium)
// Scrapes trending hashtags from TikTok's explore page
// No API key needed — reads public page content

let playwright
try {
  playwright = require('playwright')
} catch {
  console.warn('[TikTok] Playwright not installed — TikTok scraping disabled')
}

async function scrapeTikTokTrending() {
  if (!playwright) return []

  let browser
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
    })

    const page = await context.newPage()

    // Block images/fonts to speed up load
    await page.route('**/*.{png,jpg,jpeg,gif,webp,woff,woff2}', (route) =>
      route.abort()
    )

    await page.goto('https://www.tiktok.com/explore', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    // Wait for hashtag elements to load
    await page.waitForSelector('[class*="HashTag"], [class*="challenge"], a[href*="/tag/"]', {
      timeout: 10000,
    }).catch(() => {})

    // Extract hashtag text and view counts
    const hashtags = await page.evaluate(() => {
      const tags = []

      // TikTok changes class names often — we look for links with /tag/ in the href
      const links = document.querySelectorAll('a[href*="/tag/"]')
      links.forEach((el) => {
        const text = el.textContent?.trim()
        if (text && text.startsWith('#')) {
          tags.push({
            text: text.replace('#', ''),
            href: el.href,
          })
        }
      })

      return tags.slice(0, 30)
    })

    return hashtags.map((tag) => ({
      text: tag.text,
      source: 'tiktok',
      meta: { url: tag.href },
    }))
  } catch (err) {
    console.warn('[TikTok] Scrape failed:', err.message)
    return []
  } finally {
    if (browser) await browser.close()
  }
}

module.exports = { scrapeTikTokTrending }
