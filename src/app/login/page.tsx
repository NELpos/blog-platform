import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export const metadata: Metadata = {
  title: '로그인 | Blog Platform',
  description: 'Google 계정으로 로그인하세요',
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Blog Platform</Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-4xl font-bold tracking-tight">로그인</h1>
            <p className="text-muted-foreground">Google 계정으로 에디터를 바로 시작하세요</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <LoginForm />
        </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            로그인하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
