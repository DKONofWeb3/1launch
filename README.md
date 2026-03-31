# 1launch

> AI-powered memecoin launch platform. Narrative intelligence → token identity → live on-chain in under 5 minutes.

**Supported chains:** BSC · Solana (Base + ETH coming)

---

## Project Structure

```
1launch/
├── apps/
│   ├── web/          → Next.js frontend (port 3000)
│   └── api/          → Express API + cron jobs (port 4000)
└── packages/
    └── shared/       → Shared TypeScript types
```

---

## Setup Instructions

### 1. Clone and install
```cmd
git clone https://github.com/DKONofWeb3/1launch.git
cd 1launch
npm install
```

### 2. Supabase
1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
3. Go to **Settings → API** → copy your Project URL, anon key, and service role key

### 3. Environment variables
```cmd
copy apps\web\.env.example apps\web\.env.local
copy apps\api\.env.example apps\api\.env
```
Fill in both files with your keys.

**Free keys you need:**
- Supabase URL + keys → [supabase.com](https://supabase.com)
- Gemini API key → [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Groq API key → [console.groq.com](https://console.groq.com)
- WalletConnect Project ID → [cloud.walletconnect.com](https://cloud.walletconnect.com)

### 4. Run dev
```cmd
npm run dev
```
- Frontend: http://localhost:3000
- API: http://localhost:4000
- Health check: http://localhost:4000/health

---

## Build Phases

| Phase | What Gets Built | Status |
|-------|-----------------|--------|
| 0 | Foundation — monorepo, wallet auth, DB schema, API scaffold | ✅ Done |
| 1 | Narrative Engine — scrapers, hype scoring, AI enrichment, feed UI | 🔄 Next |
| 2 | AI Token Generator — name, ticker, logo, social copy | ⏳ |
| 3 | One-Click Launcher — BSC ERC-20 deploy, Solana SPL deploy | ⏳ |
| 4 | Social Auto-Setup + Add-Ons | ⏳ |
| 5 | Payments + Subscriptions + Landing Page | ⏳ |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js / Express |
| AI | Gemini 2.0 Flash + Groq Llama 3.3 (fallback) |
| Database | Supabase (PostgreSQL) |
| EVM Wallet Auth | RainbowKit + wagmi |
| Solana Wallet Auth | Solana Wallet Adapter |
| Image Gen | Pollinations.ai (free) |
| Hosting | Vercel (web) + Render (API) |
