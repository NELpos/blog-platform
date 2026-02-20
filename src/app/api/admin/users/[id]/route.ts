import { NextResponse } from 'next/server'
import { guardAdminApiRequest } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const { id } = await params
  const payload = await request.json().catch(() => null) as {
    display_name?: string
    account_role?: 'owner' | 'editor' | 'viewer'
    account_status?: 'active' | 'pending' | 'suspended'
    last_active_at?: string | null
  } | null

  const updates: Record<string, string | null> = {}
  if (typeof payload?.display_name === 'string') updates.display_name = payload.display_name.trim()
  if (typeof payload?.account_role === 'string') updates.account_role = payload.account_role
  if (typeof payload?.account_status === 'string') updates.account_status = payload.account_status
  if (payload?.last_active_at === null || typeof payload?.last_active_at === 'string') {
    updates.last_active_at = payload.last_active_at ?? null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const result = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('id, username, email, display_name, avatar_url, account_role, account_status, last_active_at, created_at, updated_at')
    .single()

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ data: result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const deleteResult = await supabase.auth.admin.deleteUser(id)

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
