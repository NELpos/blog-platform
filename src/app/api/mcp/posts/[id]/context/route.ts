import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isMissingColumnError, legacyContentToMarkdown } from '@/lib/markdown/legacy'
import { authenticateMcpRequest, parseBearerToken } from '@/lib/mcp/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const hasBearerToken = Boolean(parseBearerToken(request))

  let ownerId: string | null = null
  if (hasBearerToken) {
    const mcpAuth = await authenticateMcpRequest(request)
    if (!mcpAuth.ok) {
      return NextResponse.json({ error: mcpAuth.error }, { status: mcpAuth.status })
    }
    ownerId = mcpAuth.actor.userId
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    ownerId = user.id
  }

  const markdownQuery = await supabase
    .from('posts')
    .select('id, title, content_markdown, updated_at, workspace:workspaces(slug), author_id')
    .eq('id', id)
    .eq('author_id', ownerId)
    .maybeSingle()

  if (!markdownQuery.error && markdownQuery.data) {
    const workspace = Array.isArray(markdownQuery.data.workspace) ? markdownQuery.data.workspace[0] : markdownQuery.data.workspace

    return NextResponse.json({
      post_id: markdownQuery.data.id,
      workspace_slug: workspace?.slug ?? null,
      title: markdownQuery.data.title,
      content_markdown: markdownQuery.data.content_markdown,
      updated_at: markdownQuery.data.updated_at,
    })
  }

  if (!markdownQuery.error && !markdownQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (markdownQuery.error && !isMissingColumnError(markdownQuery.error, 'content_markdown')) {
    return NextResponse.json({ error: markdownQuery.error.message }, { status: 500 })
  }

  const legacyQuery = await supabase
    .from('posts')
    .select('id, title, content, updated_at, workspace:workspaces(slug), author_id')
    .eq('id', id)
    .eq('author_id', ownerId)
    .maybeSingle()

  if (legacyQuery.error) {
    return NextResponse.json({ error: legacyQuery.error.message }, { status: 500 })
  }

  if (!legacyQuery.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const workspace = Array.isArray(legacyQuery.data.workspace) ? legacyQuery.data.workspace[0] : legacyQuery.data.workspace

  return NextResponse.json({
    post_id: legacyQuery.data.id,
    workspace_slug: workspace?.slug ?? null,
    title: legacyQuery.data.title,
    content_markdown: legacyContentToMarkdown(legacyQuery.data.content),
    updated_at: legacyQuery.data.updated_at,
  })
}
