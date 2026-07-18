-- Raven: demand engine depth — campaign goal dates, offers, distribution
-- checklist, and one-opportunity-per-event so scheduled scrapes can upsert.

alter table campaigns add column if not exists target_start date;
alter table campaigns add column if not exists target_end date;
alter table campaigns add column if not exists offer jsonb;
alter table campaigns add column if not exists distribution jsonb not null default '{}'::jsonb;

-- scrapes and the signals engine upsert opportunities keyed by event
create unique index if not exists opportunities_event_id_key on opportunities (event_id);
