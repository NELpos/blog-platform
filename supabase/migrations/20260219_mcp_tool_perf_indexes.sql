-- MCP tool performance indexes
-- 1) Fast owner-scoped slug lookup for post_read fallback
CREATE INDEX IF NOT EXISTS posts_author_slug_idx
  ON public.posts (author_id, slug);

-- 2) Fast owner-scoped full text search for private MCP search (draft + published)
CREATE INDEX IF NOT EXISTS posts_private_search_tsv_idx
  ON public.posts
  USING GIN (search_tsv);

-- 3) Optional fallback acceleration for ILIKE-based search paths
CREATE INDEX IF NOT EXISTS posts_private_search_text_trgm_idx
  ON public.posts
  USING GIN (search_text gin_trgm_ops);
