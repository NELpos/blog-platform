import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import PostViewer from '@/components/blog/PostViewer'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ workspace_slug: string; post_slug: string }>
}) {
  const { workspace_slug, post_slug } = await params
  const supabase = await createClient()

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', workspace_slug)
    .maybeSingle()

  if (workspaceError) {
    console.error('Failed to load workspace for public blog post', {
      workspaceSlug: workspace_slug,
      postSlug: post_slug,
      error: workspaceError,
    })
    throw new Error('Failed to load workspace')
  }

  if (!workspace) {
    notFound()
  }

  const markdownQuery = await supabase
    .from('posts')
    .select('id, title, live_title, slug, content_markdown, live_content_markdown, cover_image_url, published_at, profiles(display_name, avatar_url)')
    .eq('workspace_id', workspace.id)
    .eq('slug', post_slug)
    .eq('published', true)
    .maybeSingle()

  let post: {
    id: string
    title: string
    slug: string
    content_markdown: string
    cover_image_url: string | null
    published_at: string | null
    profiles: { display_name: string | null; avatar_url: string | null } | { display_name: string | null; avatar_url: string | null }[] | null
  } | null = null

  if (!markdownQuery.error && markdownQuery.data) {
    post = {
      ...markdownQuery.data,
      title: markdownQuery.data.live_title ?? markdownQuery.data.title,
      content_markdown: markdownQuery.data.live_content_markdown ?? markdownQuery.data.content_markdown ?? '',
    }
  } else if (markdownQuery.error && (isMissingColumnError(markdownQuery.error, 'live_title') || isMissingColumnError(markdownQuery.error, 'live_content_markdown'))) {
    const fallbackQuery = await supabase
      .from('posts')
      .select('id, title, slug, content_markdown, cover_image_url, published_at, profiles(display_name, avatar_url)')
      .eq('workspace_id', workspace.id)
      .eq('slug', post_slug)
      .eq('published', true)
      .maybeSingle()

    if (fallbackQuery.error) {
      console.error('Failed to load fallback published post for public blog post', {
        workspaceId: workspace.id,
        workspaceSlug: workspace_slug,
        postSlug: post_slug,
        error: fallbackQuery.error,
      })
      throw new Error('Failed to load post')
    }

    if (fallbackQuery.data) {
      post = {
        ...fallbackQuery.data,
        content_markdown: fallbackQuery.data.content_markdown ?? '',
      }
    }
  } else if (markdownQuery.error && isMissingColumnError(markdownQuery.error, 'content_markdown')) {
    const legacyQuery = await supabase
      .from('posts')
      .select('id, title, slug, content, cover_image_url, published_at, profiles(display_name, avatar_url)')
      .eq('workspace_id', workspace.id)
      .eq('slug', post_slug)
      .eq('published', true)
      .maybeSingle()

    if (legacyQuery.error) {
      console.error('Failed to load published legacy post for public blog post', {
        workspaceId: workspace.id,
        workspaceSlug: workspace_slug,
        postSlug: post_slug,
        error: legacyQuery.error,
      })
      throw new Error('Failed to load post')
    }

    if (legacyQuery.data) {
      post = {
        ...legacyQuery.data,
        content_markdown: legacyContentToMarkdown(legacyQuery.data.content),
      }
    }
  } else if (markdownQuery.error) {
    console.error('Failed to load published post for public blog post', {
      workspaceId: workspace.id,
      workspaceSlug: workspace_slug,
      postSlug: post_slug,
      error: markdownQuery.error,
    })
    throw new Error('Failed to load post')
  }

  if (!post) {
    notFound()
  }

  const publishedDate = post.published_at ? new Date(post.published_at) : null
  const formattedPublishedDate = publishedDate && isValid(publishedDate)
    ? format(publishedDate, 'PPP', { locale: ko })
    : 'Date unavailable'
  const authorProfile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-card backdrop-blur-sm">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href={`/blog/${workspace_slug}`} className="text-lg font-semibold tracking-tight transition-colors hover:text-primary">
            {workspace.name}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container-shell py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[1fr_minmax(0,880px)_1fr] xl:grid-cols-[1fr_minmax(0,940px)_1fr]">
          <div aria-hidden="true" />
          <div className="min-w-0 lg:px-4">
            <section className="rounded-2xl border border-border/80 bg-card/45 px-5 py-7 shadow-sm backdrop-blur-sm md:px-8 md:py-9">
              <div className="mb-10 border-b border-border/70 pb-8 text-center">
                <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                  {post.title}
                </h1>

                <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  {authorProfile?.avatar_url && (
                    <Image
                      src={authorProfile.avatar_url}
                      alt={authorProfile.display_name || 'Author'}
                      className="h-8 w-8 rounded-full bg-muted"
                      width={32}
                      height={32}
                    />
                  )}
                  <span className="font-medium text-foreground">
                    {authorProfile?.display_name || 'Anonymous'}
                  </span>
                  <span>·</span>
                  <time dateTime={post.published_at ?? undefined}>
                    {formattedPublishedDate}
                  </time>
                </div>
              </div>

              {post.cover_image_url && (
                <div className="mb-10 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    className="h-full w-full object-cover"
                    width={1280}
                    height={720}
                  />
                </div>
              )}

              <article className="max-w-none">
                <PostViewer contentMarkdown={post.content_markdown ?? ''} />
              </article>
            </section>
          </div>
          <div aria-hidden="true" />
        </div>
      </main>

      <footer className="mt-20 border-t border-border bg-card py-12">
        <div className="container-shell text-center">
          <Link href={`/blog/${workspace_slug}`} className="mb-4 block text-xl font-semibold tracking-tight">
            {workspace.name}
          </Link>
          <p className="text-sm text-muted-foreground">
             Start your own blog with <Link href="/" className="underline hover:text-foreground">Blog Platform</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
