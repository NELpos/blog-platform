import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decodeCursor, listPublishedPostsByWorkspace } from '@/lib/public/posts'

export async function GET(
  request: Request,
  context: { params: Promise<{ workspace_slug: string }> },
) {
  const { workspace_slug } = await context.params
  const { searchParams } = new URL(request.url)
  const cursor = decodeCursor(searchParams.get('cursor') ?? undefined)
  const query = searchParams.get('q') ?? ''
  const supabase = await createClient()

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspace_slug)
    .maybeSingle()

  if (workspaceError) {
    console.error('Failed to load workspace for public posts API', {
      workspaceSlug: workspace_slug,
      error: workspaceError,
    })
    return NextResponse.json({ error: 'Failed to load workspace' }, { status: 500 })
  }

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  try {
    const result = await listPublishedPostsByWorkspace({
      supabase,
      workspaceId: workspace.id,
      cursor,
      search: query,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to load public posts API list', {
      workspaceId: workspace.id,
      workspaceSlug: workspace_slug,
      error,
    })
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
  }
}
