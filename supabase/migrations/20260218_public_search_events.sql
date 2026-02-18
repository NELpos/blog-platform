create table if not exists public.public_search_events (
  id bigserial primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  query text not null,
  query_length integer not null,
  has_hangul boolean not null default false,
  result_count integer,
  source text not null default 'public_blog_list',
  created_at timestamptz not null default now()
);

create index if not exists public_search_events_workspace_created_idx
  on public.public_search_events(workspace_id, created_at desc);

alter table public.public_search_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_search_events'
      and policyname = 'Public can insert search events'
  ) then
    create policy "Public can insert search events"
      on public.public_search_events
      for insert
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'public_search_events'
      and policyname = 'Workspace owners can view their search events'
  ) then
    create policy "Workspace owners can view their search events"
      on public.public_search_events
      for select
      using (
        exists (
          select 1
          from public.workspaces
          where workspaces.id = public_search_events.workspace_id
            and workspaces.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;
