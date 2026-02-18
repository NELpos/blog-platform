import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PostStudio from '@/components/blog/PostStudio'
import { isMissingColumnError } from '@/lib/markdown/legacy'

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
    console.error('Failed to load workspace for studio', workspaceError)
  }

  if (postsError) {
    console.error('Failed to load posts for studio', postsError)
  }

  const initialPosts = (posts ?? []).map((post) => ({
    ...post,
    published_version_id: post.published_version_id ?? null,
    content_markdown: null,
  }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PostStudio workspace={workspace} initialPosts={initialPosts} />
    </div>
  )
}
