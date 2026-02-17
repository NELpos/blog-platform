-- Support published-post update workflow:
-- 1) Save as pending draft update
-- 2) Publish pending update explicitly
-- 3) Discard pending update

alter table public.posts
  add column if not exists has_pending_changes boolean not null default false;

alter table public.posts
  add column if not exists pending_title text;

alter table public.posts
  add column if not exists pending_content_markdown text;

alter table public.posts
  add column if not exists pending_updated_at timestamptz;

create index if not exists posts_author_pending_idx
  on public.posts(author_id, has_pending_changes, updated_at desc);
