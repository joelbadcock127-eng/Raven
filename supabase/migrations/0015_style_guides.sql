-- Per-property social style guides: the voice, vibe and look a property's
-- feed should keep (e.g. Annie May's Instagram theme), applied to every
-- AI caption, music pick and reel grade for that property.
create table if not exists style_guides (
  property_id text primary key references properties(id) on delete cascade,
  voice text not null default '',            -- tone of voice for captions
  vibe text not null default '',             -- the feed's overall feel/mood
  visual text not null default '',           -- look: light, colours, grading
  music text not null default '',            -- music vibe keywords for reels
  hashtags text[] not null default '{}',     -- preferred hashtag pool
  cta text not null default '',              -- how captions should close
  avoid text not null default '',            -- words and moves never to use
  example_captions text[] not null default '{}',  -- few-shot examples in the target style
  source_notes text not null default '',     -- where the guide came from (IG handle etc.)
  updated_at timestamptz not null default now()
);
