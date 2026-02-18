import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isLegacyJsonTypeError, isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'
import type { PostgrestError } from '@supabase/supabase-js'

type PostRow = {
  id: string
  workspace_id: string
  author_id: string
  title: string
  slug: string
  content_markdown: string
  live_title: string | null
  live_content_markdown: string | null
  cover_image_url: string | null
  published: boolean
  published_at: string | null
  published_version_id: string | null
  created_at: string
  updated_at: string
}

type PostVersionRow = {
  id: string
  post_id: string
  version_number: number
  title: string
  content_markdown: string
  created_at: string
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

function normalizePostForEditor(post: Record<string, unknown>, versions: PostVersionRow[]) {
  const draftTitle = typeof post.title === 'string' ? post.title : ''
  const rawDraftContent = typeof post.content_markdown === 'string' ? post.content_markdown : ''
  const liveTitle = typeof post.live_title === 'string' && post.live_title.trim()
    ? post.live_title
    : draftTitle
  const liveContent = typeof post.live_content_markdown === 'string' && post.live_content_markdown.length > 0
    ? post.live_content_markdown
    : rawDraftContent
  const latestVersion = versions[0] ?? null
  const fallbackContent = latestVersion?.content_markdown ?? liveContent
  const draftContent = rawDraftContent.length > 0 ? rawDraftContent : fallbackContent

  return {
    ...post,
    title: draftTitle,
    content_markdown: draftContent,
    live_title: liveTitle,
    live_content_markdown: liveContent,
    versions,
  }
}

function isMissingVersionInfraError(error: PostgrestError | null): boolean {
  if (!error) return false
  if (error.code === '42P01' && error.message.toLowerCase().includes('post_versions')) return true
  if (isMissingColumnError(error, 'live_title')) return true
  if (isMissingColumnError(error, 'live_content_markdown')) return true
  if (isMissingColumnError(error, 'published_version_id')) return true
  if (isMissingColumnError(error, 'version_number')) return true
  return false
}

async function loadPostForOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  authorId: string,
) {
  const withLive = await supabase
    .from('posts')
    .select('id, workspace_id, author_id, title, slug, content_markdown, live_title, live_content_markdown, cover_image_url, published, published_at, published_version_id, created_at, updated_at')
    .eq('id', id)
    .eq('author_id', authorId)
    .maybeSingle()

  if (!withLive.error) {
    return { data: withLive.data, supportsVersionWorkflow: true as const }
  }

  if (
    !isMissingColumnError(withLive.error, 'live_title')
    && !isMissingColumnError(withLive.error, 'live_content_markdown')
    && !isMissingColumnError(withLive.error, 'published_version_id')
  ) {
    return { error: withLive.error }
  }

  const withoutLive = await supabase
    .from('posts')
    .select('id, workspace_id, author_id, title, slug, content_markdown, cover_image_url, published, published_at, created_at, updated_at')
    .eq('id', id)
    .eq('author_id', authorId)
    .maybeSingle()

  if (withoutLive.error) {
    return { error: withoutLive.error }
  }

  if (!withoutLive.data) {
    return { data: null, supportsVersionWorkflow: false as const }
  }

  return {
    data: {
      ...withoutLive.data,
      live_title: withoutLive.data.title,
      live_content_markdown: withoutLive.data.content_markdown,
      published_version_id: null,
    },
    supportsVersionWorkflow: false as const,
  }
}

async function loadVersionsForPost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  authorId: string,
): Promise<{ data: PostVersionRow[]; error: PostgrestError | null; supported: boolean }> {
  const versionsQuery = await supabase
    .from('post_versions')
    .select('id, post_id, version_number, title, content_markdown, created_at')
    .eq('post_id', postId)
    .eq('author_id', authorId)
    .order('version_number', { ascending: false })
    .limit(30)

  if (versionsQuery.error) {
    if (isMissingVersionInfraError(versionsQuery.error)) {
      return { data: [], error: null, supported: false }
    }
    return { data: [], error: versionsQuery.error, supported: true }
  }

  return { data: versionsQuery.data ?? [], error: null, supported: true }
}

