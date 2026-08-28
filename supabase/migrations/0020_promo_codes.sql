-- Booking/promo codes for Lodgify-managed properties.
--
-- Lodgify exposes NO promotion API (verified empirically against the live
-- account: every promotions/discounts/coupons/vouchers path returns 404, and
-- the quote endpoint ignores promo-code parameters entirely), so the code is
-- created once in the Lodgify web app. Decra owns everything around it:
-- terms, validity, the ready-to-share checkout link with the code applied,
-- and click attribution via tracked_links.
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references properties (id) on delete cascade,
  code text not null,
  label text not null default '',
  terms text not null default '',
  kind text not null default 'other' check (kind in ('percent', 'fixed', 'free-night', 'other')),
  value numeric,
  currency text not null default 'AUD',
  min_nights int,
  book_by date,
  stay_from date,
  stay_to date,
  default_adults int not null default 2,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'expired')),
  tracked_link_id uuid references tracked_links (id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, code)
);
create index if not exists promo_codes_property_idx on promo_codes (property_id, status);
alter table promo_codes enable row level security;
