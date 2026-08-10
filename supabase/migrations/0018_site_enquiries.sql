-- Enquiries submitted from property website contact forms (Annie May first).
create table if not exists site_enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'annie-may',
  name text not null,
  email text not null,
  phone text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists site_enquiries_property_created_idx
  on site_enquiries (property_id, created_at desc);
