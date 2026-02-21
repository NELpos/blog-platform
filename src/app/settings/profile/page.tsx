import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getViewerProfile, type SupabaseProfileReader } from '@/lib/auth/viewer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const viewer = await getViewerProfile(supabase as unknown as SupabaseProfileReader, user)

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile settings</h1>
        <p className="text-sm text-muted-foreground">프로필 정보와 블로그 작성자 표시 정보를 관리합니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex size-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-semibold">
            {viewer.avatarUrl ? (
              <Image
                src={viewer.avatarUrl}
                alt={viewer.displayName}
                width={64}
                height={64}
                className="size-full object-cover"
                unoptimized
                referrerPolicy="no-referrer"
              />
            ) : (
              viewer.displayName.slice(0, 2).toUpperCase()
            )}
          </div>
        <div>
          <p className="font-medium">{viewer.displayName}</p>
          <p className="text-sm text-muted-foreground">{viewer.email ?? 'No email'}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="display-name" className="text-sm font-medium">Display name</label>
          <Input id="display-name" defaultValue={viewer.displayName} placeholder="Display name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="avatar-url" className="text-sm font-medium">Avatar URL</label>
          <Input id="avatar-url" defaultValue={viewer.avatarUrl ?? ''} placeholder="https://..." />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled>
          Save changes
        </Button>
        <p className="text-xs text-muted-foreground">저장 API는 다음 단계에서 연결됩니다.</p>
      </div>
    </div>
  )
}
