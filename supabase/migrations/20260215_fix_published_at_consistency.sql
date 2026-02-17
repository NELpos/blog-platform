-- Ensure all published posts are visible in public list pagination logic
-- 1) Backfill missing published_at on already-published posts
-- 2) Enforce invariant: published=true => published_at is not null

update public.posts
set published_at = coalesce(published_at, updated_at, created_at, now())
where published = true
  and published_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_published_requires_timestamp'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_published_requires_timestamp
      check (published = false or published_at is not null);
  end if;
end $$;
