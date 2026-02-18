'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, ExternalLink, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type DashboardPost = {
  id: string
  title: string
  slug: string
  published: boolean
  published_at: string | null
  published_version_id?: string | null
  updated_at: string
}

interface DashboardPostIndexProps {
  workspace: {
    name: string
    slug: string
  } | null
  initialPosts: DashboardPost[]
}

const PAGE_SIZE = 20
const STATUS_OPTIONS: Array<{
  value: 'all' | 'published' | 'draft'
  label: string
}> = [
  { value: 'all', label: '전체' },
  { value: 'published', label: '게시됨' },
  { value: 'draft', label: '미게시' },
]

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkRunning, setIsBulkRunning] = useState(false)
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return posts.filter((post) => {
      if (statusFilter === 'published' && !post.published) return false
      if (statusFilter === 'draft' && post.published) return false
      if (!normalized) return true
      const haystack = `${post.title || 'untitled'} ${post.slug || ''}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [posts, query, statusFilter])
  const selectedStatusLabel = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? '전체',
    [statusFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (!isSelectionMode) {
      setSelectedIds([])
    }
  }, [isSelectionMode])

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredPosts.slice(start, start + PAGE_SIZE)
  }, [filteredPosts, currentPage])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allVisibleIds = paginatedPosts.map((post) => post.id)
  const isAllVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedSet.has(id))
  const selectedPosts = useMemo(
    () => posts.filter((post) => selectedSet.has(post.id)),
    [posts, selectedSet],
  )
  const selectedPublishedCount = useMemo(
    () => selectedPosts.filter((post) => post.published).length,
    [selectedPosts],
  )
  const selectedDraftCount = selectedPosts.length - selectedPublishedCount
  const canBulkUnpublish = selectedPublishedCount > 0 && !isBulkRunning
  const canBulkDelete = selectedDraftCount > 0 && selectedPublishedCount === 0 && !isBulkRunning

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
    router.push(`/studio?post=${post.id}&mode=preview`)
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
    const confirmed = window.confirm('이 임시글을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')
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
      toast.success('임시글을 삭제했습니다.')
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
      setSelectedIds((current) =>
        current.filter((id) => !affectedIds.includes(id)),
      )
      toast.success(`${affectedIds.length}개 포스트를 비공개로 전환했습니다.`)
    } catch {
      toast.error('일괄 비공개 전환에 실패했습니다.')
    } finally {
      setIsBulkRunning(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (selectedPosts.some((post) => post.published)) {
      toast.error('Published 포스트가 포함되어 있습니다. 먼저 비공개 전환 후 삭제하세요.')
      return
    }

    const confirmed = window.confirm(`${selectedIds.length}개 임시글을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`)
    if (!confirmed) return

    setIsBulkRunning(true)
    try {
      const response = await fetch('/api/posts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: selectedIds }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error ?? 'bulk delete failed')
      }

      const payload = await response.json() as { affected_ids?: string[] }
      const affectedIds = payload.affected_ids ?? []
      if (affectedIds.length === 0) {
        throw new Error('삭제된 포스트가 없습니다. 새로고침 후 다시 시도해주세요.')
      }
      removePosts(affectedIds)
      toast.success(`${affectedIds.length}개 임시글을 삭제했습니다.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '일괄 삭제에 실패했습니다.'
      toast.error(message)
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
              포스트를 클릭하면 바로 View로 이동합니다. 수정은 Studio의 편집 탭에서 진행하세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/studio/new">
              <Button>
                <Plus className="h-4 w-4" />
                새 포스트
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="mb-4 flex h-11 items-center overflow-hidden rounded-md border border-border">
          <Search className="ml-3 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="포스트 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="포스트 검색…"
            className="h-full border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
          />
          <span className="h-6 w-px bg-border" />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="게시 상태 필터"
                className="inline-flex h-full min-w-[120px] items-center justify-between px-3 text-sm transition-colors hover:bg-muted/40 data-[state=open]:bg-muted/40"
              >
                <span>{selectedStatusLabel}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[140px] rounded-md border border-border bg-card p-1 text-foreground shadow-md backdrop-blur-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenu.Item
                    key={option.value}
                    onSelect={() => setStatusFilter(option.value)}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        statusFilter === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span>{option.label}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          총 {posts.length}개 · 조건 일치 {filteredPosts.length}개 · {currentPage}/{totalPages} 페이지
        </p>

        <div className="mb-3 flex justify-end">
          <Button
            size="sm"
            variant={isSelectionMode ? 'default' : 'outline'}
            onClick={() => setIsSelectionMode((current) => !current)}
          >
            {isSelectionMode ? '선택 종료' : '선택 모드'}
          </Button>
        </div>

        {isSelectionMode && selectedIds.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2">
            <div className="px-2 text-sm">
              <p>
                {selectedIds.length}개 선택됨 · 임시글 {selectedDraftCount} · 게시됨 {selectedPublishedCount}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                실행 가능: 비공개 전환 {selectedPublishedCount}개 · 삭제 {selectedPublishedCount > 0 ? 0 : selectedDraftCount}개
              </p>
              {selectedPublishedCount > 0 ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Published 포스트가 포함되어 있으면 Bulk Delete는 비활성화됩니다.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkUnpublish}
                disabled={!canBulkUnpublish}
                title={selectedPublishedCount === 0 ? '선택된 Published 포스트가 없습니다.' : undefined}
              >
                {isBulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : '일괄 비공개'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={!canBulkDelete}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                title={
                  selectedPublishedCount > 0
                    ? 'Published 포스트가 포함되어 있어 삭제할 수 없습니다.'
                    : selectedDraftCount === 0
                      ? '삭제 가능한 임시글이 없습니다.'
                      : undefined
                }
              >
                {isBulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : '일괄 삭제'}
              </Button>
            </div>
          </div>
        ) : null}

        {isSelectionMode ? (
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
        ) : null}

        <div className="space-y-2">
          {paginatedPosts.length > 0 ? (
            paginatedPosts.map((post) => {
              const isSelected = selectedSet.has(post.id)
              const isBusy = rowLoadingId === post.id
              return (
                <article
                  key={post.id}
                  role={isSelectionMode ? undefined : 'button'}
                  tabIndex={isSelectionMode ? -1 : 0}
                  onClick={() => {
                    if (isSelectionMode) return
                    openPost(post)
                  }}
                  onKeyDown={(event) => {
                    if (isSelectionMode) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openPost(post)
                    }
                  }}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-3 transition ${
                    isSelectionMode
                      ? 'bg-card'
                      : 'cursor-pointer hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  {isSelectionMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => toggleSelection(post.id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`${post.title || 'Untitled'} 선택`}
                      className="h-4 w-4"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1 text-left">
                    <p className="line-clamp-1 font-medium">{post.title || 'Untitled'}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          post.published
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-muted'
                        }`}
                      >
                        {post.published ? '게시됨' : '임시글'}
                      </span>
                      <span>{formatRelativeTime(post.updated_at)}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                        {isSelectionMode ? '선택 모드' : '클릭해서 보기'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                    {isSelectionMode ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPost(post)}
                      >
                        열기
                      </Button>
                    ) : null}
                    {workspace && post.published ? (
                      <Link href={`/blog/${workspace.slug}/${post.slug}`} target="_blank">
                        <Button size="sm" variant="outline">
                          공개 보기
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
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : '비공개 전환'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDelete(post.id)}
                        disabled={isBusy}
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
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

        {filteredPosts.length > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            <span className="min-w-20 text-center text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
