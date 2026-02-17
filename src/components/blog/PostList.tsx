import Link from 'next/link'
import { formatDistanceToNow, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'

interface Post {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  published_at: string | null
}

interface PostListProps {
  workspaceSlug: string
  posts: Post[]
}

function buildExcerpt(post: Post): string {
  const normalized = post.excerpt?.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    const title = (post.title || '이 포스트').trim()
    return `${title}에 대한 핵심 내용을 짧고 명확하게 정리한 글입니다. 자세한 내용은 포스트에서 확인하세요.`
  }
  return normalized.slice(0, 180) + (normalized.length > 180 ? '…' : '')
}

function inferCategory(post: Post): string {
  const corpus = `${post.title} ${post.excerpt ?? ''}`.toLowerCase()
  if (/\b(ai|llm|agent|prompt|model|inference)\b/.test(corpus)) return 'AI'
  if (/\b(infra|k8s|kubernetes|devops|observability|sre|server)\b/.test(corpus)) return 'Infra'
  if (/\b(design|ux|ui|frontend|react|next\.?js|css)\b/.test(corpus)) return 'Frontend'
  if (/\b(product|growth|launch|roadmap|strategy)\b/.test(corpus)) return 'Product'
  return 'Engineering'
}

function categoryBadgeClass(category: string): string {
  switch (category) {
    case 'AI':
      return 'border-blue-400/40 bg-blue-500/10 text-blue-300'
    case 'Infra':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-300'
    case 'Frontend':
      return 'border-violet-400/40 bg-violet-500/10 text-violet-300'
    case 'Product':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
    default:
      return 'border-border/80 bg-muted/40 text-foreground'
  }
}

export default function PostList({ workspaceSlug, posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="아직 발행된 포스트가 없습니다."
        description="첫 글을 발행하면 이곳에서 독자에게 보여집니다."
        className="py-20 text-center"
      />
    )
  }

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border/80 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => {
        const category = inferCategory(post)
        return (
          <Link
            key={post.id}
            href={`/blog/${workspaceSlug}/${post.slug}`}
            className="group flex min-h-[420px] flex-col border-b border-border/80 p-8 transition-colors hover:bg-muted/20 md:[&:nth-child(2n+1)]:border-r lg:border-b-0 lg:border-r lg:[&:nth-child(3n)]:border-r-0"
          >
            <div className="mb-10 flex items-center justify-between text-sm text-muted-foreground">
              <span className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${categoryBadgeClass(category)}`}>
                {category}
              </span>
              {(() => {
                if (!post.published_at) return null
                const publishedDate = new Date(post.published_at)
                if (!isValid(publishedDate)) return null
                return (
                  <time dateTime={post.published_at}>
                    {formatDistanceToNow(publishedDate, { addSuffix: true, locale: ko })}
                  </time>
                )
              })()}
            </div>

            <div className="flex flex-1 flex-col space-y-4">
              <h3 className="text-4xl font-semibold leading-[1.12] tracking-tight text-foreground transition-colors group-hover:text-primary md:text-[42px]">
                {post.title || 'Untitled'}
              </h3>
              <p className="line-clamp-6 text-xl leading-relaxed text-muted-foreground">
                {buildExcerpt(post)}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
