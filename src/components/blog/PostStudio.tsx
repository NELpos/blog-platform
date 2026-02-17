'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check, ExternalLink, EyeOff, Keyboard, Loader2, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import PostViewer from '@/components/blog/PostViewer'

const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-lg bg-muted" />,
})

type StudioPost = {
  id: string
  title: string
  slug: string
  content_markdown: string | null
  live_title?: string | null
  live_content_markdown?: string | null
  published: boolean
  published_at: string | null
  has_pending_changes?: boolean | null
  pending_title?: string | null
  pending_content_markdown?: string | null
  pending_updated_at?: string | null
  updated_at: string
}

interface PostStudioProps {
  workspace: {
    name: string
    slug: string
  } | null
  initialPosts: StudioPost[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type StudioMode = 'edit' | 'preview'

type ApiErrorPayload = {
  error?: string
  code?: string
  details?: string | null
}

function toContentString(content: string | null | undefined) {
  return content ?? ''
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    const summary = payload.error || `Request failed (${response.status})`
    const meta = [payload.code, payload.details].filter(Boolean).join(' ')
    return meta ? `${summary} - ${meta}` : summary
  } catch {
    return `Request failed (${response.status})`
  }
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

export default function PostStudio({ workspace, initialPosts }: PostStudioProps) {
  const DRAFT_STORAGE_PREFIX = 'post-studio:draft:'
  const [posts, setPosts] = useState<StudioPost[]>(initialPosts)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPosts[0]?.id ?? null)
  const [mode, setMode] = useState<StudioMode>('edit')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublishingPending, setIsPublishingPending] = useState(false)
  const [isDiscardingPending, setIsDiscardingPending] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [isDeletingDraft, setIsDeletingDraft] = useState(false)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [activeCommandIndex, setActiveCommandIndex] = useState(0)
  const [isMacLike, setIsMacLike] = useState(false)
  const [isSearchStateHydrated, setIsSearchStateHydrated] = useState(false)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [contentLoadError, setContentLoadError] = useState<string | null>(null)
  const [contentFetchNonce, setContentFetchNonce] = useState(0)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null)
  const draftRestoredPostRef = useRef<string | null>(null)
  const shortcutPopoverRef = useRef<HTMLDivElement | null>(null)
  const commandInputRef = useRef<HTMLInputElement | null>(null)

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  )

  const commandFilteredPosts = useMemo(() => {
    const normalized = commandQuery.trim().toLowerCase()
    if (!normalized) return posts
    return posts.filter((post) => (post.title || 'untitled').toLowerCase().includes(normalized))
  }, [commandQuery, posts])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextMode: StudioMode = params.get('mode') === 'preview' ? 'preview' : 'edit'
    const nextPostId = params.get('post')

    setMode(nextMode)
    if (nextPostId && initialPosts.some((post) => post.id === nextPostId)) {
      setSelectedPostId(nextPostId)
    }
    setIsSearchStateHydrated(true)
  }, [initialPosts])

  useEffect(() => {
    setIsMacLike(window.navigator.platform.toLowerCase().includes('mac'))
  }, [])

  useEffect(() => {
    if (!selectedPostId) return
    if (posts.some((post) => post.id === selectedPostId)) return
    setSelectedPostId(posts[0]?.id ?? null)
  }, [posts, selectedPostId])

  useEffect(() => {
    if (!selectedPostId) return
    const selected = posts.find((post) => post.id === selectedPostId)
    if (!selected) return
    if (selected.content_markdown !== null) {
      setContentLoadError(null)
      setIsContentLoading(false)
      return
    }

    let cancelled = false
    setIsContentLoading(true)
    setContentLoadError(null)

    const loadSelectedPostContent = async () => {
      try {
        const response = await fetch(`/api/posts/${selectedPostId}`)
        if (!response.ok) {
          throw new Error('load failed')
        }

        const loadedPost = (await response.json()) as Partial<StudioPost>
        if (cancelled) return

        setPosts((current) =>
          current.map((post) =>
            post.id === selectedPostId
              ? {
                ...post,
                content_markdown: loadedPost.content_markdown ?? '',
                live_title: loadedPost.live_title ?? loadedPost.title ?? post.title,
                live_content_markdown: loadedPost.live_content_markdown ?? loadedPost.content_markdown ?? post.content_markdown ?? '',
                title: loadedPost.title ?? post.title,
                slug: loadedPost.slug ?? post.slug,
                published: loadedPost.published ?? post.published,
                published_at: loadedPost.published_at ?? post.published_at,
                has_pending_changes: loadedPost.has_pending_changes ?? false,
                pending_title: loadedPost.pending_title ?? null,
                pending_content_markdown: loadedPost.pending_content_markdown ?? null,
                pending_updated_at: loadedPost.pending_updated_at ?? null,
                updated_at: loadedPost.updated_at ?? post.updated_at,
              }
              : post,
          ),
        )
      } catch {
        if (cancelled) return
        setContentLoadError('포스트 본문을 불러오지 못했습니다.')
        toast.error('포스트 본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        if (!cancelled) {
          setIsContentLoading(false)
        }
      }
    }

    loadSelectedPostContent()

    return () => {
      cancelled = true
    }
  }, [contentFetchNonce, posts, selectedPostId])

  useEffect(() => {
    if (!selectedPostId) return
    const selected = posts.find((post) => post.id === selectedPostId)
    if (!selected) return
    if (draftRestoredPostRef.current === selectedPostId) return
    draftRestoredPostRef.current = selectedPostId

    const draftRaw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${selectedPostId}`)
    if (!draftRaw) return

    try {
      const draft = JSON.parse(draftRaw) as Partial<StudioPost> & { saved_at?: string }
      const nextTitle = typeof draft.title === 'string' ? draft.title : selected.title
      const nextContent = typeof draft.content_markdown === 'string'
        ? draft.content_markdown
        : toContentString(selected.content_markdown)
      const nextPublished = typeof draft.published === 'boolean' ? draft.published : selected.published
      const hasMeaningfulDiff = nextTitle !== selected.title || nextContent !== toContentString(selected.content_markdown)
      if (!hasMeaningfulDiff) return

      const shouldRestore = window.confirm('로컬에 저장된 자동 Draft가 있습니다. 복원하시겠습니까?')
      if (!shouldRestore) return

      const now = new Date().toISOString()
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPostId
            ? { ...post, title: nextTitle, content_markdown: nextContent, published: nextPublished, updated_at: now }
            : post,
        ),
      )
      setMode('edit')
      setSaveStatus('idle')
      setLastDraftSavedAt(draft.saved_at ?? now)
      toast.success('로컬 Draft를 복원했습니다.')
    } catch {
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedPostId}`)
    }
  }, [posts, selectedPostId])

  useEffect(() => {
    if (!isSearchStateHydrated) return
    const params = new URLSearchParams(window.location.search)

    if (selectedPostId) {
      params.set('post', selectedPostId)
    } else {
      params.delete('post')
    }

    params.set('mode', mode)

    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname
    if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [isSearchStateHydrated, selectedPostId, mode])

  useEffect(() => {
    if (saveStatus !== 'idle') return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveStatus])

  const confirmDiscardIfNeeded = () => {
    if (saveStatus !== 'idle') return true
    return window.confirm('저장되지 않은 변경사항이 있습니다. 이동하시겠습니까?')
  }

  const saveDraftToLocal = (postId: string, title: string, contentMarkdown: string, published: boolean) => {
    const savedAt = new Date().toISOString()
    window.localStorage.setItem(
      `${DRAFT_STORAGE_PREFIX}${postId}`,
      JSON.stringify({
        title,
        content_markdown: contentMarkdown,
        published,
        saved_at: savedAt,
      }),
    )
    setLastDraftSavedAt(savedAt)
  }

  const handleSavePost = useCallback(async (
    options: { switchToPreview?: boolean; silent?: boolean; saveMode?: 'direct' | 'draft_update' } = {},
  ) => {
    const { switchToPreview = true, silent = false, saveMode } = options
    if (!selectedPostId || !selectedPost) return false

    setSaveStatus('saving')
    try {
      const now = new Date().toISOString()
      const resolvedSaveMode =
        saveMode ?? (selectedPost.published ? 'draft_update' : 'direct')
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedPost.title,
          content_markdown: toContentString(selectedPost.content_markdown),
          published: selectedPost.published,
          save_mode: resolvedSaveMode,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      setSaveStatus('saved')
      setLastSavedAt(now)
      setLastDraftSavedAt(null)
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedPostId}`)
      if (selectedPost.published && resolvedSaveMode === 'draft_update') {
        setPosts((current) =>
          current.map((post) =>
            post.id === selectedPostId
              ? {
                ...post,
                has_pending_changes: true,
                pending_title: post.title,
                pending_content_markdown: post.content_markdown ?? '',
                pending_updated_at: now,
                updated_at: now,
              }
              : post,
          ),
        )
      } else {
        setPosts((current) =>
          current.map((post) =>
            post.id === selectedPostId
              ? {
                ...post,
                live_title: post.title,
                live_content_markdown: post.content_markdown ?? '',
                has_pending_changes: false,
                pending_title: null,
                pending_content_markdown: null,
                pending_updated_at: null,
                updated_at: now,
              }
              : post,
          ),
        )
      }
      if (switchToPreview) {
        setMode('preview')
      }
      if (!silent) {
        if (selectedPost.published && resolvedSaveMode === 'draft_update') {
          toast.success('수정안을 Draft Update로 저장했습니다.')
        } else {
          toast.success('포스트를 저장했습니다.')
        }
      }
      return true
    } catch (error) {
      setSaveStatus('error')
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.'
      toast.error(message)
      return false
    }
  }, [DRAFT_STORAGE_PREFIX, selectedPost, selectedPostId])

  const handlePublishPendingUpdate = async () => {
    if (!selectedPostId) return
    setIsPublishingPending(true)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_pending' }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const refreshed = await fetch(`/api/posts/${selectedPostId}`)
      if (!refreshed.ok) {
        throw new Error('refresh failed')
      }
      const loadedPost = (await refreshed.json()) as Partial<StudioPost>

      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPostId
            ? {
              ...post,
              title: loadedPost.title ?? post.title,
              content_markdown: loadedPost.content_markdown ?? post.content_markdown ?? '',
              live_title: loadedPost.live_title ?? loadedPost.title ?? post.title,
              live_content_markdown: loadedPost.live_content_markdown ?? loadedPost.content_markdown ?? post.content_markdown ?? '',
              has_pending_changes: false,
              pending_title: null,
              pending_content_markdown: null,
              pending_updated_at: null,
              updated_at: loadedPost.updated_at ?? new Date().toISOString(),
            }
            : post,
        ),
      )
      setSaveStatus('saved')
      toast.success('Pending update를 반영했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pending update 반영에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsPublishingPending(false)
    }
  }

  const handleDiscardPendingUpdate = async () => {
    if (!selectedPostId) return
    setIsDiscardingPending(true)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discard_pending' }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const refreshed = await fetch(`/api/posts/${selectedPostId}`)
      if (!refreshed.ok) {
        throw new Error('refresh failed')
      }
      const loadedPost = (await refreshed.json()) as Partial<StudioPost>

      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPostId
            ? {
              ...post,
              title: loadedPost.title ?? post.title,
              content_markdown: loadedPost.content_markdown ?? post.content_markdown ?? '',
              live_title: loadedPost.live_title ?? loadedPost.title ?? post.title,
              live_content_markdown: loadedPost.live_content_markdown ?? loadedPost.content_markdown ?? post.content_markdown ?? '',
              has_pending_changes: false,
              pending_title: null,
              pending_content_markdown: null,
              pending_updated_at: null,
              updated_at: loadedPost.updated_at ?? new Date().toISOString(),
            }
            : post,
        ),
      )
      setSaveStatus('saved')
      toast.success('Pending update를 폐기했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pending update 폐기에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsDiscardingPending(false)
    }
  }

  const handleSelectPost = useCallback(async (nextPostId: string) => {
    if (!nextPostId || nextPostId === selectedPostId) return

    if (saveStatus === 'saving') {
      toast.info('저장 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    if (saveStatus === 'idle') {
      const saved = await handleSavePost({ switchToPreview: false, silent: true })
      if (!saved) {
        toast.error('현재 포스트 저장에 실패하여 이동을 취소했습니다.')
        return
      }
    }

    setSelectedPostId(nextPostId)
    setMode('preview')
    setIsCommandOpen(false)
    setCommandQuery('')
  }, [handleSavePost, saveStatus, selectedPostId])

  const handleTitleChange = (value: string) => {
    if (!selectedPostId) return
    const now = new Date().toISOString()
    setSaveStatus('idle')

    setPosts((current) =>
      current.map((post) => {
        if (post.id !== selectedPostId) return post
        return { ...post, title: value, updated_at: now }
      }),
    )
  }

  const handleContentChange = (nextContentMarkdown: string) => {
    if (!selectedPostId) return
    const now = new Date().toISOString()
    setSaveStatus('idle')

    setPosts((current) =>
      current.map((post) => {
        if (post.id !== selectedPostId) return post
        return { ...post, content_markdown: nextContentMarkdown, updated_at: now }
      }),
    )
  }

  const handlePublish = async () => {
    if (!selectedPost || selectedPost.published) return
    setIsPublishing(true)
    try {
      const publishedAt = new Date().toISOString()
      const response = await fetch(`/api/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedPost.title,
          content_markdown: selectedPost.content_markdown ?? '',
          published: true,
          published_at: publishedAt,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPost.id
            ? { ...post, published: true, published_at: publishedAt, updated_at: publishedAt }
            : post,
        ),
      )
      setSaveStatus('saved')
      setLastSavedAt(publishedAt)
      setLastDraftSavedAt(null)
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${selectedPost.id}`)
      toast.success('포스트를 발행했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : '발행에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!selectedPostId || !selectedPost || !selectedPost.published) return
    const shouldUnpublish = window.confirm('이 글을 게시 해제하시겠습니까? Public View에서 더 이상 보이지 않습니다.')
    if (!shouldUnpublish) return

    setIsUnpublishing(true)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const now = new Date().toISOString()
      setPosts((current) =>
        current.map((post) =>
          post.id === selectedPostId
            ? { ...post, published: false, published_at: null, updated_at: now }
            : post,
        ),
      )
      setSaveStatus('saved')
      setLastSavedAt(now)
      toast.success('포스트를 게시 해제했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : '게시 해제에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsUnpublishing(false)
    }
  }

  const handleDeleteDraftPost = async () => {
    if (!selectedPostId || !selectedPost || selectedPost.published) return
    const shouldDelete = window.confirm('Draft 포스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    if (!shouldDelete) return

    setIsDeletingDraft(true)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      const removedPostId = selectedPostId
      let nextSelectedId: string | null = null
      setPosts((current) => {
        const nextPosts = current.filter((post) => post.id !== removedPostId)
        nextSelectedId = nextPosts[0]?.id ?? null
        return nextPosts
      })
      setSelectedPostId(nextSelectedId)
      setSaveStatus('saved')
      setLastSavedAt(null)
      setLastDraftSavedAt(null)
      window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${removedPostId}`)
      toast.success('Draft 포스트를 삭제했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : '포스트 삭제에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsDeletingDraft(false)
    }
  }

  useEffect(() => {
    if (mode !== 'edit') return
    if (!selectedPostId || !selectedPost) return

    const timer = window.setTimeout(() => {
      if (saveStatus !== 'idle') return
      saveDraftToLocal(
        selectedPostId,
        selectedPost.title,
        toContentString(selectedPost.content_markdown),
        selectedPost.published,
      )
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [mode, saveStatus, selectedPost, selectedPostId])

  useEffect(() => {
    if (mode !== 'edit') return
    if (!selectedPostId) return

    const handleSaveShortcut = (event: globalThis.KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey
      if (!hasModifier) return

      const key = event.key.toLowerCase()
      if (key !== 's' && key !== 'enter') return

      event.preventDefault()
      if (saveStatus === 'saving' || isContentLoading) return
      void handleSavePost()
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => {
      window.removeEventListener('keydown', handleSaveShortcut)
    }
  }, [handleSavePost, isContentLoading, mode, saveStatus, selectedPostId])

  useEffect(() => {
    const handlePaletteShortcut = (event: globalThis.KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey
      if (!hasModifier) return
      if (event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setIsCommandOpen((current) => !current)
    }

    window.addEventListener('keydown', handlePaletteShortcut)
    return () => {
      window.removeEventListener('keydown', handlePaletteShortcut)
    }
  }, [])

  useEffect(() => {
    if (!isCommandOpen) return
    setActiveCommandIndex(0)
    const timer = window.setTimeout(() => {
      commandInputRef.current?.focus()
    }, 20)

    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsCommandOpen(false)
      }
    }

    window.addEventListener('keydown', handleEsc)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isCommandOpen])

  useEffect(() => {
    if (!isShortcutHelpOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!shortcutPopoverRef.current) return
      if (shortcutPopoverRef.current.contains(event.target as Node)) return
      setIsShortcutHelpOpen(false)
    }

    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShortcutHelpOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isShortcutHelpOpen])

  const saveStatusLabel = useMemo(() => {
    if (saveStatus === 'saving') return '저장 중'
    if (saveStatus === 'error') return '저장 실패'
    if (saveStatus === 'idle') {
      if (lastDraftSavedAt) return `임시 저장됨 (${formatRelativeTime(lastDraftSavedAt)})`
      return '저장 필요'
    }
    if (lastSavedAt) return `저장 완료 (${formatRelativeTime(lastSavedAt)})`
    return '변경사항 없음'
  }, [lastDraftSavedAt, lastSavedAt, saveStatus])

  return (
    <main id="main-content" className="container-shell py-8">
      <section className="space-y-4">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {selectedPost ? (
            <>
              <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
                <div className="inline-flex items-center rounded-md border border-border p-1">
                  <Button
                    size="sm"
                    variant={mode === 'edit' ? 'default' : 'ghost'}
                    onClick={() => setMode('edit')}
                  >
                    편집
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === 'preview' ? 'default' : 'ghost'}
                    onClick={() => {
                      if (!confirmDiscardIfNeeded()) return
                      setMode('preview')
                    }}
                  >
                    뷰
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {saveStatus === 'saved' ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> {saveStatusLabel}
                      </span>
                    ) : (
                      saveStatusLabel
                    )}
                  </span>

                  <div className="relative" ref={shortcutPopoverRef}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsShortcutHelpOpen((current) => !current)}
                      aria-expanded={isShortcutHelpOpen}
                      aria-haspopup="dialog"
                    >
                      <Keyboard className="h-4 w-4" />
                      Shortcuts
                    </Button>
                    {isShortcutHelpOpen ? (
                      <div className="absolute right-0 top-10 z-[80] w-80 rounded-xl border border-border bg-card p-3 shadow-xl">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">KEYBOARD SHORTCUTS</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span>Quick open posts</span>
                            <span className="inline-flex items-center gap-1">
                              <Kbd>{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                              <Kbd>K</Kbd>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Save post</span>
                            <span className="inline-flex items-center gap-1">
                              <Kbd>{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                              <Kbd>Enter</Kbd>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Quick save</span>
                            <span className="inline-flex items-center gap-1">
                              <Kbd>{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                              <Kbd>S</Kbd>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Paste image</span>
                            <span className="inline-flex items-center gap-1">
                              <Kbd>{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                              <Kbd>V</Kbd>
                            </span>
                          </div>
                          <div className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                            포스트 이동은 단축키 <Kbd className="ml-1">{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                            <Kbd className="ml-1">K</Kbd> 로 사용합니다.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </header>

              {mode === 'edit' ? (
                <div className="space-y-4 p-4 md:p-6">
                  <label htmlFor="studio-title" className="sr-only">
                    Post title
                  </label>
                  <Input
                    id="studio-title"
                    value={selectedPost.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Post title…"
                    className="h-12 text-2xl font-semibold"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2">
                    <div className="px-2 text-xs text-muted-foreground">
                      {selectedPost.published ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>편집 모드: 작성에 집중하고 저장하세요. 발행/반영 관리는 뷰에서 진행합니다.</span>
                          {selectedPost.has_pending_changes ? (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">반영 대기 중인 수정안 있음</span>
                          ) : null}
                        </div>
                      ) : (
                        <p>편집 모드: 내용 작성 후 저장하세요. 발행/삭제는 뷰에서 진행합니다.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPost.published ? (
                        <Button
                          size="sm"
                          onClick={() => void handleSavePost({ saveMode: 'draft_update', switchToPreview: false })}
                          disabled={saveStatus === 'saving' || isContentLoading}
                        >
                          {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : '수정안 저장'}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => void handleSavePost()} disabled={saveStatus === 'saving' || isContentLoading}>
                          {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isContentLoading ? (
                    <div className="flex h-[500px] items-center justify-center rounded-lg border border-border bg-muted/30">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        포스트 본문을 불러오는 중...
                      </span>
                    </div>
                  ) : contentLoadError ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      <p>{contentLoadError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setContentFetchNonce((current) => current + 1)}
                      >
                        다시 시도
                      </Button>
                    </div>
                  ) : (
                    <MarkdownEditor
                      key={selectedPost.id}
                      initialContent={toContentString(selectedPost.content_markdown)}
                      onChange={handleContentChange}
                    />
                  )}
                </div>
              ) : (
                <article className="space-y-6 p-4 md:p-8">
                  <div className="space-y-4 border-b border-border pb-5">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold tracking-tight">
                        {selectedPost.title || 'Untitled'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedPost.published && selectedPost.published_at
                          ? `Published ${formatRelativeTime(selectedPost.published_at)}`
                          : '아직 발행되지 않은 Draft입니다.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPost.published ? (
                        <>
                          <span className="inline-flex h-8 items-center rounded-md border border-emerald-400/50 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                            <Check className="mr-1 h-3.5 w-3.5" />
                            게시됨
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleSavePost({ saveMode: 'direct', switchToPreview: false })}
                            disabled={saveStatus === 'saving' || isContentLoading}
                          >
                            {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장 후 즉시 반영'}
                          </Button>
                          {selectedPost.has_pending_changes ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handlePublishPendingUpdate()}
                                disabled={isPublishingPending}
                              >
                                {isPublishingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '수정안 반영'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDiscardPendingUpdate()}
                                disabled={isDiscardingPending}
                              >
                                {isDiscardingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '수정안 폐기'}
                              </Button>
                            </>
                          ) : null}
                          <Button size="sm" variant="outline" onClick={() => void handleUnpublish()} disabled={isUnpublishing}>
                            {isUnpublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                            게시 해제
                          </Button>
                          {workspace ? (
                            <Link href={`/blog/${workspace.slug}/${selectedPost.slug}`} target="_blank">
                              <Button variant="outline" size="sm">
                                Public View
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground">
                            Draft
                          </span>
                          <Button onClick={handlePublish} disabled={isPublishing || isContentLoading} size="sm">
                            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : '발행'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void handleDeleteDraftPost()} disabled={isDeletingDraft}>
                            {isDeletingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isContentLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-muted/20">
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        포스트 본문을 불러오는 중...
                      </span>
                    </div>
                  ) : contentLoadError ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      <p>{contentLoadError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setContentFetchNonce((current) => current + 1)}
                      >
                        다시 시도
                      </Button>
                    </div>
                  ) : (
                    <PostViewer contentMarkdown={selectedPost.content_markdown ?? ''} />
                  )}
                </article>
              )}
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
              <div>
                <p className="text-lg font-semibold">포스트를 선택하세요</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  단축키 <Kbd className="mx-1">{isMacLike ? 'Cmd' : 'Ctrl'}</Kbd>
                  <Kbd className="mr-1">K</Kbd>로 포스트를 선택하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {isCommandOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/55 p-4 pt-20 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Post quick open"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCommandOpen(false)
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="border-b border-border p-3">
              <div className="flex items-center gap-2 rounded-md border border-border px-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  ref={commandInputRef}
                  aria-label="포스트 빠른 이동 검색"
                  value={commandQuery}
                  onChange={(event) => setCommandQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (commandFilteredPosts.length === 0) {
                      if (event.key === 'Escape') setIsCommandOpen(false)
                      return
                    }

                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      setActiveCommandIndex((current) => (current + 1) % commandFilteredPosts.length)
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      setActiveCommandIndex((current) => (current - 1 + commandFilteredPosts.length) % commandFilteredPosts.length)
                    } else if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleSelectPost(commandFilteredPosts[activeCommandIndex].id)
                    } else if (event.key === 'Escape') {
                      setIsCommandOpen(false)
                    }
                  }}
                  placeholder="포스트 제목으로 빠르게 이동..."
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-2">
              {commandFilteredPosts.length > 0 ? (
                commandFilteredPosts.map((post, index) => {
                  const isActive = post.id === selectedPostId
                  const isFocused = index === activeCommandIndex
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => void handleSelectPost(post.id)}
                      className={`mb-1 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                        isFocused
                          ? 'border-primary/40 bg-primary/10'
                          : isActive
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-transparent hover:border-border hover:bg-muted/50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{post.title || 'Untitled'}</span>
                        <span className="mt-0.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`rounded-full px-2 py-0.5 ${post.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-muted'}`}>
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                          <span>{formatRelativeTime(post.updated_at)}</span>
                        </span>
                      </span>
                      {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
                    </button>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>↑ ↓ 이동 · Enter 선택 · Esc 닫기</span>
              <span>이동 전 현재 글을 자동 저장합니다.</span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
