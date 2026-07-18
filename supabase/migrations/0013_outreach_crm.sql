-- Outreach CRM: organisations that generate repeat accommodation demand
-- (contractors, event organisers, sports bodies, agencies). The Annie May
-- research spreadsheet lives here now.
create table if not exists outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation text not null,
  category text not null default 'other',
  contact_name text,
  contact_role text,
  email text,
  phone text,
  demand_trigger text,
  booking_type text,
  property_fit text[] not null default '{}',
  last_contact date,
  next_follow_up date,
  active_dates text,
  negotiated_rate text,
  previous_revenue numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table outreach_contacts enable row level security;
