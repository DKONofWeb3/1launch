-- ============================================================
-- 1launch Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================


-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── Users ─────────────────────────────────────────────────────────────────────
create table if not exists users (
  id              uuid primary key default uuid_generate_v4(),
  wallet_address  text not null unique,
  chain           text not null default 'bsc' check (chain in ('bsc', 'solana')),
  plan            text not null default 'free' check (plan in ('free', 'builder', 'pro', 'agency')),
  launches_used   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists users_wallet_idx on users(wallet_address);


-- ── Narratives ────────────────────────────────────────────────────────────────
create table if not exists narratives (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  summary             text not null default '',
  hype_score          integer not null default 0 check (hype_score between 0 and 100),
  estimated_window    text not null default '3-6 hrs',
  sources             text[] not null default '{}',
  suggested_angles    text[] not null default '{}',
  suggested_tickers   text[] not null default '{}',
  tokens_launched     integer not null default 0,
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now()
);

create index if not exists narratives_hype_idx on narratives(hype_score desc);
create index if not exists narratives_expires_idx on narratives(expires_at);


-- ── Token Drafts ──────────────────────────────────────────────────────────────
create table if not exists token_drafts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references users(id) on delete cascade,
  narrative_id        uuid references narratives(id) on delete set null,

  -- Token identity
  name                text not null,
  ticker              text not null,
  description         text not null default '',
  logo_url            text,

  -- Chain config
  chain               text not null check (chain in ('bsc', 'solana')),
  total_supply        text not null default '1000000000',
  tax_buy             numeric not null default 0,
  tax_sell            numeric not null default 0,

  -- Launch config
  launch_mechanism    text not null default 'fair_launch'
                        check (launch_mechanism in ('fair_launch', 'bonding_curve', 'presale')),
  lp_lock             boolean not null default true,
  renounce            boolean not null default false,

  -- AI-generated social copy
  tg_bio              text not null default '',
  twitter_bio         text not null default '',
  first_tweets        text[] not null default '{}',

  status              text not null default 'draft'
                        check (status in ('draft', 'confirmed', 'deploying', 'live', 'failed')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists token_drafts_user_idx on token_drafts(user_id);
create index if not exists token_drafts_status_idx on token_drafts(status);


-- ── Launched Tokens ───────────────────────────────────────────────────────────
create table if not exists launched_tokens (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references users(id) on delete cascade,
  draft_id            uuid references token_drafts(id) on delete set null,

  contract_address    text not null,
  chain               text not null check (chain in ('bsc', 'solana')),
  tx_hash             text not null,

  -- Live market data (updated by background job)
  price_usd           numeric,
  market_cap_usd      numeric,
  volume_24h          numeric,
  price_change_24h    numeric,
  last_price_update   timestamptz,

  -- Add-on flags
  audit_scan_done     boolean not null default false,
  tg_setup_done       boolean not null default false,
  volume_bot_tier     text not null default 'none'
                        check (volume_bot_tier in ('none', 'starter', 'growth', 'pro')),

  launched_at         timestamptz not null default now()
);

create index if not exists launched_tokens_user_idx on launched_tokens(user_id);
create index if not exists launched_tokens_address_idx on launched_tokens(contract_address);


-- ── Add-ons ───────────────────────────────────────────────────────────────────
create table if not exists add_ons (
  id          uuid primary key default uuid_generate_v4(),
  token_id    uuid references launched_tokens(id) on delete cascade,
  type        text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'active', 'expired')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists add_ons_token_idx on add_ons(token_id);


-- ── Row Level Security ────────────────────────────────────────────────────────
-- Users can only read/write their own data

alter table users enable row level security;
alter table token_drafts enable row level security;
alter table launched_tokens enable row level security;
alter table add_ons enable row level security;

-- Narratives are public (everyone can read the feed)
alter table narratives enable row level security;
create policy "Anyone can read narratives" on narratives for select using (true);

-- Service role (used by API) bypasses RLS automatically
-- For the web client anon key, we lock things down:
create policy "Users can read own data" on users
  for select using (wallet_address = current_setting('app.wallet_address', true));

create policy "Users can read own drafts" on token_drafts
  for select using (
    user_id in (
      select id from users
      where wallet_address = current_setting('app.wallet_address', true)
    )
  );

create policy "Users can read own tokens" on launched_tokens
  for select using (
    user_id in (
      select id from users
      where wallet_address = current_setting('app.wallet_address', true)
    )
  );


-- ── updated_at auto-update trigger ───────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger token_drafts_updated_at
  before update on token_drafts
  for each row execute function update_updated_at();

-- ── Audit Scans ───────────────────────────────────────────────────────────────
create table if not exists audit_scans (
  id                uuid primary key default uuid_generate_v4(),
  token_id          uuid references launched_tokens(id) on delete cascade,
  contract_address  text not null,
  chain             text not null,
  score             integer not null default 0,
  overall_risk      text not null default 'unknown',
  risks             jsonb not null default '[]',
  passes            jsonb not null default '[]',
  scanned_at        timestamptz not null default now()
);

create index if not exists audit_scans_token_idx on audit_scans(token_id);

alter table audit_scans enable row level security;
create policy "Anyone can read audit scans" on audit_scans for select using (true);
