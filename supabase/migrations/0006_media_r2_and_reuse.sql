-- Media library: R2 as blob backbone + content-reuse tracking.

-- Which store holds the blob ('supabase' for legacy rows, 'r2' for new ones).
alter table media_assets add column if not exists storage_provider text not null default 'supabase'
  check (storage_provider in ('supabase', 'r2'));

-- Reuse rules groundwork: cooldowns and benching.
alter table media_assets add column if not exists last_used_at timestamptz;
alter table media_assets add column if not exists retired boolean not null default false;
