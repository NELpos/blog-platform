'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, EyeOff, Keyboard, Loader2, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import PostViewer from '@/components/blog/PostViewer'
import UserNavMenu from '@/components/auth/UserNavMenu'

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
  published_version_id?: string | null
  versions?: PostVersion[]
  published: boolean
  published_at: string | null
  updated_at: string
}

type PostVersion = {
  id: string
  version_number: number
  title: string
  content_markdown: string
  created_at: string
}

interface PostStudioProps {
  workspace: {
    name: string
    slug: string
  } | null
  initialPosts: StudioPost[]
  viewer: {
    displayName: string
    avatarUrl: string | null
    email: string | null
  }
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type StudioMode = 'edit' | 'preview'
type SavedSnapshot = { title: string; content: string }

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

export default function PostStudio({ workspace, initialPosts, viewer }: PostStudioProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<StudioPost[]>(initialPosts)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(initialPosts[0]?.id ?? null)
  const [mode, setMode] = useState<StudioMode>('edit')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isPublishingVersionId, setIsPublishingVersionId] = useState<string | null>(null)
  const [selectedPublishVersionId, setSelectedPublishVersionId] = useState<string>('')
  const [isPublishVersionMenuOpen, setIsPublishVersionMenuOpen] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [isDeletingPost, setIsDeletingPost] = useState(false)
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
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, SavedSnapshot>>({})
  const [draftTitle, setDraftTitle] = useState(initialPosts[0]?.title ?? '')
  const [isDraftDirty, setIsDraftDirty] = useState(false)
  const latestDraftTitleRef = useRef('')
  const latestDraftContentRef = useRef('')
  const hasLocalDraftChangesRef = useRef(false)
  const hydratedPostIdsRef = useRef<Set<string>>(new Set())
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

  const selectedSnapshot = useMemo(
    () => (selectedPostId ? savedSnapshots[selectedPostId] ?? null : null),
    [savedSnapshots, selectedPostId],
  )

  const hasSelectedUnsavedChanges = isDraftDirty

  const selectedVersions = useMemo(
    () => [...(selectedPost?.versions ?? [])].sort((a, b) => b.version_number - a.version_number),
    [selectedPost],
  )

  const selectedPublishVersion = useMemo(
    () => selectedVersions.find((version) => version.id === selectedPublishVersionId) ?? null,
    [selectedPublishVersionId, selectedVersions],
  )

  const publishedVersion = useMemo(
    () => selectedVersions.find((version) => version.id === selectedPost?.published_version_id) ?? null,
    [selectedPost?.published_version_id, selectedVersions],
  )

  const previewTitle = useMemo(() => {
    if (!selectedPost) return 'Untitled'
    if (!selectedPost.published) {
      return selectedPost.title || 'Untitled'
    }
    return selectedPublishVersion?.title ?? selectedPost.live_title ?? selectedPost.title ?? 'Untitled'
  }, [selectedPost, selectedPublishVersion?.title])

  const previewContentMarkdown = useMemo(() => {
    if (!selectedPost) return ''
    if (!selectedPost.published) {
      return selectedPost.content_markdown ?? ''
    }
    return selectedPublishVersion?.content_markdown
      ?? selectedPost.live_content_markdown
      ?? selectedPost.content_markdown
      ?? ''
  }, [selectedPost, selectedPublishVersion?.content_markdown])

  const previewVersionStatus = useMemo(() => {
    const currentLabel = selectedPublishVersion ? `v${selectedPublishVersion.version_number}` : '최신 Draft'
    const publishLabel = selectedPost?.published && publishedVersion ? `v${publishedVersion.version_number}` : null

    if (!publishLabel) {
      return `현재 비공개 · 현재 버전 ${currentLabel}`
    }

    if (selectedPublishVersion && publishedVersion) {
      if (selectedPublishVersion.version_number === publishedVersion.version_number) {
        return '게시중'
      }

      if (selectedPublishVersion.version_number > publishedVersion.version_number) {
        return `현재 버전 ${currentLabel} (미게시) · Publish 버전 ${publishLabel}`
      }
    }

    return `현재 버전 ${currentLabel} · Publish 버전 ${publishLabel}`
  }, [publishedVersion, selectedPost?.published, selectedPublishVersion])

