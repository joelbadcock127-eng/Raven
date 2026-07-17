-- Raven stage 2: availability (Lodgify + iCal), occupancy gaps, sync log, AI enrichment

-- Booking-source config per property
alter table properties add column if not exists ical_urls jsonb;          -- Annie May: {"room-1": "https://...ics", ...}
alter table properties add column if not exists booking_source text
  not null default 'lodgify' check (booking_source in ('lodgify', 'ical'));

-- Per-night availability snapshots (unit_id = room id for room-level, 'whole' otherwise)
create table if not exists availability_days (
  property_id text not null references properties (id) on delete cascade,
  unit_id text not null default 'whole',
  date date not null,
  is_available boolean not null,
  source text not null,                 -- 'lodgify' | 'ical'
  fetched_at timestamptz not null default now(),
  primary key (property_id, unit_id, date)
);

create index if not exists availability_days_date_idx on availability_days (date);

-- Detected vacancy gaps worth marketing (Module 5 input)
create table if not exists occupancy_gaps (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references properties (id) on delete cascade,
  unit_id text not null default 'whole',
  start_date date not null,
  end_date date not null,
  nights int not null,
  kind text not null check (kind in ('isolated-night', 'short-gap', 'empty-weekend', 'long-gap')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (property_id, unit_id, start_date, end_date)
);

-- Sync observability (brief section 12: log request counts, sync age, failures)
create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                   -- 'availability' | 'events' | 'enrich'
  status text not null check (status in ('ok', 'partial', 'error')),
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- AI enrichment columns on events (Haiku classification pass)
alter table events add column if not exists ai_enriched_at timestamptz;
alter table events add column if not exists ai_demand smallint;           -- 0..100 estimated demand
alter table events add column if not exists ai_summary text;             -- one-line owner-facing summary

alter table availability_days enable row level security;
alter table occupancy_gaps enable row level security;
alter table sync_runs enable row level security;
