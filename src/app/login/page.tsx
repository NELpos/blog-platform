import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { CredentialLoginForm } from '@/components/auth/CredentialLoginForm'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ADMIN_SESSION_COOKIE, isAdminSessionTokenValid } from '@/lib/admin/session'
import BrandMark from '@/components/brand/BrandMark'

export const metadata: Metadata = {
  title: '로그인 | Nelantir Nexus',
  description: '계정으로 로그인하세요',
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readFirstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function getAdminErrorMessage(errorCode: string) {
  if (errorCode === 'invalid') return '아이디 또는 비밀번호가 올바르지 않습니다.'
  if (errorCode === 'disabled') return '로그인 설정이 비어 있습니다. 관리자에게 문의하세요.'
  return ''
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const adminSession = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const query = await searchParams
  const adminErrorCode = readFirstQueryValue(query.adminError)
  const adminErrorMessage = getAdminErrorMessage(adminErrorCode)

  if (isAdminSessionTokenValid(adminSession)) {
    redirect('/admin')
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href="/" aria-label="Nelantir Nexus">
            <BrandMark className="text-lg" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container-shell py-14">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">로그인</h1>
        </div>

        <section className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 shadow-sm">
          <CredentialLoginForm errorMessage={adminErrorMessage} />

          <div className="my-6 h-px w-full bg-border" />

          <div className="mb-3 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">SSO Login</h3>
          </div>
          <LoginForm />
        </section>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          로그인하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
