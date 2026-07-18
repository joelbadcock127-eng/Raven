-- Raven: site builder v2 (versioned, section-based sites), posting plans,
-- and the reel render pipeline.

-- ── Site builder ──
-- A version is a complete site (all pages) for one property. Owners create
-- drafts, publish them, and can view/restore any previously published one.
create table if not exists site_versions (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references properties (id) on delete cascade,
  label text not null default 'Draft',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists site_versions_property_idx on site_versions (property_id, created_at desc);

create table if not exists site_v2_pages (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references site_versions (id) on delete cascade,
  slug text not null,
  nav_label text not null,
  title text not null default '',
  sections jsonb not null default '[]'::jsonb,
  sort int not null default 0,
  unique (version_id, slug)
);

-- Which version is live per property + which domains map to it (moves the
-- domain mapping from code into data, editable from the Sites tab).
create table if not exists site_settings (
  property_id text primary key references properties (id) on delete cascade,
  live_version_id uuid references site_versions (id) on delete set null,
  domains text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ── Posting plans (the social regular, owner-configured) ──
create table if not exists posting_plans (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references properties (id) on delete cascade,
  name text not null,
  format text not null check (format in ('post', 'reel', 'story', 'carousel')),
  platform text not null default 'instagram' check (platform in ('instagram', 'facebook', 'both')),
  every_days int not null default 3,
  direction text,                       -- freeform style guidance for captions/clip choice
  reuse_cooldown_days int not null default 60,
  allow_reuse boolean not null default true,
  auto_publish boolean not null default false,
  active boolean not null default true,
  next_run_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists posting_plans_due_idx on posting_plans (active, next_run_at);

-- ── Reel render jobs (ffmpeg in GitHub Actions) ──
create table if not exists render_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id text references properties (id),
  social_post_id uuid references social_posts (id) on delete set null,
  spec jsonb not null,                  -- clips, trims, aspect, filter, captions, music
  status text not null default 'queued'
    check (status in ('queued', 'dispatched', 'rendering', 'done', 'failed')),
  output_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists render_jobs_status_idx on render_jobs (status, created_at);

alter table site_versions enable row level security;
alter table site_v2_pages enable row level security;
alter table site_settings enable row level security;
alter table posting_plans enable row level security;
alter table render_jobs enable row level security;
