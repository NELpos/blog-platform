import { NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  getAdminSessionCookieOptions,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from '@/lib/admin/session'

export async function POST(request: Request) {
  const formData = await request.formData()
  const loginId = String(formData.get('login_id') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!isAdminAuthConfigured()) {
    return NextResponse.redirect(new URL('/login?adminError=disabled', request.url), 303)
  }

  if (!verifyAdminCredentials(loginId, password)) {
    return NextResponse.redirect(new URL('/login?adminError=invalid', request.url), 303)
  }

  const session = createAdminSessionValue()
  if (!session) {
    return NextResponse.redirect(new URL('/login?adminError=disabled', request.url), 303)
  }

  const response = NextResponse.redirect(new URL('/admin', request.url), 303)
  response.cookies.set(ADMIN_SESSION_COOKIE, session, getAdminSessionCookieOptions())
  return response
}
