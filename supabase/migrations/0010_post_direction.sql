-- Store the style direction on each drafted post so downstream steps
-- (reel rendering, music choice) can honour it.
alter table social_posts add column if not exists direction text;
