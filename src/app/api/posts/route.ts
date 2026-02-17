import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isLegacyJsonTypeError, isMissingColumnError } from '@/lib/markdown/legacy'
import type { PostgrestError } from '@supabase/supabase-js'

function slugifyTitle(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'post'
}

function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length)
}

function errorResponse(error: PostgrestError) {
  console.error('[api/posts] database error', {
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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
  }

  const json = await request.json()
  const title = json.title || 'Untitled Post'
  const slugBase = slugifyTitle(String(title))
  const contentMarkdown = typeof json.content_markdown === 'string' ? json.content_markdown : ''

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = `${slugBase}-${randomSuffix()}`

    const markdownInsert = await supabase
      .from('posts')
      .insert({
        workspace_id: workspace.id,
        author_id: user.id,
        title,
        slug,
        content_markdown: contentMarkdown,
        published: false,
      })
      .select()
      .single()

    if (!markdownInsert.error) {
      return NextResponse.json(markdownInsert.data)
    }

    if (markdownInsert.error.code === '23505') {
      continue
    }

    if (!isMissingColumnError(markdownInsert.error, 'content_markdown')) {
      return errorResponse(markdownInsert.error)
    }

    let legacyInsert = await supabase
      .from('posts')
      .insert({
        workspace_id: workspace.id,
        author_id: user.id,
        title,
        slug,
        content: contentMarkdown,
        published: false,
      })
      .select()
      .single()

    if (legacyInsert.error && isLegacyJsonTypeError(legacyInsert.error)) {
      legacyInsert = await supabase
        .from('posts')
        .insert({
          workspace_id: workspace.id,
          author_id: user.id,
          title,
          slug,
          content: JSON.stringify(contentMarkdown),
          published: false,
        })
        .select()
        .single()
    }

    if (!legacyInsert.error) {
      return NextResponse.json({
        ...legacyInsert.data,
        content_markdown: contentMarkdown,
      })
    }

    if (legacyInsert.error.code === '23505') {
      continue
    }

    return errorResponse(legacyInsert.error)
  }

  return NextResponse.json({ error: 'Failed to create a unique slug' }, { status: 500 })
}