  const setSavedSnapshot = useCallback((postId: string, title: string, content: string) => {
    setSavedSnapshots((current) => {
      const previous = current[postId]
      if (previous && previous.title === title && previous.content === content) {
        return current
      }
      return {
        ...current,
        [postId]: { title, content },
      }
    })
  }, [])

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
    if (!selectedPost) return
    latestDraftTitleRef.current = selectedPost.title
    latestDraftContentRef.current = toContentString(selectedPost.content_markdown)
    setDraftTitle(selectedPost.title)
    setIsDraftDirty(false)
    hasLocalDraftChangesRef.current = false
  }, [selectedPost])

  useEffect(() => {
    if (!selectedPostId || !selectedSnapshot) return
    const isDirty = (
      latestDraftTitleRef.current !== selectedSnapshot.title
      || latestDraftContentRef.current !== selectedSnapshot.content
    )
    setIsDraftDirty(isDirty)
  }, [selectedPostId, selectedSnapshot])

  useEffect(() => {
    const defaultVersionId = selectedVersions[0]?.id ?? ''
    if (!defaultVersionId) {
      setSelectedPublishVersionId('')
      return
    }
    if (!selectedPublishVersionId || !selectedVersions.some((version) => version.id === selectedPublishVersionId)) {
      setSelectedPublishVersionId(defaultVersionId)
    }
  }, [selectedPublishVersionId, selectedVersions])

  useEffect(() => {
    if (!selectedPostId) return
    const selected = selectedPost
    if (!selected) return
    const wasHydrated = hydratedPostIdsRef.current.has(selectedPostId)
    if (wasHydrated && selected.content_markdown !== null) {
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
                ...(hasLocalDraftChangesRef.current
                  ? {
                    title: latestDraftTitleRef.current,
                    content_markdown: latestDraftContentRef.current,
                  }
                  : {
                    title: loadedPost.title ?? post.title,
                    content_markdown: loadedPost.content_markdown ?? '',
                  }),
                live_title: loadedPost.live_title ?? loadedPost.title ?? post.title,
                live_content_markdown: loadedPost.live_content_markdown ?? loadedPost.content_markdown ?? post.content_markdown ?? '',
                versions: Array.isArray(loadedPost.versions) ? loadedPost.versions as PostVersion[] : (post.versions ?? []),
                published_version_id: typeof loadedPost.published_version_id === 'string' ? loadedPost.published_version_id : (loadedPost.published_version_id === null ? null : (post.published_version_id ?? null)),
                slug: loadedPost.slug ?? post.slug,
                published: loadedPost.published ?? post.published,
                published_at: loadedPost.published_at ?? post.published_at,
                updated_at: loadedPost.updated_at ?? post.updated_at,
              }
              : post,
          ),
        )
        hydratedPostIdsRef.current.add(selectedPostId)
        setSavedSnapshot(
          selectedPostId,
          loadedPost.title ?? selected.title,
          toContentString(loadedPost.content_markdown ?? selected.content_markdown),
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
  }, [contentFetchNonce, selectedPost, selectedPostId, setSavedSnapshot])

  useEffect(() => {
    if (!selectedPostId || !selectedPost) return
    if (selectedPost.content_markdown === null) return
    if (savedSnapshots[selectedPostId]) return
    setSavedSnapshot(
      selectedPostId,
      selectedPost.title,
      toContentString(selectedPost.content_markdown),
    )
  }, [savedSnapshots, selectedPost, selectedPostId, setSavedSnapshot])

  useEffect(() => {
    if (!selectedPost) return
    if (saveStatus === 'saving' || saveStatus === 'error') return
    setSaveStatus(hasSelectedUnsavedChanges ? 'idle' : 'saved')
  }, [hasSelectedUnsavedChanges, saveStatus, selectedPost])

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

  const handleSavePost = useCallback(async (
    options: { switchToPreview?: boolean; silent?: boolean } = {},
  ) => {
    const { switchToPreview = false, silent = false } = options
    if (!selectedPostId || !selectedPost) return { success: false as const, versionId: null as string | null }
    const currentTitle = latestDraftTitleRef.current
    const currentContent = latestDraftContentRef.current
    const hasUnsavedNow = selectedSnapshot
      ? (currentTitle !== selectedSnapshot.title || currentContent !== selectedSnapshot.content)
      : (currentTitle !== selectedPost.title || currentContent !== toContentString(selectedPost.content_markdown))

    if (!hasUnsavedNow) {
      if (switchToPreview) setMode('preview')
      if (!silent) toast.info('변경된 내용이 없습니다.')
      return { success: true as const, versionId: selectedPublishVersionId || null }
    }

    setSaveStatus('saving')
    try {
      const now = new Date().toISOString()
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          content_markdown: currentContent,
        }),
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }
      const payload = (await response.json()) as {
        version?: {
          id: string
          version_number: number
          title: string
          content_markdown: string
          created_at: string
        } | null
        warning?: string
      }

      setSaveStatus('saved')
      setIsDraftDirty(false)
      hasLocalDraftChangesRef.current = false
      setLastSavedAt(now)
      setSavedSnapshot(
        selectedPostId,
        currentTitle,
        currentContent,
      )
      setDraftTitle(currentTitle)
      setPosts((current) =>
        current.map((post) => {
          if (post.id !== selectedPostId) return post
          const nextVersions = post.versions ?? []
          const returnedVersion = payload.version
          const mergedVersions = returnedVersion
            ? [
              {
                id: returnedVersion.id,
                version_number: returnedVersion.version_number,
                title: returnedVersion.title,
                content_markdown: returnedVersion.content_markdown,
                created_at: returnedVersion.created_at,
              },
              ...nextVersions.filter((version) => version.id !== returnedVersion.id),
            ].sort((a, b) => b.version_number - a.version_number)
            : nextVersions

          return {
            ...post,
            title: currentTitle,
            content_markdown: currentContent,
            updated_at: now,
            versions: mergedVersions,
          }
        }),
      )
      if (payload.version?.id) {
        setSelectedPublishVersionId(payload.version.id)
      }
      if (switchToPreview) {
        setMode('preview')
      }
      if (payload.warning) {
        toast.warning(payload.warning)
      }
      if (!silent) toast.success('Draft를 저장했습니다.')
      return { success: true as const, versionId: payload.version?.id ?? null }
    } catch (error) {
      setSaveStatus('error')
      const message = error instanceof Error ? error.message : '저장에 실패했습니다.'
      toast.error(message)
      return { success: false as const, versionId: null as string | null }
    }
  }, [selectedPost, selectedPostId, selectedPublishVersionId, selectedSnapshot, setSavedSnapshot])

  const handlePublishVersion = async (versionId: string) => {
    if (!selectedPostId || !selectedPost) return
    let publishVersionId = versionId
    if (saveStatus === 'idle') {
      const saveResult = await handleSavePost({ switchToPreview: false, silent: true })
      if (!saveResult.success) return
      if (saveResult.versionId) {
        publishVersionId = saveResult.versionId
      }
    }

    setIsPublishingVersionId(publishVersionId)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_version',
          ...(publishVersionId ? { version_id: publishVersionId } : {}),
        }),
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
              published_version_id: loadedPost.published_version_id ?? post.published_version_id ?? null,
              versions: Array.isArray(loadedPost.versions) ? loadedPost.versions as PostVersion[] : (post.versions ?? []),
              published: loadedPost.published ?? true,
              published_at: loadedPost.published_at ?? new Date().toISOString(),
              updated_at: loadedPost.updated_at ?? new Date().toISOString(),
            }
            : post,
        ),
      )
      setSaveStatus('saved')
      setSelectedPublishVersionId(loadedPost.published_version_id ?? publishVersionId)
      toast.success('선택한 버전을 배포했습니다.')
    } catch (error) {
      const message = error instanceof Error ? error.message : '버전 배포에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsPublishingVersionId(null)
    }
  }

  const handleSelectPost = useCallback(async (nextPostId: string) => {
    if (!nextPostId || nextPostId === selectedPostId) return

    if (saveStatus === 'saving') {
      toast.info('저장 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    if (saveStatus === 'idle') {
      const shouldDiscard = window.confirm('저장되지 않은 변경사항이 있습니다. 저장하지 않고 이동하시겠습니까?')
      if (!shouldDiscard) {
        return
      }
      if (selectedPostId && selectedSnapshot) {
        latestDraftTitleRef.current = selectedSnapshot.title
        latestDraftContentRef.current = selectedSnapshot.content
        setDraftTitle(selectedSnapshot.title)
      }
      setSaveStatus('saved')
      setIsDraftDirty(false)
    }

    setSelectedPostId(nextPostId)
    setMode('preview')
    setIsCommandOpen(false)
    setCommandQuery('')
  }, [saveStatus, selectedPostId, selectedSnapshot])

  const handleTitleChange = (value: string) => {
    if (!selectedPostId) return
    if (saveStatus !== 'idle') setSaveStatus('idle')
    setDraftTitle(value)
    latestDraftTitleRef.current = value
    hasLocalDraftChangesRef.current = true
    const snapshot = savedSnapshots[selectedPostId]
    if (!snapshot) {
      setIsDraftDirty(true)
      return
    }
    const isDirty = (
      value !== snapshot.title
      || latestDraftContentRef.current !== snapshot.content
    )
    setIsDraftDirty(isDirty)
  }

  const handleContentChange = (nextContentMarkdown: string) => {
    if (!selectedPostId) return
    if (saveStatus !== 'idle') setSaveStatus('idle')
    latestDraftContentRef.current = nextContentMarkdown
    hasLocalDraftChangesRef.current = true
    const snapshot = savedSnapshots[selectedPostId]
    if (!snapshot) {
      setIsDraftDirty(true)
      return
    }
    const isDirty = (
      latestDraftTitleRef.current !== snapshot.title
      || nextContentMarkdown !== snapshot.content
    )
    setIsDraftDirty(isDirty)
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
            ? { ...post, published: false, published_at: null, published_version_id: null, updated_at: now }
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

  const handleDeletePost = async () => {
    if (!selectedPostId || !selectedPost) return
    if (selectedPost.published) {
      window.alert('게시 중인 포스트는 먼저 게시 해제 후 삭제할 수 있습니다.')
      return
    }

    const shouldDelete = window.confirm('이 포스트를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')
    if (!shouldDelete) return

    setIsDeletingPost(true)
    try {
      const response = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await readApiError(response))
      }

      toast.success('포스트를 삭제했습니다.')
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : '삭제에 실패했습니다.'
      toast.error(message)
    } finally {
      setIsDeletingPost(false)
    }
  }


  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewContentMarkdown)
      toast.success('마크다운을 복사했습니다.')
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }, [previewContentMarkdown])

  useEffect(() => {
    if (mode !== 'edit') return
    if (!selectedPostId) return

      const handleSaveShortcut = (event: globalThis.KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey
      if (!hasModifier) return

      const key = event.key.toLowerCase()
      if (key !== 's' && key !== 'enter') return

      event.preventDefault()
      if (saveStatus === 'saving' || isContentLoading || !hasSelectedUnsavedChanges) return
      void handleSavePost()
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => {
      window.removeEventListener('keydown', handleSaveShortcut)
    }
  }, [handleSavePost, hasSelectedUnsavedChanges, isContentLoading, mode, saveStatus, selectedPostId])

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
    if (saveStatus === 'idle') return '저장 필요'
    if (lastSavedAt) return `저장 완료 (${formatRelativeTime(lastSavedAt)})`
    return '변경사항 없음'
  }, [lastSavedAt, saveStatus])

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
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      if (!confirmDiscardIfNeeded()) return
                      router.push('/dashboard')
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard
                  </Button>
                  {mode === 'preview' && selectedPost ? (
                    <>
                      <DropdownMenu.Root open={isPublishVersionMenuOpen} onOpenChange={setIsPublishVersionMenuOpen}>
                        <DropdownMenu.Trigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={selectedVersions.length === 0}
                            aria-label="게시할 버전 선택"
                          >
                            {selectedPublishVersion
                              ? `v${selectedPublishVersion.version_number} · ${formatRelativeTime(selectedPublishVersion.created_at)}`
                              : '최신 Draft 게시'}
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            sideOffset={6}
                            align="end"
                            className="z-[95] min-w-[220px] rounded-md border border-border bg-card p-1 shadow-xl"
                          >
                            {selectedVersions.map((version) => {
                              const isSelected = version.id === selectedPublishVersionId
                              return (
                                <DropdownMenu.Item
                                  key={version.id}
                                  onSelect={() => setSelectedPublishVersionId(version.id)}
                                  className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted"
                                >
                                  <span>
                                    v{version.version_number} · {formatRelativeTime(version.created_at)}
                                    {selectedPost.published && selectedPost.published_version_id === version.id ? ' · 공개중' : ''}
                                  </span>
                                  {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                                </DropdownMenu.Item>
                              )
                            })}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => void handlePublishVersion(selectedPublishVersionId)}
                        disabled={isPublishingVersionId === selectedPublishVersionId}
                      >
                        {isPublishingVersionId === selectedPublishVersionId
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : '게시'}
                      </Button>
                      {selectedPost.published ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => void handleUnpublish()}
                          disabled={isUnpublishing}
                        >
                          {isUnpublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                          게시 해제
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-3 text-xs"
                        onClick={() => void handleDeletePost()}
                        disabled={isDeletingPost}
                      >
                        {isDeletingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        삭제
                      </Button>
                      {workspace && selectedPost.published ? (
                        <Link href={`/blog/${workspace.slug}/${selectedPost.slug}`} target="_blank">
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                            Public View
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      ) : null}
                    </>
                  ) : null}
                  {mode === 'edit' ? (
                    <>
                      <span
                        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground"
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
                          className="h-8 px-3 text-xs"
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
                    </>
                  ) : null}

                  <UserNavMenu displayName={viewer.displayName} avatarUrl={viewer.avatarUrl} email={viewer.email} />
                </div>
              </header>

              {mode === 'edit' ? (
                <div className="space-y-4 p-4 md:p-6">
                  <label htmlFor="studio-title" className="sr-only">
                    Post title
                  </label>
                  <Input
                    id="studio-title"
                    value={draftTitle}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Post title…"
                    className="h-12 text-2xl font-semibold"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2">
                    <div className="px-2 text-xs text-muted-foreground">
                      <p>편집 모드: Draft 작성과 저장에 집중하세요. 배포/배포중지는 뷰에서 진행합니다.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleSavePost()}
                        disabled={saveStatus === 'saving' || isContentLoading || !hasSelectedUnsavedChanges}
                      >
                        {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
                      </Button>
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
                  <div className="space-y-2 border-b border-border pb-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">
                          {previewTitle}
                        </h2>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{previewVersionStatus}</p>
                          <p>
                            {selectedPost.published
                              ? `마지막 게시: ${selectedPost.published_at ? formatRelativeTime(selectedPost.published_at) : '방금'}`
                              : '현재 비공개 상태'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => void handleCopyMarkdown()}
                        disabled={!previewContentMarkdown}
                      >
                        <Copy className="h-4 w-4" />
                        복사
                      </Button>
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
                    <PostViewer contentMarkdown={previewContentMarkdown} />
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
              <span>저장되지 않은 변경사항이 있으면 이동 전에 확인합니다.</span>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
