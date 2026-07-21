-- 0014: reels-from-stills spec (no schema change), tracked links + click
-- attribution, social post insights, and one-off posting plans.

-- Tracked booking / offer links with click counting for attribution
create table if not exists tracked_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  property_id text references properties (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  label text not null default '',
  target_url text not null,
  kind text not null default 'custom',   -- booking | event | offer | custom
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tracked_links_property_idx on tracked_links (property_id);

create table if not exists link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references tracked_links (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  ua text
);
create index if not exists link_clicks_link_idx on link_clicks (link_id, clicked_at);

alter table tracked_links enable row level security;
alter table link_clicks enable row level security;

-- Social post performance (filled by the Meta insights sync when connected)
alter table social_posts add column if not exists reach int;
alter table social_posts add column if not exists likes int;
alter table social_posts add column if not exists comments int;
alter table social_posts add column if not exists saves int;
alter table social_posts add column if not exists link_clicks int;
alter table social_posts add column if not exists insights_synced_at timestamptz;
alter table social_posts add column if not exists published_at timestamptz;

-- One-off posting plans (a single scheduled post) alongside recurring ones
alter table posting_plans add column if not exists mode text not null default 'recurring';

-- Atomic click increment for the redirect endpoint
create or replace function increment_link_clicks(p_id uuid)
returns void language sql as $$
  update tracked_links set clicks = clicks + 1 where id = p_id;
$$;
