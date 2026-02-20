import { NextResponse } from 'next/server'
import { guardAdminApiRequest } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingScopeColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false
  if (error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes("could not find the 'scope' column")
}

export async function GET() {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const supabase = createAdminClient()
  let keysResult = await supabase
    .from('api_keys')
    .select('id, user_id, name, key_prefix, status, created_at, last_used_at, expires_at, revoked_at')
    .eq('scope', 'mcp')
    .order('created_at', { ascending: false })

  if (isMissingScopeColumnError(keysResult.error)) {
    keysResult = await supabase
      .from('api_keys')
      .select('id, user_id, name, key_prefix, status, created_at, last_used_at, expires_at, revoked_at')
      .order('created_at', { ascending: false })
  }

  if (keysResult.error) {
    return NextResponse.json({ error: keysResult.error.message }, { status: 500 })
  }

  const keys = keysResult.data ?? []
  const userIds = [...new Set(keys.map((key) => key.user_id).filter(Boolean))]

  let usersById: Record<string, { id: string; display_name: string | null; email: string }> = {}
  if (userIds.length > 0) {
    const usersResult = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    if (!usersResult.error) {
      usersById = Object.fromEntries((usersResult.data ?? []).map((user) => [user.id, user]))
    }
  }

  const data = keys.map((key) => ({
    ...key,
    owner: usersById[key.user_id] ?? null,
  }))

  return NextResponse.json({ data })
}

export async function POST() {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  return NextResponse.json(
    { error: 'Admin cannot create MCP keys. Use /settings/mcp as the key owner.' },
    { status: 403 },
  )
}
