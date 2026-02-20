import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import AdminSidebarNav from '@/components/admin/AdminSidebarNav'
import { Button } from '@/components/ui/button'
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthConfigured,
  isAdminSessionTokenValid,
} from '@/lib/admin/session'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!isAdminAuthConfigured()) {
    redirect('/login?adminError=disabled')
  }

  if (!isAdminSessionTokenValid(session)) {
    redirect('/login?adminError=invalid')
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nelantir Nexus</p>
          <h1 className="mt-1 text-lg font-semibold">Admin Panel</h1>
        </div>
        <div className="flex-1 px-3 py-4">
          <AdminSidebarNav />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-border bg-card">
          <div className="container-shell flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Admin</span>
              <nav className="ml-3 hidden items-center gap-2 md:flex">
                <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
                  Users
                </Link>
                <span className="text-muted-foreground">|</span>
                <Link href="/admin/api-keys" className="text-sm text-muted-foreground hover:text-foreground">
                  API Keys
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <form action="/auth/admin-logout" method="post">
                <Button type="submit" variant="outline" size="sm">Logout</Button>
              </form>
            </div>
          </div>
        </header>

        <main className="container-shell py-6">{children}</main>
      </div>
    </div>
  )
}
