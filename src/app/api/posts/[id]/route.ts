import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isLegacyJsonTypeError, isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'
import type { PostgrestError } from '@supabase/supabase-js'

type SaveMode = 'direct' | 'draft_update'

type PostWithPending = {
  id: string
  title: string
  content_markdown: string
  published: boolean
  published_at: string | null
  has_pending_changes?: boolean | null
  pending_title?: string | null
  pending_content_markdown?: string | null
  pending_updated_at?: string | null
}

function errorResponse(error: PostgrestError) {
  console.error('[api/posts/:id] database error', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  })

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
    { status: 500 },
  )
}

function normalizePostForEditor(post: Record<string, unknown>) {
  const hasPending = Boolean(post.has_pending_changes)
  const pendingTitle = typeof post.pending_title === 'string' ? post.pending_title : null
  const pendingContent = typeof post.pending_content_markdown === 'string' ? post.pending_content_markdown : null
  const liveTitle = typeof post.title === 'string' ? post.title : ''
  const liveContent = typeof post.content_markdown === 'string' ? post.content_markdown : ''

  return {
    ...post,
    live_title: liveTitle,
    live_content_markdown: liveContent,
    title: hasPending ? (pendingTitle ?? liveTitle) : liveTitle,
    content_markdown: hasPending ? (pendingContent ?? liveContent) : liveContent,
    has_pending_changes: hasPending,
    pending_title: pendingTitle,
    pending_content_markdown: pendingContent,
  }
}

