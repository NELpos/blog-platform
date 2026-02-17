import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PostList from '@/components/blog/PostList'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'

const PAGE_SIZE = 18

type Cursor = {
  publishedAt: string
  id: string
}

function decodeCursor(value?: string): Cursor | null {
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

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
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

export default async function BlogParamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace_slug: string }>
  searchParams: Promise<{ cursor?: string }>
}) {
  const { workspace_slug } = await params
  const { cursor: cursorParam } = await searchParams
  const supabase = await createClient()
  const cursor = decodeCursor(cursorParam)

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', workspace_slug)
    .maybeSingle()

  if (workspaceError) {
    console.error('Failed to load workspace for public blog list', {
      workspaceSlug: workspace_slug,
      error: workspaceError,
    })
    throw new Error('Failed to load workspace')
  }

  if (!workspace) {
    notFound()
  }

  let postsQuery = supabase
    .from('posts')
    .select('id, title, slug, published_at, content_markdown')
    .eq('workspace_id', workspace.id)
    .eq('published', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    postsQuery = postsQuery.or(
      `published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`
    )
  }

  const markdownResult = await postsQuery

  let posts: Array<{
    id: string
    title: string
    slug: string
    published_at: string | null
    content_markdown: string
  }> = []

  if (!markdownResult.error) {
    posts = (markdownResult.data ?? []).map((post) => ({
      ...post,
      content_markdown: post.content_markdown ?? '',
    }))
  } else if (isMissingColumnError(markdownResult.error, 'content_markdown')) {
    let legacyPostsQuery = supabase
      .from('posts')
      .select('id, title, slug, published_at, content')
      .eq('workspace_id', workspace.id)
      .eq('published', true)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (cursor) {
      legacyPostsQuery = legacyPostsQuery.or(
        `published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`
      )
    }

    const legacyResult = await legacyPostsQuery

    if (legacyResult.error) {
      console.error('Failed to load legacy posts for public blog list', {
        workspaceId: workspace.id,
        workspaceSlug: workspace_slug,
        error: legacyResult.error,
      })
      throw new Error('Failed to load posts')
    }

    posts = (legacyResult.data ?? []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      published_at: post.published_at,
      content_markdown: legacyContentToMarkdown(post.content),
    }))
  } else {
    console.error('Failed to load posts for public blog list', {
      workspaceId: workspace.id,
      workspaceSlug: workspace_slug,
      error: markdownResult.error,
    })
    throw new Error('Failed to load posts')
  }

  const hasNextPage = posts.length > PAGE_SIZE
  const visiblePosts = hasNextPage ? posts.slice(0, PAGE_SIZE) : posts
  const nextCursor = hasNextPage
    ? encodeCursor({
        publishedAt: visiblePosts[visiblePosts.length - 1].published_at!,
        id: visiblePosts[visiblePosts.length - 1].id,
      })
    : null

  const postCards = visiblePosts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    published_at: post.published_at,
    excerpt: extractExcerpt(post.content_markdown ?? ''),
  }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href={`/blog/${workspace_slug}`} className="text-xl font-semibold tracking-tight">
            {workspace.name}
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="container-shell py-14 md:py-20">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-primary">Blog</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{workspace.name}</h1>
          <p className="text-lg text-muted-foreground">Stories, notes, and technical writing by {workspace.name}.</p>
        </div>

        <div className="mx-auto max-w-6xl">
          <PostList workspaceSlug={workspace_slug} posts={postCards} />
          {nextCursor && (
            <div className="mt-10 flex justify-center">
              <Link
                href={`/blog/${workspace_slug}?cursor=${encodeURIComponent(nextCursor)}`}
                className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                더 보기
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 border-t border-border py-10">
        <div className="container-shell text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {workspace.name}. Powered by Blog Platform.
        </div>
      </footer>
    </div>
  )
}