async function createOrReuseVersionForPublish(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: PostRow,
  title: string,
  contentMarkdown: string,
) {
  const latestVersion = await supabase
    .from('post_versions')
    .select('id, version_number, title, content_markdown, created_at')
    .eq('post_id', target.id)
    .eq('author_id', target.author_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestVersion.error) {
    return { error: latestVersion.error }
  }

  const latest = latestVersion.data
  const hasNoChange = Boolean(
    latest
      && latest.title === title
      && latest.content_markdown === contentMarkdown,
  )

  if (hasNoChange) {
    const stableLatest = latest as NonNullable<typeof latest>
    return {
      data: {
        id: stableLatest.id,
        version_number: stableLatest.version_number,
        created_at: stableLatest.created_at,
      },
    }
  }

  const nextVersion = Number(latest?.version_number ?? 0) + 1
  const inserted = await supabase
    .from('post_versions')
    .insert({
      post_id: target.id,
      workspace_id: target.workspace_id,
      author_id: target.author_id,
      version_number: nextVersion,
      title,
      content_markdown: contentMarkdown,
    })
    .select('id, version_number, created_at')
    .single()

  if (inserted.error) {
    return { error: inserted.error }
  }

  return { data: inserted.data }
}

async function saveDraftIntoVersionLineage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: PostRow,
  title: string,
  contentMarkdown: string,
) {
  const latestVersion = await supabase
    .from('post_versions')
    .select('id, version_number, title, content_markdown, created_at')
    .eq('post_id', target.id)
    .eq('author_id', target.author_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestVersion.error) {
    return { error: latestVersion.error }
  }

  const latest = latestVersion.data
  if (!latest) {
    const inserted = await supabase
      .from('post_versions')
      .insert({
        post_id: target.id,
        workspace_id: target.workspace_id,
        author_id: target.author_id,
        version_number: 1,
        title,
        content_markdown: contentMarkdown,
      })
      .select('id, version_number, title, content_markdown, created_at')
      .single()

    if (inserted.error) return { error: inserted.error }
    return { data: inserted.data }
  }

  const latestIsPublished = target.published_version_id === latest.id
  const latestUnchanged = latest.title === title && latest.content_markdown === contentMarkdown

  if (latestIsPublished) {
    if (latestUnchanged) {
      return { data: latest }
    }

    const inserted = await supabase
      .from('post_versions')
      .insert({
        post_id: target.id,
        workspace_id: target.workspace_id,
        author_id: target.author_id,
        version_number: latest.version_number + 1,
        title,
        content_markdown: contentMarkdown,
      })
      .select('id, version_number, title, content_markdown, created_at')
      .single()

    if (inserted.error) return { error: inserted.error }
    return { data: inserted.data }
  }

  if (latestUnchanged) {
    return { data: latest }
  }

  const updated = await supabase
    .from('post_versions')
    .update({
      title,
      content_markdown: contentMarkdown,
    })
    .eq('id', latest.id)
    .eq('author_id', target.author_id)
    .select('id, version_number, title, content_markdown, created_at')
    .maybeSingle()

  if (updated.error) return { error: updated.error }
  if (!updated.data) {
    // If the latest row disappeared or became non-updatable between read and update,
    // create a new draft version instead of surfacing a noisy warning.
    const inserted = await supabase
      .from('post_versions')
      .insert({
        post_id: target.id,
        workspace_id: target.workspace_id,
        author_id: target.author_id,
        version_number: latest.version_number + 1,
        title,
        content_markdown: contentMarkdown,
      })
      .select('id, version_number, title, content_markdown, created_at')
      .single()

    if (inserted.error) return { error: inserted.error }
    return { data: inserted.data }
  }

  return { data: updated.data }
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

  const postQuery = await loadPostForOwner(supabase, id, user.id)

  if (!('error' in postQuery) && postQuery.data) {
    const versions = await loadVersionsForPost(supabase, id, user.id)
    if (versions.error) return errorResponse(versions.error)
    return NextResponse.json(normalizePostForEditor(postQuery.data as Record<string, unknown>, versions.data))
  }

  if (!('error' in postQuery) && !postQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if ('error' in postQuery && postQuery.error && !isMissingColumnError(postQuery.error, 'content_markdown')) {
    return errorResponse(postQuery.error)
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
    live_title: legacyQuery.data.title,
    live_content_markdown: legacyContentToMarkdown(legacyQuery.data.content),
    published_version_id: null,
    versions: [],
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
  const title = typeof json.title === 'string' ? json.title : 'Untitled Post'
  const contentMarkdown = typeof json.content_markdown === 'string' ? json.content_markdown : ''

  const targetQuery = await loadPostForOwner(supabase, id, user.id)
  if ('error' in targetQuery) {
    if (targetQuery.error && !isMissingColumnError(targetQuery.error, 'content_markdown')) {
      return errorResponse(targetQuery.error)
    }
  } else {
    if (!targetQuery.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!targetQuery.supportsVersionWorkflow) {
      const updateResult = await supabase
        .from('posts')
        .update({
          title,
          content_markdown: contentMarkdown,
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

      return NextResponse.json({ success: true, version: null, workflow: 'legacy' })
    }

    const target = targetQuery.data as PostRow

    const updateResult = await supabase
      .from('posts')
      .update({
        title,
        content_markdown: contentMarkdown,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('author_id', user.id)
      .select('id')
      .maybeSingle()

    if (updateResult.error || !updateResult.data) {
      if (updateResult.error) {
        return errorResponse(updateResult.error)
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const versionResult = await saveDraftIntoVersionLineage(
      supabase,
      target,
      title,
      contentMarkdown,
    )

    if (versionResult.error) {
      console.error('[api/posts/:id] version sync warning after draft save', {
        code: versionResult.error.code,
        message: versionResult.error.message,
        details: versionResult.error.details,
        hint: versionResult.error.hint,
      })

      const warning = isMissingVersionInfraError(versionResult.error)
        ? 'Draft is saved, but version history is unavailable. Run DB migration.'
        : 'Draft is saved, but version history sync failed.'

      return NextResponse.json({
        success: true,
        version: null,
        workflow: 'versioned',
        warning,
      })
    }

    return NextResponse.json({
      success: true,
      version: versionResult.data
        ? {
          id: versionResult.data.id,
          version_number: versionResult.data.version_number,
          title: versionResult.data.title,
          content_markdown: versionResult.data.content_markdown,
          created_at: versionResult.data.created_at,
        }
        : null,
      workflow: 'versioned',
    })
  }

  const legacyUpdateData: Record<string, unknown> = {
    title,
    content: contentMarkdown,
    updated_at: nowIso,
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

  return NextResponse.json({ success: true, version: null, workflow: 'legacy' })
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

  if (action !== 'publish_version') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  const targetQuery = await loadPostForOwner(supabase, id, user.id)
  if ('error' in targetQuery && targetQuery.error) {
    return errorResponse(targetQuery.error)
  }

  if (!targetQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!targetQuery.supportsVersionWorkflow) {
    return NextResponse.json(
      { error: 'Version workflow columns are not available. Run DB migration first.' },
      { status: 400 },
    )
  }

  const requestedVersionId = typeof json.version_id === 'string' ? json.version_id : null
  let versionForPublish: {
    id: string
    title: string
    content_markdown: string
    version_number: number
    created_at: string
  } | null = null

  if (requestedVersionId) {
    const versionResult = await supabase
      .from('post_versions')
      .select('id, post_id, title, content_markdown, version_number, created_at')
      .eq('post_id', id)
      .eq('author_id', user.id)
      .eq('id', requestedVersionId)
      .maybeSingle()

    if (versionResult.error) {
      if (isMissingVersionInfraError(versionResult.error)) {
        return NextResponse.json(
          { error: 'Version workflow table is not available. Run DB migration first.' },
          { status: 400 },
        )
      }
      return errorResponse(versionResult.error)
    }

    if (!versionResult.data) {
      return NextResponse.json({ error: 'Target version not found' }, { status: 404 })
    }

    versionForPublish = versionResult.data
  } else {
    const targetPost = targetQuery.data as PostRow
    const nextVersionResult = await createOrReuseVersionForPublish(
      supabase,
      targetPost,
      targetPost.title,
      targetPost.content_markdown,
    )

    if (nextVersionResult.error) {
      if (isMissingVersionInfraError(nextVersionResult.error)) {
        return NextResponse.json(
          { error: 'Version workflow table is not available. Run DB migration first.' },
          { status: 400 },
        )
      }
      return errorResponse(nextVersionResult.error)
    }

    versionForPublish = {
      id: nextVersionResult.data.id,
      title: targetPost.title,
      content_markdown: targetPost.content_markdown,
      version_number: nextVersionResult.data.version_number,
      created_at: nextVersionResult.data.created_at,
    }
  }

  const publishResult = await supabase
    .from('posts')
    .update({
      published: true,
      published_at: nowIso,
      published_version_id: versionForPublish.id,
      live_title: versionForPublish.title,
      live_content_markdown: versionForPublish.content_markdown,
      updated_at: nowIso,
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .maybeSingle()

  if (publishResult.error) {
    return errorResponse(publishResult.error)
  }

  if (!publishResult.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    action,
    published_version: {
      id: versionForPublish.id,
      version_number: versionForPublish.version_number,
      created_at: versionForPublish.created_at,
    },
  })
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

  if (targetResult.data.published === true) {
    return NextResponse.json(
      { error: 'Published posts must be unpublished before deletion' },
      { status: 400 },
    )
  }

  const deleteVersions = await supabase
    .from('post_versions')
    .delete()
    .eq('post_id', id)
    .eq('author_id', user.id)

  if (deleteVersions.error && !isMissingVersionInfraError(deleteVersions.error)) {
    return errorResponse(deleteVersions.error)
  }

  const deleteResult = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)
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
