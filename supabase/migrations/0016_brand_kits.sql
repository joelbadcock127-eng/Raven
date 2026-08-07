-- Per-property brand kits: the visual identity applied automatically to
-- every post, reel and story — fonts, colours, on-video text styling,
-- watermark and format defaults. Stored as jsonb alongside the style guide;
-- code merges saved values over the built-in property defaults
-- (see apps/web/src/lib/brandKit.ts), so an empty object means "use defaults".
alter table style_guides add column if not exists brand jsonb not null default '{}';
