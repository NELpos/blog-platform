-- Profiles 테이블
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces 테이블
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  has_pending_changes BOOLEAN NOT NULL DEFAULT false,
  pending_title TEXT,
  pending_content_markdown TEXT,
  pending_updated_at TIMESTAMPTZ,
  cover_image_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT posts_published_requires_timestamp
    CHECK (published = false OR published_at IS NOT NULL),
  UNIQUE(workspace_id, slug)
);

-- Media 테이블
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX workspaces_owner_idx ON workspaces(owner_id);
CREATE INDEX posts_author_idx ON posts(author_id);
CREATE INDEX posts_author_updated_idx ON posts(author_id, updated_at DESC);
CREATE INDEX posts_author_pending_idx ON posts(author_id, has_pending_changes, updated_at DESC);
CREATE INDEX posts_workspace_idx ON posts(workspace_id);
CREATE INDEX posts_published_idx ON posts(workspace_id, published, published_at DESC);
CREATE INDEX media_workspace_idx ON media(workspace_id);
CREATE INDEX media_user_idx ON media(user_id);
