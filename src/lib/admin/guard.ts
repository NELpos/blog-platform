import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, isAdminAuthConfigured, isAdminSessionTokenValid } from '@/lib/admin/session'

export async function guardAdminApiRequest() {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: 'Admin auth is not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!isAdminSessionTokenValid(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
