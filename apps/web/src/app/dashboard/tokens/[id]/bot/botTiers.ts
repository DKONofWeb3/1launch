// apps/web/src/app/dashboard/tokens/[id]/bot/botTiers.ts

export const BOT_TIERS = [
  {
    id:          'starter',
    name:        'Starter',
    price:       29,
    walletCount: 3,
    intervalMin: 2,
    intervalMax: 8,
    tradeMin:    10,
    tradeMax:    50,
  },
  {
    id:          'growth',
    name:        'Growth',
    price:       99,
    walletCount: 15,
    intervalMin: 1,
    intervalMax: 5,
    tradeMin:    20,
    tradeMax:    200,
  },
  {
    id:          'pro',
    name:        'Pro',
    price:       299,
    walletCount: 50,
    intervalMin: 0.5,
    intervalMax: 3,
    tradeMin:    50,
    tradeMax:    500,
  },
]
