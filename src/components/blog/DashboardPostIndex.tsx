'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ExternalLink, FilePenLine, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DashboardPost = {
  id: string
  title: string
  slug: string
  published: boolean
  published_at: string | null
  has_pending_changes?: boolean | null
  updated_at: string
}

interface DashboardPostIndexProps {
  workspace: {
    name: string
    slug: string
  } | null
  initialPosts: DashboardPost[]
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = date.getTime() - Date.now()
  const absSeconds = Math.abs(diffMs) / 1000
  const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (absSeconds < 3600) return rtf.format(Math.round(diffMs / (1000 * 60)), 'minute')
  if (absSeconds < 86400) return rtf.format(Math.round(diffMs / (1000 * 60 * 60)), 'hour')
  if (absSeconds < 604800) return rtf.format(Math.round(diffMs / (1000 * 60 * 60 * 24)), 'day')
  if (absSeconds < 2629800) return rtf.format(Math.round(diffMs / (1000 * 60 * 60 * 24 * 7)), 'week')
  if (absSeconds < 31557600) return rtf.format(Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)), 'month')
  return rtf.format(Math.round(diffMs / (1000 * 60 * 60 * 24 * 365.25)), 'year')
}

export default function DashboardPostIndex({ workspace, initialPosts }: DashboardPostIndexProps) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkRunning, setIsBulkRunning] = useState(false)
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return posts
    return posts.filter((post) => (post.title || 'untitled').toLowerCase().includes(normalized))
  }, [posts, query])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allVisibleIds = filteredPosts.map((post) => post.id)
  const isAllVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedSet.has(id))

  const updatePostAsUnpublished = (ids: string[]) => {
    const idSet = new Set(ids)
    const now = new Date().toISOString()
    setPosts((current) =>
      current.map((post) =>
        idSet.has(post.id)
          ? { ...post, published: false, published_at: null, updated_at: now }
          : post,
      ),
    )
  }

  const removePosts = (ids: string[]) => {
    const idSet = new Set(ids)
    setPosts((current) => current.filter((post) => !idSet.has(post.id)))
    setSelectedIds((current) => current.filter((id) => !idSet.has(id)))
  }

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        if (current.includes(id)) return current
        return [...current, id]
      }
      return current.filter((item) => item !== id)
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...allVisibleIds])))
      return
    }
    const visibleSet = new Set(allVisibleIds)
    setSelectedIds((current) => current.filter((id) => !visibleSet.has(id)))
  }

  const openPost = (post: DashboardPost) => {
    router.push(`/studio?post=${post.id}&mode=edit`)
  }

  const handleUnpublish = async (id: string) => {
    setRowLoadingId(id)
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      })

      if (!response.ok) {
        throw new Error('비공개 전환에 실패했습니다.')
      }

      updatePostAsUnpublished([id])
      toast.success('포스트를 비공개로 전환했습니다.')
    } catch {
      toast.error('비공개 전환에 실패했습니다.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('이 Draft를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')
    if (!confirmed) return

    setRowLoadingId(id)
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.')
      }

      removePosts([id])
      toast.success('Draft를 삭제했습니다.')
    } catch {
      toast.error('삭제에 실패했습니다. Published 포스트는 먼저 비공개 전환이 필요합니다.')
    } finally {
      setRowLoadingId(null)
    }
  }

  const handleBulkUnpublish = async () => {
    if (selectedIds.length === 0) return
    setIsBulkRunning(true)
    try {
      const response = await fetch('/api/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish', ids: selectedIds }),
      })

      if (!response.ok) {
        throw new Error('bulk unpublish failed')
      }

      const payload = await response.json() as { affected_ids?: string[] }
      const affectedIds = payload.affected_ids ?? []
      updatePostAsUnpublished(affectedIds)
      toast.success(`${affectedIds.length}개 포스트를 비공개로 전환했습니다.`)
    } catch {
      toast.error('일괄 비공개 전환에 실패했습니다.')
    } finally {
      setIsBulkRunning(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const selectedPosts = posts.filter((post) => selectedSet.has(post.id))
    if (selectedPosts.some((post) => post.published)) {
      toast.error('Published 포스트가 포함되어 있습니다. 먼저 비공개 전환 후 삭제하세요.')
      return
    }

    const confirmed = window.confirm(`${selectedIds.length}개 Draft를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`)
    if (!confirmed) return

    setIsBulkRunning(true)
    try {
      const response = await fetch('/api/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: selectedIds }),
      })

      if (!response.ok) {
        throw new Error('bulk delete failed')
      }

      const payload = await response.json() as { affected_ids?: string[] }
      const affectedIds = payload.affected_ids ?? []
      removePosts(affectedIds)
      toast.success(`${affectedIds.length}개 Draft를 삭제했습니다.`)
    } catch {
      toast.error('일괄 삭제에 실패했습니다.')
    } finally {
      setIsBulkRunning(false)
    }
  }

  return (
    <main className="container-shell py-8">
      <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Writer Hub</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Post Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              클릭하면 포스트를 바로 보고, Edit로 수정하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/studio/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </Link>
            <Link href="/studio">
              <Button variant="outline">
                <FilePenLine className="h-4 w-4" />
                Open Studio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="포스트 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="포스트 검색…"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {selectedIds.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
            <p className="px-2 text-sm">{selectedIds.length}개 선택됨</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkUnpublish} disabled={isBulkRunning}>
                {isBulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bulk Unpublish'}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isBulkRunning}>
                {isBulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bulk Delete'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={isAllVisibleSelected}
            onChange={(event) => toggleAllVisible(event.target.checked)}
            aria-label="현재 목록 전체 선택"
            className="h-4 w-4"
          />
          <span className="text-muted-foreground">현재 목록 전체 선택</span>
        </div>

        <div className="space-y-2">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const isSelected = selectedSet.has(post.id)
              const isBusy = rowLoadingId === post.id
              return (
                <article
                  key={post.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-3 transition hover:border-primary/40 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => toggleSelection(post.id, event.target.checked)}
                    aria-label={`${post.title || 'Untitled'} 선택`}
                    className="h-4 w-4"
                  />

                  <button
                    type="button"
                    onClick={() => openPost(post)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <p className="line-clamp-1 font-medium">{post.title || 'Untitled'}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          post.published
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-muted'
                        }`}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                      <span>{formatRelativeTime(post.updated_at)}</span>
                      {post.has_pending_changes ? (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">Pending update</span>
                      ) : null}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">클릭해서 편집</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {workspace && post.published ? (
                      <Link href={`/blog/${workspace.slug}/${post.slug}`} target="_blank">
                        <Button size="sm" variant="outline">
                          Public
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : null}
                    {post.published ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUnpublish(post.id)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unpublish'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDelete(post.id)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                      </Button>
                    )}
                  </div>
                </article>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              검색된 포스트가 없습니다.
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
