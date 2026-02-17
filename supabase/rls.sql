-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Workspaces RLS Policies
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Users can update their own workspaces"
  ON workspaces FOR UPDATE
  USING ((select auth.uid()) = owner_id);

CREATE POLICY "Public can view workspace metadata"
  ON workspaces FOR SELECT
  USING (true);

-- Posts RLS Policies
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (published = true);

CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING ((select auth.uid()) = author_id);

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK ((select auth.uid()) = author_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  USING ((select auth.uid()) = author_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING ((select auth.uid()) = author_id);

-- Media RLS Policies
CREATE POLICY "Users can view their own media"
  ON media FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can upload media"
  ON media FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own media"
  ON media FOR DELETE
  USING ((select auth.uid()) = user_id);
