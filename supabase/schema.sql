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
  live_title TEXT,
  live_content_markdown TEXT NOT NULL DEFAULT '',
  search_tsv tsvector GENERATED ALWAYS AS (
    setweight(
      to_tsvector('simple', coalesce(live_title, title, '')),
      'A'
    ) || setweight(
      to_tsvector('simple', coalesce(live_content_markdown, content_markdown, '')),
      'B'
    )
  ) STORED,
  search_text TEXT GENERATED ALWAYS AS (
    coalesce(live_title, title, '') || ' ' || coalesce(live_content_markdown, content_markdown, '')
  ) STORED,
  published_version_id UUID,
  cover_image_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT posts_published_requires_timestamp
    CHECK (published = false OR published_at IS NOT NULL),
  UNIQUE(workspace_id, slug)
);

CREATE TABLE post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, version_number)
);

ALTER TABLE posts
  ADD CONSTRAINT posts_published_version_id_fkey
  FOREIGN KEY (published_version_id)
  REFERENCES post_versions(id)
  ON DELETE SET NULL;

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

CREATE TABLE public_search_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  query_length INTEGER NOT NULL,
  has_hangul BOOLEAN NOT NULL DEFAULT false,
  result_count INTEGER,
  source TEXT NOT NULL DEFAULT 'public_blog_list',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX workspaces_owner_idx ON workspaces(owner_id);
CREATE INDEX posts_author_idx ON posts(author_id);
CREATE INDEX posts_author_updated_idx ON posts(author_id, updated_at DESC);
CREATE INDEX posts_workspace_idx ON posts(workspace_id);
CREATE INDEX posts_published_idx ON posts(workspace_id, published, published_at DESC);
CREATE INDEX posts_public_feed_idx
  ON posts(workspace_id, published_at DESC, id DESC)
  WHERE published = true AND published_at IS NOT NULL;
CREATE INDEX posts_public_search_tsv_idx ON posts USING GIN(search_tsv) WHERE published = true;
CREATE INDEX posts_public_search_text_trgm_idx ON posts USING GIN(search_text gin_trgm_ops) WHERE published = true;
CREATE INDEX post_versions_post_created_idx ON post_versions(post_id, created_at DESC);
CREATE INDEX post_versions_author_created_idx ON post_versions(author_id, created_at DESC);
CREATE INDEX media_workspace_idx ON media(workspace_id);
CREATE INDEX media_user_idx ON media(user_id);
CREATE INDEX public_search_events_workspace_created_idx ON public_search_events(workspace_id, created_at DESC);
