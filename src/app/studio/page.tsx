import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import PostStudio from '@/components/blog/PostStudio'

export default async function StudioPage() {
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

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, slug, published, published_at, has_pending_changes, updated_at')
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false })

  if (workspaceError) {
    console.error('Failed to load workspace for studio', workspaceError)
  }

  if (postsError) {
    console.error('Failed to load posts for studio', postsError)
  }

  const initialPosts = (posts ?? []).map((post) => ({
    ...post,
    content_markdown: null,
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
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">Studio</span>
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

      <PostStudio workspace={workspace} initialPosts={initialPosts} />
    </div>
  )
}
