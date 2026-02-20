import { createHash, randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isMissingScopeColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false
  if (error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes("could not find the 'scope' column")
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, status, expires_at, created_at, last_used_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ data: result.data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null) as {
    name?: string
    expires_at?: string | null
  } | null

  const name = payload?.name?.trim() || 'Personal MCP Key'
  const expiresInput = payload?.expires_at ?? null
  let expiresAt: string | null = null

  if (expiresInput) {
    const parsed = new Date(expiresInput)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid expires_at format' }, { status: 400 })
    }
    if (parsed.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'expires_at must be in the future' }, { status: 400 })
    }
    expiresAt = parsed.toISOString()
  }

  const existing = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 })
  }

  if (existing.data) {
    return NextResponse.json({ error: 'MCP 키는 계정당 1개만 생성할 수 있습니다.' }, { status: 409 })
  }

  const plaintextKey = `tbk_${randomBytes(24).toString('base64url')}`
  const keyHash = createHash('sha256').update(plaintextKey).digest('hex')
  const keyPrefix = plaintextKey.slice(0, 12)

  let insert = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      scope: 'mcp',
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'active',
      expires_at: expiresAt,
    })
    .select('id, name, key_prefix, status, expires_at, created_at, last_used_at')
    .single()

  if (isMissingScopeColumnError(insert.error)) {
    insert = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        status: 'active',
        expires_at: expiresAt,
      })
      .select('id, name, key_prefix, status, expires_at, created_at, last_used_at')
      .single()
  }

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: insert.data,
    plaintext_key: plaintextKey,
  }, { status: 201 })
}
