-- Media folders, audio assets (music), and per-plan clip controls.

-- Folders: an asset can sit in any number of folders and always stays in the
-- property pool; plans can target a folder as their content source.
create table if not exists media_folders (
  id uuid primary key default gen_random_uuid(),
  property_id text references properties (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (property_id, name)
);
alter table media_assets add column if not exists folder_ids uuid[] not null default '{}';

-- Music lives in the library too
alter table media_assets drop constraint if exists media_assets_kind_check;
alter table media_assets add constraint media_assets_kind_check
  check (kind in ('image', 'video', 'audio'));
alter table media_assets add column if not exists attribution text; -- CC-BY credit line

-- Plans: content source folder + reel clip cap (a maximum, not a quota)
alter table posting_plans add column if not exists folder_id uuid references media_folders (id) on delete set null;
alter table posting_plans add column if not exists max_clips int not null default 5;

alter table media_folders enable row level security;