async function loadPostForOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  authorId: string,
) {
  const withPending = await supabase
    .from('posts')
    .select('id, workspace_id, author_id, title, slug, content_markdown, cover_image_url, published, published_at, created_at, updated_at, has_pending_changes, pending_title, pending_content_markdown, pending_updated_at')
    .eq('id', id)
    .eq('author_id', authorId)
    .maybeSingle()

  if (!withPending.error) {
    return { data: withPending.data, supportsPending: true as const }
  }

  if (!isMissingColumnError(withPending.error, 'has_pending_changes')) {
    return { error: withPending.error }
  }

  const withoutPending = await supabase
    .from('posts')
    .select('id, workspace_id, author_id, title, slug, content_markdown, cover_image_url, published, published_at, created_at, updated_at')
    .eq('id', id)
    .eq('author_id', authorId)
    .maybeSingle()

  if (withoutPending.error) {
    return { error: withoutPending.error }
  }

  return {
    data: withoutPending.data
      ? {
        ...withoutPending.data,
        has_pending_changes: false,
        pending_title: null,
        pending_content_markdown: null,
        pending_updated_at: null,
      }
      : null,
    supportsPending: false as const,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const markdownQuery = await loadPostForOwner(supabase, id, user.id)

  if (!('error' in markdownQuery) && markdownQuery.data) {
    return NextResponse.json(normalizePostForEditor(markdownQuery.data as Record<string, unknown>))
  }

  if (!('error' in markdownQuery) && !markdownQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if ('error' in markdownQuery && markdownQuery.error && !isMissingColumnError(markdownQuery.error, 'content_markdown')) {
    return errorResponse(markdownQuery.error)
  }

  const legacyQuery = await supabase
    .from('posts')
    .select('id, workspace_id, author_id, title, slug, content, cover_image_url, published, published_at, created_at, updated_at')
    .eq('id', id)
    .eq('author_id', user.id)
    .maybeSingle()

  if (legacyQuery.error) {
    return errorResponse(legacyQuery.error)
  }

  if (!legacyQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...legacyQuery.data,
    content_markdown: legacyContentToMarkdown(legacyQuery.data.content),
    has_pending_changes: false,
    pending_title: null,
    pending_content_markdown: null,
    pending_updated_at: null,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json()
  const nowIso = new Date().toISOString()
  const contentMarkdown = typeof json.content_markdown === 'string' ? json.content_markdown : ''
  const saveMode: SaveMode = json.save_mode === 'draft_update' ? 'draft_update' : 'direct'

  const targetQuery = await loadPostForOwner(supabase, id, user.id)
  if ('error' in targetQuery) {
    if (targetQuery.error && !isMissingColumnError(targetQuery.error, 'content_markdown')) {
      return errorResponse(targetQuery.error)
    }
  } else {
    if (!targetQuery.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const target = targetQuery.data as PostWithPending

    if (saveMode === 'draft_update') {
      if (!target.published) {
        return NextResponse.json({ error: 'Draft update mode is only supported for published posts' }, { status: 400 })
      }
      if (!targetQuery.supportsPending) {
        return NextResponse.json({ error: 'Pending update columns are not available. Run DB migration first.' }, { status: 400 })
      }

      const pendingUpdate = await supabase
        .from('posts')
        .update({
          pending_title: json.title,
          pending_content_markdown: contentMarkdown,
          has_pending_changes: true,
          pending_updated_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('author_id', user.id)
        .select('id')
        .maybeSingle()

      if (pendingUpdate.error) {
        return errorResponse(pendingUpdate.error)
      }

      if (!pendingUpdate.data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, save_mode: 'draft_update' })
    }

    const updateData: Record<string, unknown> = {
      title: json.title,
      content_markdown: contentMarkdown,
      published: json.published,
      updated_at: nowIso,
      has_pending_changes: false,
      pending_title: null,
      pending_content_markdown: null,
      pending_updated_at: null,
    }

    if (json.published === true) {
      updateData.published_at = json.published_at ?? target.published_at ?? nowIso
    }

    if (json.published === false) {
      updateData.published_at = null
    }

    const markdownUpdate = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()

    if (!markdownUpdate.error && markdownUpdate.data) {
      return NextResponse.json({ success: true, save_mode: 'direct' })
    }

    if (!markdownUpdate.error && !markdownUpdate.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (markdownUpdate.error && !isMissingColumnError(markdownUpdate.error, 'content_markdown')) {
      return errorResponse(markdownUpdate.error)
    }
  }

  const legacyUpdateData: Record<string, unknown> = {
    title: json.title,
    content: contentMarkdown,
    published: json.published,
    updated_at: nowIso,
  }

  if (json.published === true) {
    legacyUpdateData.published_at = json.published_at ?? nowIso
  }

  if (json.published === false) {
    legacyUpdateData.published_at = null
  }

  let legacyUpdate = await supabase
    .from('posts')
    .update(legacyUpdateData)
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle()

  if (legacyUpdate.error && isLegacyJsonTypeError(legacyUpdate.error)) {
    legacyUpdate = await supabase
      .from('posts')
      .update({
        ...legacyUpdateData,
        content: JSON.stringify(contentMarkdown),
      })
      .eq('id', id)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()
  }

  if (legacyUpdate.error) {
    return errorResponse(legacyUpdate.error)
  }

  if (!legacyUpdate.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, save_mode: 'direct' })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json()
  const action = typeof json.action === 'string' ? json.action : ''
  const nowIso = new Date().toISOString()

  if (action === 'unpublish') {
    const updateResult = await supabase
      .from('posts')
      .update({
        published: false,
        published_at: null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()

    if (updateResult.error) {
      return errorResponse(updateResult.error)
    }

    if (!updateResult.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  }

  if (action !== 'publish_pending' && action !== 'discard_pending') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  const targetQuery = await loadPostForOwner(supabase, id, user.id)
  if ('error' in targetQuery && targetQuery.error) {
    return errorResponse(targetQuery.error)
  }

  if (!targetQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!targetQuery.supportsPending) {
    return NextResponse.json({ error: 'Pending update columns are not available. Run DB migration first.' }, { status: 400 })
  }

  const target = targetQuery.data as PostWithPending

  if (!target.has_pending_changes) {
    return NextResponse.json({ error: 'No pending update found' }, { status: 400 })
  }

  if (action === 'discard_pending') {
    const discardResult = await supabase
      .from('posts')
      .update({
        has_pending_changes: false,
        pending_title: null,
        pending_content_markdown: null,
        pending_updated_at: null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()

    if (discardResult.error) {
      return errorResponse(discardResult.error)
    }

    if (!discardResult.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, action })
  }

  const publishPendingResult = await supabase
    .from('posts')
    .update({
      title: target.pending_title ?? target.title,
      content_markdown: target.pending_content_markdown ?? target.content_markdown,
      has_pending_changes: false,
      pending_title: null,
      pending_content_markdown: null,
      pending_updated_at: null,
      published: true,
      published_at: target.published_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle()

  if (publishPendingResult.error) {
    return errorResponse(publishPendingResult.error)
  }

  if (!publishPendingResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, action })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetResult = await supabase
    .from('posts')
    .select('id, published')
    .eq('id', id)
    .eq('author_id', user.id)
    .maybeSingle()

  if (targetResult.error) {
    return errorResponse(targetResult.error)
  }

  if (!targetResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (targetResult.data.published) {
    return NextResponse.json(
      { error: 'Published posts must be unpublished before deletion' },
      { status: 400 },
    )
  }

  const deleteResult = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('published', false)
    .select('id')
    .maybeSingle()

  if (deleteResult.error) {
    return errorResponse(deleteResult.error)
  }

  if (!deleteResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
