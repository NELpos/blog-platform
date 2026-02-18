alter table public.posts
  add column if not exists search_tsv tsvector generated always as (
    setweight(
      to_tsvector('simple', coalesce(live_title, title, '')),
      'A'
    ) || setweight(
      to_tsvector('simple', coalesce(live_content_markdown, content_markdown, '')),
      'B'
    )
  ) stored;

create index if not exists posts_public_feed_idx
  on public.posts(workspace_id, published_at desc, id desc)
  where published = true and published_at is not null;

create index if not exists posts_public_search_tsv_idx
  on public.posts using gin(search_tsv)
  where published = true;
