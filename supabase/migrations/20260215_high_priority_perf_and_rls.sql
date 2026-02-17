-- High-priority performance/security optimizations
-- 1) Add missing FK/query indexes
-- 2) Apply RLS performance pattern: (select auth.uid())

-- Indexes (safe for existing DB)
create index if not exists workspaces_owner_idx on public.workspaces(owner_id);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_author_updated_idx on public.posts(author_id, updated_at desc);
create index if not exists media_user_idx on public.media(user_id);

-- Profiles
alter policy "Users can view their own profile"
on public.profiles
using ((select auth.uid()) = id);

alter policy "Users can update their own profile"
on public.profiles
using ((select auth.uid()) = id);

-- Workspaces
alter policy "Users can view their own workspaces"
on public.workspaces
using ((select auth.uid()) = owner_id);

alter policy "Users can create workspaces"
on public.workspaces
with check ((select auth.uid()) = owner_id);

alter policy "Users can update their own workspaces"
on public.workspaces
using ((select auth.uid()) = owner_id);

-- Posts
alter policy "Users can view their own posts"
on public.posts
using ((select auth.uid()) = author_id);

alter policy "Users can create posts"
on public.posts
with check ((select auth.uid()) = author_id);

alter policy "Users can update their own posts"
on public.posts
using ((select auth.uid()) = author_id);

alter policy "Users can delete their own posts"
on public.posts
using ((select auth.uid()) = author_id);

-- Media
alter policy "Users can view their own media"
on public.media
using ((select auth.uid()) = user_id);

alter policy "Users can upload media"
on public.media
with check ((select auth.uid()) = user_id);

alter policy "Users can delete their own media"
on public.media
using ((select auth.uid()) = user_id);
