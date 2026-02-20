import { createHash, timingSafeEqual } from 'crypto'

export const ADMIN_SESSION_COOKIE = 'bp_admin_session'
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8

type AdminConfig = {
  loginId: string
  password: string
  secret: string
}

function readAdminConfig(): AdminConfig | null {
  const loginId = process.env.ADMIN_LOGIN_ID
  const password = process.env.ADMIN_LOGIN_PASSWORD
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!loginId || !password || !secret) {
    return null
  }

  return { loginId, password, secret }
}

function hashSessionSource(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function isAdminAuthConfigured() {
  return readAdminConfig() !== null
}

export function verifyAdminCredentials(loginId: string, password: string) {
  const config = readAdminConfig()
  if (!config) return false

  return safeEqual(loginId, config.loginId) && safeEqual(password, config.password)
}

export function createAdminSessionValue() {
  const config = readAdminConfig()
  if (!config) return null

  return hashSessionSource(`${config.loginId}:${config.password}:${config.secret}`)
}

export function isAdminSessionTokenValid(value: string | undefined | null) {
  const expected = createAdminSessionValue()
  if (!value || !expected) return false

  return safeEqual(value, expected)
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: '/',
  }
}
