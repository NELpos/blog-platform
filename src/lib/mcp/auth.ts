import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const LAST_USED_TOUCH_WINDOW_MS = 10 * 60 * 1000

type ApiKeyRow = {
  id: string
  user_id: string
  key_prefix: string
}

export type McpActor = {
  userId: string
  apiKeyId: string
  keyPrefix: string
}

export type McpAuthResult =
  | { ok: true; actor: McpActor }
  | { ok: false; status: number; error: string }

function isMissingScopeColumnError(error: { message?: string; code?: string } | null) {
  if (!error) return false
  if (error.code === 'PGRST204') return true
  return (error.message ?? '').toLowerCase().includes("could not find the 'scope' column")
}

export function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization) return null

  const [scheme, token] = authorization.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token.trim() || null
}

async function touchLastUsedAt(apiKeyId: string) {
  const supabase = createAdminClient()
  const now = new Date()
  const thresholdIso = new Date(now.getTime() - LAST_USED_TOUCH_WINDOW_MS).toISOString()

  // Throttle writes by updating at most once per time window per key.
  const result = await supabase
    .from('api_keys')
    .update({ last_used_at: now.toISOString() })
    .eq('id', apiKeyId)
    .or(`last_used_at.is.null,last_used_at.lt.${thresholdIso}`)

  if (result.error) {
    console.error('[mcp-auth] failed to touch last_used_at', {
      apiKeyId,
      code: result.error.code,
      message: result.error.message,
    })
  }
}

async function findMcpApiKeyRow(token: string): Promise<ApiKeyRow | null> {
  const supabase = createAdminClient()
  const keyHash = createHash('sha256').update(token).digest('hex')
  const nowIso = new Date().toISOString()

  let lookup = await supabase
    .from('api_keys')
    .select('id, user_id, key_prefix')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .eq('scope', 'mcp')
    .maybeSingle<ApiKeyRow>()

  if (isMissingScopeColumnError(lookup.error)) {
    lookup = await supabase
      .from('api_keys')
      .select('id, user_id, key_prefix')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .maybeSingle<ApiKeyRow>()
  }

  if (lookup.error) {
    console.error('[mcp-auth] api key lookup failed', {
      code: lookup.error.code,
      message: lookup.error.message,
    })
    return null
  }

  return lookup.data ?? null
}

export async function authenticateMcpRequest(request: Request): Promise<McpAuthResult> {
  const token = parseBearerToken(request)
  if (!token) {
    return { ok: false, status: 401, error: 'Missing or invalid Bearer token' }
  }

  const key = await findMcpApiKeyRow(token)
  if (!key) {
    return { ok: false, status: 401, error: 'Invalid or expired MCP key' }
  }

  void touchLastUsedAt(key.id)

  return {
    ok: true,
    actor: {
      userId: key.user_id,
      apiKeyId: key.id,
      keyPrefix: key.key_prefix,
    },
  }
}
