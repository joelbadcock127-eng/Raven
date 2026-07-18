-- Posting plans: optionally cross-post the drafted reel/post as a story too.
alter table posting_plans add column if not exists also_story boolean not null default false;
