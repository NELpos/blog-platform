import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PostgrestError } from '@supabase/supabase-js'

type BulkAction = 'unpublish' | 'delete'

function errorResponse(error: PostgrestError) {
  console.error('[api/posts/bulk] database error', {
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

  const json = await request.json()
  const action = typeof json.action === 'string' ? json.action as BulkAction : null
  const ids = Array.isArray(json.ids)
    ? json.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (!action || (action !== 'unpublish' && action !== 'delete')) {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No post ids provided' }, { status: 400 })
  }

  if (action === 'unpublish') {
    const updateResult = await supabase
      .from('posts')
      .update({
        published: false,
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('author_id', user.id)
      .select('id')

    if (updateResult.error) {
      return errorResponse(updateResult.error)
    }

    return NextResponse.json({
      success: true,
      action,
      affected_ids: (updateResult.data ?? []).map((post) => post.id),
    })
  }

  const targetResult = await supabase
    .from('posts')
    .select('id, published')
    .in('id', ids)
    .eq('author_id', user.id)

  if (targetResult.error) {
    return errorResponse(targetResult.error)
  }

  const targets = targetResult.data ?? []
  const publishedTargets = targets.filter((post) => post.published).map((post) => post.id)
  if (publishedTargets.length > 0) {
    return NextResponse.json(
      {
        error: 'Published posts must be unpublished before deletion',
        blocked_ids: publishedTargets,
      },
      { status: 400 },
    )
  }

  const deletableIds = targets.map((post) => post.id)
  if (deletableIds.length === 0) {
    return NextResponse.json({ success: true, action, affected_ids: [] })
  }

  const deleteResult = await supabase
    .from('posts')
    .delete()
    .in('id', deletableIds)
    .eq('author_id', user.id)
    .eq('published', false)
    .select('id')

  if (deleteResult.error) {
    return errorResponse(deleteResult.error)
  }

  return NextResponse.json({
    success: true,
    action,
    affected_ids: (deleteResult.data ?? []).map((post) => post.id),
  })
}
