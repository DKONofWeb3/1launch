// apps/api/src/config/plans.js

const PLANS = {
  free: {
    id:           'free',
    name:         'Free',
    price_usd:    0,
    color:        '#6B7280',
    launches:     1,
    features: {
      launches:          1,
      audit_scan:        true,
      checklist:         true,
      meme_kit:          false, // $9 add-on
      telegram_setup:    true,
      roadmap:           false, // $19 add-on
      whitepaper:        false, // $29 add-on
      lp_lock_basic:     false, // $19 add-on
      sniper_tracker:    false,
      whale_monitor:     false,
      analytics:         false,
      copycat_tracker:   false,
      timing_engine:     true,  // free lead magnet
      volume_bot:        false,
      kol_marketplace:   false,
      bubblemaps:        true,
    },
  },
  builder: {
    id:           'builder',
    name:         'Builder',
    price_usd:    49,
    color:        '#3B82F6',
    launches:     5,
    features: {
      launches:          5,
      audit_scan:        true,
      checklist:         true,
      meme_kit:          true,
      telegram_setup:    true,
      roadmap:           true,
      whitepaper:        false, // $29 add-on
      lp_lock_basic:     true,
      sniper_tracker:    false, // $14/mo add-on
      whale_monitor:     false,
      analytics:         true,
      copycat_tracker:   false, // $14/mo add-on
      timing_engine:     true,
      volume_bot:        false, // vol bot is separate
      kol_marketplace:   true,
      bubblemaps:        true,
    },
  },
  pro: {
    id:           'pro',
    name:         'Pro',
    price_usd:    149,
    color:        '#00FF88',
    launches:     -1, // unlimited
    features: {
      launches:          -1,
      audit_scan:        true,
      checklist:         true,
      meme_kit:          true,
      telegram_setup:    true,
      roadmap:           true,
      whitepaper:        true,
      lp_lock_basic:     true,
      sniper_tracker:    true,
      whale_monitor:     true,
      analytics:         true,
      copycat_tracker:   true,
      timing_engine:     true,
      volume_bot:        'starter', // starter tier included
      kol_marketplace:   true,
      bubblemaps:        true,
    },
  },
  agency: {
    id:           'agency',
    name:         'Agency',
    price_usd:    499,
    color:        '#FF9500',
    launches:     -1,
    features: {
      launches:          -1,
      audit_scan:        true,
      checklist:         true,
      meme_kit:          true,
      telegram_setup:    true,
      roadmap:           true,
      whitepaper:        true,
      lp_lock_basic:     true,
      sniper_tracker:    true,
      whale_monitor:     true,
      analytics:         true,
      copycat_tracker:   true,
      timing_engine:     true,
      volume_bot:        'growth', // growth tier included
      kol_marketplace:   true,
      bubblemaps:        true,
      white_label:       true,
      priority_support:  true,
    },
  },
}

// ── Add-on pricing (one-time or monthly) ──────────────────────────────────────
const ADDONS = {
  deploy_bsc:          { price: 9,   type: 'one_time', label: 'BSC Token Deploy' },
  deploy_solana:       { price: 6,   type: 'one_time', label: 'Solana Token Deploy' },
  extra_launch:        { price: 15,  type: 'one_time', label: 'Extra Token Launch' },
  meme_kit:            { price: 9,   type: 'one_time', label: 'Meme Kit Generator' },
  roadmap:             { price: 19,  type: 'one_time', label: 'Post-Launch Roadmap' },
  whitepaper_basic:    { price: 29,  type: 'one_time', label: 'Whitepaper (Basic PDF)' },
  whitepaper_premium:  { price: 99,  type: 'one_time', label: 'Whitepaper (Premium DOCX)' },
  whitepaper_full:     { price: 199, type: 'one_time', label: 'Whitepaper + Pitch Deck' },
  lp_lock_basic:       { price: 19,  type: 'one_time', label: 'LP Lock (Basic)' },
  lp_lock_unicrypt:    { price: 49,  type: 'one_time', label: 'LP Lock (Unicrypt)' },
  sniper_tracker:      { price: 14,  type: 'monthly',  label: 'Sniper Tracker' },
  whale_monitor:       { price: 14,  type: 'monthly',  label: 'Whale Monitor' },
  copycat_tracker:     { price: 14,  type: 'monthly',  label: 'Copycat Tracker + TG Alerts' },
  renounce_contract:   { price: 19,  type: 'one_time', label: 'Renounce Contract' },
  vol_bot_starter:     { price: 29,  type: 'monthly',  label: 'Volume Bot (Starter)' },
  vol_bot_growth:      { price: 99,  type: 'monthly',  label: 'Volume Bot (Growth)' },
  vol_bot_pro:         { price: 299, type: 'monthly',  label: 'Volume Bot (Pro)' },
  dex_trending_basic:  { price: 399, type: 'one_time', label: 'DexScreener Trending (Basic)' },
  dex_trending_pro:    { price: 999, type: 'one_time', label: 'DexScreener Trending (Premium)' },
  multi_screener:      { price: 2499, type: 'one_time', label: 'Multi-Screener Trending' },
  coingecko_cmc:       { price: 149, type: 'one_time', label: 'CoinGecko/CMC Submission' },
  meme_sites:          { price: 79,  type: 'one_time', label: 'Meme Site Listings (5 sites)' },
  tg_trending:         { price: 299, type: 'one_time', label: 'Paid TG Trending' },
  timing_analysis:     { price: 0,   type: 'one_time', label: 'Launch Timing Analysis' }, // free
}

// ── Accepted payment tokens ───────────────────────────────────────────────────
const PAYMENT_TOKENS = {
  bsc: {
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      symbol: 'USDT',
    },
    BUSD: {
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
      symbol: 'BUSD',
    },
    BNB: {
      address: 'native',
      decimals: 18,
      symbol: 'BNB',
    },
  },
  solana: {
    USDC: {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      symbol: 'USDC',
    },
    SOL: {
      mint: 'native',
      decimals: 9,
      symbol: 'SOL',
    },
  },
}

module.exports = { PLANS, ADDONS, PAYMENT_TOKENS }
