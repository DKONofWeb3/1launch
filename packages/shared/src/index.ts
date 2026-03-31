// ─── User ────────────────────────────────────────────────────────────────────

export type Chain = 'solana' | 'bsc'

export interface User {
  id: string
  wallet_address: string
  chain: Chain
  plan: 'free' | 'builder' | 'pro' | 'agency'
  created_at: string
}

// ─── Narrative ────────────────────────────────────────────────────────────────

export type NarrativeSource = 'reddit' | 'google_trends' | 'tiktok' | 'dexscreener' | 'coingecko'

export interface Narrative {
  id: string
  title: string
  summary: string
  hype_score: number          // 0–100
  estimated_window: string    // e.g. "3–6 hrs"
  sources: NarrativeSource[]
  suggested_angles: string[]  // e.g. ["TARIFF", "TRUMP TAR"]
  suggested_tickers: string[] // e.g. ["TRMP", "DUTY"]
  tokens_launched: number
  created_at: string
  expires_at: string
}

// ─── Token Draft ──────────────────────────────────────────────────────────────

export interface TokenDraft {
  id: string
  user_id: string
  narrative_id: string | null

  name: string
  ticker: string
  description: string
  logo_url: string | null

  chain: Chain
  total_supply: string        // stored as string to avoid BigInt issues
  tax_buy: number             // percentage
  tax_sell: number

  launch_mechanism: 'fair_launch' | 'bonding_curve' | 'presale'
  lp_lock: boolean
  renounce: boolean

  // AI-generated social copy
  tg_bio: string
  twitter_bio: string
  first_tweets: string[]

  status: 'draft' | 'confirmed' | 'deploying' | 'live' | 'failed'
  created_at: string
}

// ─── Launched Token ───────────────────────────────────────────────────────────

export interface LaunchedToken {
  id: string
  user_id: string
  draft_id: string

  contract_address: string
  chain: Chain
  tx_hash: string

  // Live data (fetched from DexScreener)
  price_usd: number | null
  market_cap_usd: number | null
  volume_24h: number | null
  price_change_24h: number | null

  // Add-on flags
  audit_scan_done: boolean
  tg_setup_done: boolean
  volume_bot_tier: 'none' | 'starter' | 'growth' | 'pro'

  launched_at: string
}

// ─── Add-on ───────────────────────────────────────────────────────────────────

export type AddOnType =
  | 'volume_bot_starter'
  | 'volume_bot_growth'
  | 'volume_bot_pro'
  | 'audit_basic'
  | 'audit_full'
  | 'dex_boost'
  | 'dex_trending'
  | 'lp_lock_standard'
  | 'lp_lock_premium'
  | 'kol_micro'
  | 'kol_mid'
  | 'kol_premium'

export interface AddOn {
  id: string
  token_id: string
  type: AddOnType
  status: 'pending' | 'active' | 'expired'
  expires_at: string | null
  created_at: string
}

// ─── API Response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
