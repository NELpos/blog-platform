import { isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'
import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE_SIZE = 18

type Cursor = {
  publishedAt: string
  id: string
}

type RawPost = {
  id: string
  title: string
  slug: string
  published_at: string | null
  content_markdown: string
}

type MarkdownPostRow = {
  id: string
  title: string
  live_title: string | null
  slug: string
  published_at: string | null
  content_markdown: string | null
  live_content_markdown: string | null
}

type FallbackPostRow = {
  id: string
  title: string
  slug: string
  published_at: string | null
  content_markdown: string | null
}

type LegacyPostRow = {
  id: string
  title: string
  slug: string
  published_at: string | null
  content: unknown
}

export type PublicPostCard = {
  id: string
  title: string
  slug: string
  published_at: string | null
  excerpt: string
}

export function decodeCursor(value?: string): Cursor | null {
  if (!value) return null
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded) as Partial<Cursor>
    if (!parsed.publishedAt || !parsed.id) return null
    return { publishedAt: parsed.publishedAt, id: parsed.id }
  } catch {
    return null
  }
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function sanitizeOrSearchTerm(value: string): string {
  return value
    .replace(/[,()]/g, ' ')
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value)
}

function extractExcerpt(markdown: string): string {
  const normalized = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/@\[(image|video)\]\(([^)]+)\)(?:\{[^}]*\})?/g, ' ')
    .replace(/#+\s/g, '')
    .replace(/[*_`~>\-]/g, ' ')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.slice(0, 180)
}

function applyCursorFilter<T extends { or: (filters: string) => T }>(query: T, cursor: Cursor | null): T {
  if (!cursor) return query
  return query.or(
    `published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`,
  )
}

function toPublicPostCards(posts: RawPost[]): PublicPostCard[] {
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    published_at: post.published_at,
    excerpt: extractExcerpt(post.content_markdown ?? ''),
  }))
}

function getSearchQuery(search: string): string {
  return search.trim()
}

export async function listPublishedPostsByWorkspace({
  supabase,
  workspaceId,
  cursor,
  search,
}: {
  supabase: SupabaseClient
  workspaceId: string
  cursor: Cursor | null
  search: string
}): Promise<{ posts: PublicPostCard[]; nextCursor: string | null }> {
  const normalizedSearch = getSearchQuery(search)

  let markdownQuery = supabase
    .from('posts')
    .select('id, title, live_title, slug, published_at, content_markdown, live_content_markdown')
    .eq('workspace_id', workspaceId)
    .eq('published', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (normalizedSearch && hasHangul(normalizedSearch)) {
    const keyword = sanitizeOrSearchTerm(normalizedSearch)
    markdownQuery = markdownQuery.ilike('search_text', `%${keyword}%`)
  } else if (normalizedSearch) {
    markdownQuery = markdownQuery.textSearch('search_tsv', normalizedSearch, { type: 'websearch', config: 'simple' })
  }

  markdownQuery = applyCursorFilter(markdownQuery, cursor)
  const markdownResult = await markdownQuery

  let posts: RawPost[] = []

  if (!markdownResult.error) {
    posts = ((markdownResult.data ?? []) as MarkdownPostRow[]).map((post) => ({
      ...post,
      title: post.live_title ?? post.title,
      content_markdown: post.live_content_markdown ?? post.content_markdown ?? '',
    }))
  } else if (
    isMissingColumnError(markdownResult.error, 'search_tsv')
    || isMissingColumnError(markdownResult.error, 'search_text')
    || isMissingColumnError(markdownResult.error, 'live_title')
    || isMissingColumnError(markdownResult.error, 'live_content_markdown')
  ) {
    const searchTerm = sanitizeOrSearchTerm(normalizedSearch)
    let fallbackQuery = supabase
      .from('posts')
      .select('id, title, slug, published_at, content_markdown')
      .eq('workspace_id', workspaceId)
      .eq('published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (searchTerm && hasHangul(normalizedSearch)) {
      fallbackQuery = fallbackQuery.or(`title.ilike.%${searchTerm}%,content_markdown.ilike.%${searchTerm}%`)
    } else if (searchTerm) {
      fallbackQuery = fallbackQuery.or(`title.ilike.%${searchTerm}%,content_markdown.ilike.%${searchTerm}%`)
    }

    fallbackQuery = applyCursorFilter(fallbackQuery, cursor)
    const fallbackResult = await fallbackQuery

    if (fallbackResult.error) {
      throw fallbackResult.error
    }

    posts = ((fallbackResult.data ?? []) as FallbackPostRow[]).map((post) => ({
      ...post,
      content_markdown: post.content_markdown ?? '',
    }))
  } else if (isMissingColumnError(markdownResult.error, 'content_markdown')) {
    const searchTerm = sanitizeOrSearchTerm(normalizedSearch)
    let legacyQuery = supabase
      .from('posts')
      .select('id, title, slug, published_at, content')
      .eq('workspace_id', workspaceId)
      .eq('published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (searchTerm) {
      legacyQuery = legacyQuery.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    }

    legacyQuery = applyCursorFilter(legacyQuery, cursor)
    const legacyResult = await legacyQuery

    if (legacyResult.error) {
      throw legacyResult.error
    }

    posts = ((legacyResult.data ?? []) as LegacyPostRow[]).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      published_at: post.published_at,
      content_markdown: legacyContentToMarkdown(post.content),
    }))
  } else {
    throw markdownResult.error
  }

  const hasNextPage = posts.length > PAGE_SIZE
  const visiblePosts = hasNextPage ? posts.slice(0, PAGE_SIZE) : posts
  const nextCursor = hasNextPage
    ? encodeCursor({
        publishedAt: visiblePosts[visiblePosts.length - 1].published_at!,
        id: visiblePosts[visiblePosts.length - 1].id,
      })
    : null

  return {
    posts: toPublicPostCards(visiblePosts),
    nextCursor,
  }
}
