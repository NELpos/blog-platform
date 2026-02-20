import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import UserNavMenu from '@/components/auth/UserNavMenu'
import SettingsSidebarNav from '@/components/settings/SettingsSidebarNav'
import { getViewerProfile, type SupabaseProfileReader } from '@/lib/auth/viewer'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const viewer = await getViewerProfile(supabase as unknown as SupabaseProfileReader, user)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container-shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              TechBlog
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">Settings</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserNavMenu displayName={viewer.displayName} avatarUrl={viewer.avatarUrl} email={viewer.email} />
          </div>
        </div>
      </header>

      <main className="container-shell py-8">
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User settings</p>
            <SettingsSidebarNav />
          </aside>
          <section>{children}</section>
        </div>
      </main>
    </div>
  )
}
