create extension if not exists pg_trgm;

alter table public.posts
  add column if not exists search_text text generated always as (
    coalesce(live_title, title, '') || ' ' || coalesce(live_content_markdown, content_markdown, '')
  ) stored;

create index if not exists posts_public_search_text_trgm_idx
  on public.posts using gin(search_text gin_trgm_ops)
  where published = true;
