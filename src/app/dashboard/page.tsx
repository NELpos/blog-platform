import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import DashboardPostIndex from '@/components/blog/DashboardPostIndex'
import { isMissingColumnError } from '@/lib/markdown/legacy'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('name, slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  const primaryPostsQuery = await supabase
    .from('posts')
    .select('id, title, slug, published, published_at, published_version_id, updated_at')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false })

  let posts: Array<{
    id: string
    title: string
    slug: string
    published: boolean
    published_at: string | null
    published_version_id?: string | null
    updated_at: string
  }> | null = primaryPostsQuery.data as Array<{
    id: string
    title: string
    slug: string
    published: boolean
    published_at: string | null
    published_version_id?: string | null
    updated_at: string
  }> | null
  let postsError = primaryPostsQuery.error

  if (postsError && isMissingColumnError(postsError, 'published_version_id')) {
    const fallbackPostsQuery = await supabase
      .from('posts')
      .select('id, title, slug, published, published_at, updated_at')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })

    posts = fallbackPostsQuery.data as Array<{
      id: string
      title: string
      slug: string
      published: boolean
      published_at: string | null
      updated_at: string
    }> | null
    postsError = fallbackPostsQuery.error
  }

  if (workspaceError) {
    console.error('Failed to load workspace for dashboard', workspaceError)
  }

  if (postsError) {
    console.error('Failed to load posts for dashboard', postsError)
  }

  const initialPosts = (posts ?? []).map((post) => ({
    ...post,
    published_version_id: post.published_version_id ?? null,
  }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-card backdrop-blur">
        <div className="container-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Blog Platform
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium text-muted-foreground">
              {(workspace?.name ?? 'My')}&apos;s Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <DashboardPostIndex workspace={workspace} initialPosts={initialPosts} />
    </div>
  )
}
