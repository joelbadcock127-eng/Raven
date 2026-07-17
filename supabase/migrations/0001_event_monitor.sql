-- Raven Module 1: Event Monitor schema
-- Applied once the new Supabase account is connected.

create table if not exists properties (
  id text primary key,                -- e.g. 'annie-may'
  name text not null,
  locality text not null,
  lat double precision not null,
  lon double precision not null,
  inventory text not null check (inventory in ('whole-property', 'room-level')),
  max_guests int not null,
  min_stay int not null default 1,
  adults_only boolean not null default false,
  guest_fit jsonb not null default '{}'::jsonb,   -- tag -> affinity 0..1
  caution_tags text[] not null default '{}',
  caution_note text,
  lodgify_property_id text,           -- mapped during Lodgify onboarding
  lodgify_room_ids jsonb,             -- room-level mapping for Annie May
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id text primary key,                -- content hash from the scraper
  source text not null,
  source_url text not null,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  venue_name text,
  address text,
  locality text,
  lat double precision,
  lon double precision,
  url text,
  image text,
  tags text[] not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  dismissed boolean not null default false
);

create index if not exists events_start_date_idx on events (start_date);
create index if not exists events_source_idx on events (source);

create table if not exists event_scores (
  event_id text not null references events (id) on delete cascade,
  property_id text not null references properties (id) on delete cascade,
  total numeric(5,1) not null,
  demand numeric(5,1) not null,
  location numeric(5,1) not null,
  guest_fit numeric(5,1) not null,
  inventory numeric(5,1) not null,
  stay_fit numeric(5,1) not null,
  rationale text[] not null default '{}',
  scored_at timestamptz not null default now(),
  primary key (event_id, property_id)
);

-- Opportunity feed state (module 2 will build on this)
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  event_id text references events (id) on delete cascade,
  recommended_property_id text references properties (id),
  priority text not null check (priority in ('high', 'medium', 'low')),
  status text not null default 'new' check (status in ('new', 'approved', 'modified', 'dismissed', 'done')),
  recommended_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: enable now, policies added when auth is wired up in the admin app.
alter table properties enable row level security;
alter table events enable row level security;
alter table event_scores enable row level security;
alter table opportunities enable row level security;
