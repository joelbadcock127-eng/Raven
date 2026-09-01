-- Private no-payment booking links: a trusted guest opens a tokenized page,
-- picks dates from live availability, and the booking is pushed straight
-- into Lodgify (status Booked) with nothing charged — invoiced separately.

create table if not exists booking_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  property_id text not null,
  label text not null,
  require_approval boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references booking_links(id) on delete set null,
  property_id text not null,
  arrival date not null,
  departure date not null,
  adults int not null default 1,
  children int not null default 0,
  infants int not null default 0,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  notes text,
  -- pending (awaiting approval) | booked (in Lodgify) | failed | declined
  status text not null default 'pending',
  lodgify_booking_id bigint,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists booking_requests_link_idx on booking_requests (link_id, created_at desc);
