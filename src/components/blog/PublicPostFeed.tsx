'use client'

import { useEffect, useState } from 'react'
import PostList from '@/components/blog/PostList'

type PublicPostCard = {
  id: string
  title: string
  slug: string
  published_at: string | null
  excerpt?: string | null
}

interface PublicPostFeedProps {
  workspaceSlug: string
  initialPosts: PublicPostCard[]
  initialNextCursor: string | null
  initialResultCount: number
  query: string
}

export default function PublicPostFeed({
  workspaceSlug,
  initialPosts,
  initialNextCursor,
  initialResultCount,
  query,
}: PublicPostFeedProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const normalized = query.trim()
    if (!normalized) return

    void fetch(`/api/public/workspaces/${workspaceSlug}/search-events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: normalized,
        result_count: initialResultCount,
      }),
      keepalive: true,
    }).catch(() => undefined)
  }, [workspaceSlug, query, initialResultCount])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    setLoadError(null)
    try {
      const search = new URLSearchParams()
      search.set('cursor', nextCursor)
      if (query.trim()) {
        search.set('q', query.trim())
      }

      const response = await fetch(`/api/public/workspaces/${workspaceSlug}/posts?${search.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`failed:${response.status}`)
      }

      const payload = (await response.json()) as {
        posts: PublicPostCard[]
        nextCursor: string | null
      }

      setPosts((current) => [...current, ...(payload.posts ?? [])])
      setNextCursor(payload.nextCursor ?? null)
    } catch {
      setLoadError('포스트를 더 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <>
      <PostList workspaceSlug={workspaceSlug} posts={posts} />
      {loadError && (
        <p className="mt-6 text-center text-sm text-destructive">{loadError}</p>
      )}
      {nextCursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoadingMore ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      )}
    </>
  )
}
