import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { guardAdminApiRequest } from '@/lib/admin/guard'
import { createAdminClient } from '@/lib/supabase/admin'

function parseQuery(request: Request) {
  const { searchParams } = new URL(request.url)
  return {
    search: searchParams.get('search')?.trim() ?? '',
    role: searchParams.get('role')?.trim() ?? '',
    status: searchParams.get('status')?.trim() ?? '',
  }
}

export async function GET(request: Request) {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const supabase = createAdminClient()
  const { search, role, status } = parseQuery(request)

  let query = supabase
    .from('profiles')
    .select('id, username, email, display_name, avatar_url, account_role, account_status, last_active_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`)
  }
  if (role) query = query.eq('account_role', role)
  if (status) query = query.eq('account_status', status)

  const result = await query

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ data: result.data ?? [] })
}

export async function POST(request: Request) {
  const denied = await guardAdminApiRequest()
  if (denied) return denied

  const payload = await request.json().catch(() => null) as {
    email?: string
    display_name?: string
    role?: 'owner' | 'editor' | 'viewer'
    status?: 'active' | 'pending' | 'suspended'
  } | null

  const email = payload?.email?.trim().toLowerCase() ?? ''
  const displayName = payload?.display_name?.trim() ?? ''
  const role = payload?.role ?? 'viewer'
  const status = payload?.status ?? 'pending'

  if (!email || !displayName) {
    return NextResponse.json({ error: 'email and display_name are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const tempPassword = randomBytes(12).toString('base64url')

  const createAuthResult = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      name: displayName,
    },
  })

  if (createAuthResult.error || !createAuthResult.data.user) {
    return NextResponse.json({ error: createAuthResult.error?.message ?? 'Failed to create user' }, { status: 500 })
  }

  const userId = createAuthResult.data.user.id

  const updateProfileResult = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      account_role: role,
      account_status: status,
    })
    .eq('id', userId)
    .select('id, username, email, display_name, avatar_url, account_role, account_status, last_active_at, created_at, updated_at')
    .single()

  if (updateProfileResult.error) {
    return NextResponse.json({ error: updateProfileResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: updateProfileResult.data,
    temp_password: tempPassword,
  }, { status: 201 })
}
