-- Switch posts canonical content format from tiptap JSONB to markdown text.
-- Existing posts are intentionally purged before schema migration.

begin;

truncate table public.posts;

alter table public.posts
  drop column if exists content;

alter table public.posts
  add column if not exists content_markdown text not null default '';

commit;
