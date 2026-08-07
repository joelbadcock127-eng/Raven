-- Small server-side key/value store for values Raven must update itself,
-- starting with the Instagram access token: Instagram-login tokens expire
-- every 60 days, so the nightly cron refreshes the token and stores the
-- newest copy here (key 'ig_token'). Env vars only seed the first token.
create table if not exists app_config (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
