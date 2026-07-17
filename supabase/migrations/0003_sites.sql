-- Raven Module 3 groundwork: editable clones of each property's website.
-- Pages live as ordered JSON blocks; rows are created lazily on first edit,
-- so the app falls back to the bundled scrape seed until then.

create table if not exists site_pages (
  property_id text not null references properties (id) on delete cascade,
  slug text not null,
  nav_label text not null,
  title text not null,
  blocks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (property_id, slug)
);

alter table site_pages enable row level security;
