-- DB-backed mirror page HTML so the admin Publish button can ship
-- code-level page changes (not just edit overrides) sandbox -> live.
-- A row SHADOWS the static file in the deploy; no row = file serves.
create table if not exists mirror_pages (
  property_id text not null references properties (id) on delete cascade,
  slug text not null,
  variant text not null check (variant in ('live', 'sandbox')),
  html text not null,
  updated_at timestamptz not null default now(),
  primary key (property_id, slug, variant)
);
alter table mirror_pages enable row level security;
