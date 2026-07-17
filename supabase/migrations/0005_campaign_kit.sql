-- Raven: one-click campaign kit — generated landing pages + kit content.

-- AI-generated event accommodation landing pages, served at /events/<slug>.
create table if not exists event_pages (
  slug text primary key,
  campaign_id uuid references campaigns (id) on delete cascade,
  property_id text references properties (id),
  event_id text references events (id) on delete set null,
  content jsonb not null default '{}'::jsonb, -- headline, intro, whyStay[], plan[], cta, metaDescription, heroMediaId
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kit content (guest email, organiser outreach, GBP post, promo code…)
alter table campaigns add column if not exists kit jsonb not null default '{}'::jsonb;

alter table event_pages enable row level security;
