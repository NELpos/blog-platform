import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizeQuery(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, 200)
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspace_slug: string }> },
) {
  const { workspace_slug } = await context.params
  const body = await request.json().catch(() => null)
  const query = normalizeQuery(body?.query)
  const resultCount = typeof body?.result_count === 'number'
    ? Math.max(0, Math.min(1000, Math.floor(body.result_count)))
    : null

  if (!query) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspace_slug)
    .maybeSingle()

  if (workspaceError || !workspace) {
    return NextResponse.json({ ok: true })
  }

  await supabase
    .from('public_search_events')
    .insert({
      workspace_id: workspace.id,
      query,
      query_length: query.length,
      has_hangul: hasHangul(query),
      result_count: resultCount,
      source: 'public_blog_list',
    })

  return NextResponse.json({ ok: true })
}
