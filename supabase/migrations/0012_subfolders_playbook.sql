-- Media subfolders + campaign distribution playbook (days-out escalation).

alter table media_folders add column if not exists parent_id uuid references media_folders (id) on delete cascade;

-- per-campaign channel schedule: { channel: daysOutFromTargetStart }
alter table campaigns add column if not exists playbook jsonb not null default '{}'::jsonb;
