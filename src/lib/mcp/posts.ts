import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import { isLegacyJsonTypeError, isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'

type McpPostSearchRow = {
  id: string
  title: string
  slug: string
  published: boolean
  updated_at: string
  content_markdown: string | null
  live_content_markdown?: string | null
  live_title?: string | null
}

type McpPostLegacySearchRow = {
  id: string
  title: string
  slug: string
  published: boolean
  updated_at: string
  content: unknown
}

type McpPostReadRow = {
  id: string
  title: string
  slug: string
  published: boolean
  updated_at: string
  content_markdown: string
  workspace: { slug: string } | Array<{ slug: string }> | null
}

type McpPostLegacyReadRow = {
  id: string
  title: string
  slug: string
  published: boolean
  updated_at: string
  content: unknown
  workspace: { slug: string } | Array<{ slug: string }> | null
}

function sanitizeSearch(value: string): string {
  return value.replace(/[,()]/g, ' ').replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim()
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value)
}

function excerpt(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/@\[(image|video)\]\(([^)]+)\)(?:\{[^}]*\})?/g, ' ')
    .replace(/#+\s/g, '')
    .replace(/[*_`~>\-]/g, ' ')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
}

function slugifyTitle(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'post'
}

function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length)
}

function throwPostgrest(error: PostgrestError): never {
  throw new Error(error.message)
}

export async function searchOwnPostsForMcp({
  supabase,
  userId,
  query,
  limit,
}: {
  supabase: SupabaseClient
  userId: string
  query?: string
  limit?: number
}) {
  const normalizedQuery = (query ?? '').trim()
  const safeLimit = Math.min(Math.max(limit ?? 10, 1), 20)

  let markdownQuery = supabase
    .from('posts')
    .select('id, title, slug, published, updated_at, content_markdown, live_content_markdown, live_title')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit)

  if (normalizedQuery && hasHangul(normalizedQuery)) {
    markdownQuery = markdownQuery.ilike('search_text', `%${sanitizeSearch(normalizedQuery)}%`)
  } else if (normalizedQuery) {
    markdownQuery = markdownQuery.textSearch('search_tsv', normalizedQuery, { type: 'websearch', config: 'simple' })
  }

  const markdownResult = await markdownQuery

  if (!markdownResult.error) {
    const rows = (markdownResult.data ?? []) as McpPostSearchRow[]
    return rows.map((row) => {
      const title = row.live_title?.trim() ? row.live_title : row.title
      const content = row.live_content_markdown ?? row.content_markdown ?? ''
      return {
        post_id: row.id,
        title,
        slug: row.slug,
        published: row.published,
        updated_at: row.updated_at,
        excerpt: excerpt(content),
      }
    })
  }

  const missingSearchColumns = (
    isMissingColumnError(markdownResult.error, 'search_tsv')
    || isMissingColumnError(markdownResult.error, 'search_text')
    || isMissingColumnError(markdownResult.error, 'live_content_markdown')
    || isMissingColumnError(markdownResult.error, 'live_title')
  )
  const missingMarkdown = isMissingColumnError(markdownResult.error, 'content_markdown')

  if (!missingSearchColumns && !missingMarkdown) {
    throwPostgrest(markdownResult.error)
  }

  if (!missingMarkdown) {
    let fallbackQuery = supabase
      .from('posts')
      .select('id, title, slug, published, updated_at, content_markdown')
      .eq('author_id', userId)
      .order('updated_at', { ascending: false })
      .limit(safeLimit)

    if (normalizedQuery) {
      const term = sanitizeSearch(normalizedQuery)
      fallbackQuery = fallbackQuery.or(`title.ilike.%${term}%,content_markdown.ilike.%${term}%`)
    }

    const fallbackResult = await fallbackQuery
    if (fallbackResult.error) throwPostgrest(fallbackResult.error)

    return ((fallbackResult.data ?? []) as McpPostSearchRow[]).map((row) => ({
      post_id: row.id,
      title: row.title,
      slug: row.slug,
      published: row.published,
      updated_at: row.updated_at,
      excerpt: excerpt(row.content_markdown ?? ''),
    }))
  }

  let legacyQuery = supabase
    .from('posts')
    .select('id, title, slug, published, updated_at, content')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit)

  if (normalizedQuery) {
    const term = sanitizeSearch(normalizedQuery)
    legacyQuery = legacyQuery.or(`title.ilike.%${term}%,content.ilike.%${term}%`)
  }

  const legacyResult = await legacyQuery
  if (legacyResult.error) throwPostgrest(legacyResult.error)

  return ((legacyResult.data ?? []) as McpPostLegacySearchRow[]).map((row) => ({
    post_id: row.id,
    title: row.title,
    slug: row.slug,
    published: row.published,
    updated_at: row.updated_at,
    excerpt: excerpt(legacyContentToMarkdown(row.content)),
  }))
}

export async function readOwnPostForMcp({
  supabase,
  userId,
  postId,
  slug,
}: {
  supabase: SupabaseClient
  userId: string
  postId?: string
  slug?: string
}) {
  if (!postId && !slug) {
    throw new Error('post_id or slug is required')
  }

  const byKey = postId ? { field: 'id' as const, value: postId } : { field: 'slug' as const, value: slug! }

  const markdownQuery = await supabase
    .from('posts')
    .select('id, title, slug, published, updated_at, content_markdown, workspace:workspaces(slug)')
    .eq(byKey.field, byKey.value)
    .eq('author_id', userId)
    .maybeSingle()

  if (!markdownQuery.error && markdownQuery.data) {
    const row = markdownQuery.data as McpPostReadRow
    const workspace = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace
    return {
      post_id: row.id,
      title: row.title,
      slug: row.slug,
      published: row.published,
      updated_at: row.updated_at,
      workspace_slug: workspace?.slug ?? null,
      content_markdown: row.content_markdown,
    }
  }

  if (!markdownQuery.error && !markdownQuery.data) {
    throw new Error('Not found')
  }

  if (markdownQuery.error && !isMissingColumnError(markdownQuery.error, 'content_markdown')) {
    throwPostgrest(markdownQuery.error)
  }

  const legacyQuery = await supabase
    .from('posts')
    .select('id, title, slug, published, updated_at, content, workspace:workspaces(slug)')
    .eq(byKey.field, byKey.value)
    .eq('author_id', userId)
    .maybeSingle()

  if (legacyQuery.error) throwPostgrest(legacyQuery.error)
  if (!legacyQuery.data) throw new Error('Not found')

  const row = legacyQuery.data as McpPostLegacyReadRow
  const workspace = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace
  return {
    post_id: row.id,
    title: row.title,
    slug: row.slug,
    published: row.published,
    updated_at: row.updated_at,
    workspace_slug: workspace?.slug ?? null,
    content_markdown: legacyContentToMarkdown(row.content),
  }
}

export async function createDraftPostForMcp({
  supabase,
  userId,
  title,
  contentMarkdown,
}: {
  supabase: SupabaseClient
  userId: string
  title: string
  contentMarkdown: string
}) {
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (workspaceError) throwPostgrest(workspaceError)
  if (!workspace) throw new Error('No workspace found')

  const slugBase = slugifyTitle(String(title || 'Untitled Post'))
  const finalTitle = title?.trim() ? title : 'Untitled Post'

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = `${slugBase}-${randomSuffix()}`

    const markdownInsert = await supabase
      .from('posts')
      .insert({
        workspace_id: workspace.id,
        author_id: userId,
        title: finalTitle,
        slug,
        content_markdown: contentMarkdown,
        live_title: finalTitle,
        live_content_markdown: contentMarkdown,
        published_version_id: null,
        published: false,
      })
      .select('id, title, slug, published, created_at, updated_at')
      .single()

    if (!markdownInsert.error) {
      return markdownInsert.data
    }

    if (markdownInsert.error.code === '23505') {
      continue
    }

    const missingMarkdown = isMissingColumnError(markdownInsert.error, 'content_markdown')
    const missingLiveTitle = isMissingColumnError(markdownInsert.error, 'live_title')
    const missingLiveContent = isMissingColumnError(markdownInsert.error, 'live_content_markdown')
    const missingPublishedVersion = isMissingColumnError(markdownInsert.error, 'published_version_id')

    if (!missingMarkdown && !missingLiveTitle && !missingLiveContent && !missingPublishedVersion) {
      throwPostgrest(markdownInsert.error)
    }

    if (!missingMarkdown && (missingLiveTitle || missingLiveContent || missingPublishedVersion)) {
      const markdownFallback = await supabase
        .from('posts')
        .insert({
          workspace_id: workspace.id,
          author_id: userId,
          title: finalTitle,
          slug,
          content_markdown: contentMarkdown,
          published: false,
        })
        .select('id, title, slug, published, created_at, updated_at')
        .single()

      if (!markdownFallback.error) return markdownFallback.data
      if (markdownFallback.error.code === '23505') continue
      if (!isMissingColumnError(markdownFallback.error, 'content_markdown')) {
        throwPostgrest(markdownFallback.error)
      }
    }

    let legacyInsert = await supabase
      .from('posts')
      .insert({
        workspace_id: workspace.id,
        author_id: userId,
        title: finalTitle,
        slug,
        content: contentMarkdown,
        published: false,
      })
      .select('id, title, slug, published, created_at, updated_at')
      .single()

    if (legacyInsert.error && isLegacyJsonTypeError(legacyInsert.error)) {
      legacyInsert = await supabase
        .from('posts')
        .insert({
          workspace_id: workspace.id,
          author_id: userId,
          title: finalTitle,
          slug,
          content: JSON.stringify(contentMarkdown),
          published: false,
        })
        .select('id, title, slug, published, created_at, updated_at')
        .single()
    }

    if (!legacyInsert.error) return legacyInsert.data
    if (legacyInsert.error.code === '23505') continue
    throwPostgrest(legacyInsert.error)
  }

  throw new Error('Failed to create a unique slug')
}
