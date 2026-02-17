-- Medium-priority updates
-- 1) Public workspace SELECT policy for public blog routes
-- 2) (App-side change) cursor pagination for public posts list
-- 3) (App-side change) explicit column projection for GET /api/posts/:id

-- Create policy only if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and policyname = 'Public can view workspace metadata'
  ) then
    create policy "Public can view workspace metadata"
      on public.workspaces
      for select
      using (true);
  end if;
end $$;
