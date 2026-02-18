import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicPostFeed from '@/components/blog/PublicPostFeed'
import PublicPostSearchBar from '@/components/blog/PublicPostSearchBar'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { decodeCursor, listPublishedPostsByWorkspace } from '@/lib/public/posts'

export default async function BlogParamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace_slug: string }>
  searchParams: Promise<{ cursor?: string; q?: string }>
}) {
  const { workspace_slug } = await params
  const { cursor: cursorParam, q: queryParam } = await searchParams
  const supabase = await createClient()
  const cursor = decodeCursor(cursorParam)
  const query = queryParam?.trim() ?? ''

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

  let initialPosts: Awaited<ReturnType<typeof listPublishedPostsByWorkspace>>
  try {
    initialPosts = await listPublishedPostsByWorkspace({
      supabase,
      workspaceId: workspace.id,
      cursor,
      search: query,
    })
  } catch (error) {
    console.error('Failed to load public posts list', {
      workspaceId: workspace.id,
      workspaceSlug: workspace_slug,
      error,
    })
    throw new Error('Failed to load posts')
  }

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
          <PublicPostSearchBar workspaceSlug={workspace_slug} initialQuery={query} />

          <PublicPostFeed
            workspaceSlug={workspace_slug}
            initialPosts={initialPosts.posts}
            initialNextCursor={initialPosts.nextCursor}
            initialResultCount={initialPosts.posts.length}
            query={query}
          />
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
