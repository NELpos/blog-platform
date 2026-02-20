import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/admin/session'

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303)
  response.cookies.delete(ADMIN_SESSION_COOKIE)
  return response
}
