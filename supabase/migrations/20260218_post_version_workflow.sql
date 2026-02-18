alter table public.posts
  add column if not exists live_title text,
  add column if not exists live_content_markdown text not null default '',
  add column if not exists published_version_id uuid;

update public.posts
set
  live_title = coalesce(live_title, title),
  live_content_markdown = coalesce(live_content_markdown, content_markdown)
where live_title is null or live_content_markdown = '';

create table if not exists public.post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  version_number integer not null,
  title text not null,
  content_markdown text not null default '',
  created_at timestamptz not null default now(),
  unique(post_id, version_number)
);

create index if not exists post_versions_post_created_idx
  on public.post_versions(post_id, created_at desc);

create index if not exists post_versions_author_created_idx
  on public.post_versions(author_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_published_version_id_fkey'
  ) then
    alter table public.posts
      add constraint posts_published_version_id_fkey
      foreign key (published_version_id)
      references public.post_versions(id)
      on delete set null;
  end if;
end $$;

alter table public.post_versions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_versions'
      and policyname = 'Users can view their own post versions'
  ) then
    create policy "Users can view their own post versions"
      on public.post_versions for select
      using ((select auth.uid()) = author_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_versions'
      and policyname = 'Users can create their own post versions'
  ) then
    create policy "Users can create their own post versions"
      on public.post_versions for insert
      with check ((select auth.uid()) = author_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'post_versions'
      and policyname = 'Users can delete their own post versions'
  ) then
    create policy "Users can delete their own post versions"
      on public.post_versions for delete
      using ((select auth.uid()) = author_id);
  end if;
end $$;
