-- Raven Module 4 groundwork: media library, social queue, campaign records,
-- and fact-based event columns for the scraper.

-- ── Event facts (scraper collects facts, not articles) ──
alter table events add column if not exists organiser text;
alter table events add column if not exists ticket_url text;
alter table events add column if not exists estimated_audience int;
alter table events add column if not exists last_checked_at timestamptz;

-- ── Media library ──
-- Raw owner-supplied photos/videos, stored in the 'media' storage bucket.
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  property_id text references properties (id) on delete set null,
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null unique,
  public_url text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  tags text[] not null default '{}',
  caption text,
  times_used int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_assets_property_idx on media_assets (property_id);

-- ── Campaigns (the 9-step event → booking pipeline) ──
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities (id) on delete cascade,
  event_id text references events (id) on delete cascade,
  property_id text references properties (id),
  status text not null default 'preparing'
    check (status in ('preparing', 'ready_for_approval', 'approved', 'live', 'stopped', 'completed')),
  -- per-asset checklist: {page, reel, posts, email, outreach} -> 'todo'|'draft'|'approved'|'published'
  assets jsonb not null default '{"page":"todo","reel":"todo","posts":"todo","email":"todo","outreach":"todo"}'::jsonb,
  landing_page_slug text,
  revenue numeric(10,2) not null default 0,
  bookings int not null default 0,
  started_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_status_idx on campaigns (status);

-- ── Social queue ──
-- Posts/reels either belong to a campaign or to the standing cadence (campaign_id null).
create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns (id) on delete cascade,
  property_id text references properties (id),
  kind text not null check (kind in ('post', 'reel', 'story', 'carousel')),
  platform text not null default 'instagram' check (platform in ('instagram', 'facebook', 'both')),
  caption text not null default '',
  media_ids uuid[] not null default '{}',
  scheduled_for date,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'publishing', 'published', 'failed', 'dismissed')),
  external_id text,
  external_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_posts_status_idx on social_posts (status, scheduled_for);

alter table media_assets enable row level security;
alter table campaigns enable row level security;
alter table social_posts enable row level security;

-- ── Storage bucket for the media library (public read; writes via service key) ──
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
