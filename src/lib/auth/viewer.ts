import type { User } from '@supabase/supabase-js'

type ViewerProfile = {
  displayName: string
  avatarUrl: string | null
  email: string | null
}

export type SupabaseProfileReader = {
  from: (table: 'profiles') => {
    select: (columns: 'display_name, avatar_url') => {
      eq: (column: 'id', value: string) => {
        maybeSingle: () => Promise<{
          data: { display_name: string | null; avatar_url: string | null } | null
          error: { message: string } | null
        }>
      }
    }
  }
}

function pickDisplayName(user: User, profileDisplayName: string | null | undefined) {
  const metadata = user.user_metadata as Record<string, unknown> | null
  const metadataName = metadata?.full_name || metadata?.name
  if (typeof profileDisplayName === 'string' && profileDisplayName.trim()) return profileDisplayName
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName
  if (typeof user.email === 'string' && user.email.trim()) return user.email
  return 'User'
}

function pickAvatar(user: User, profileAvatarUrl: string | null | undefined) {
  const metadata = user.user_metadata as Record<string, unknown> | null
  const metadataAvatar = metadata?.avatar_url || metadata?.picture

  if (typeof profileAvatarUrl === 'string' && profileAvatarUrl.trim()) return profileAvatarUrl
  if (typeof metadataAvatar === 'string' && metadataAvatar.trim()) return metadataAvatar
  return null
}

export async function getViewerProfile(
  supabase: SupabaseProfileReader,
  user: User,
): Promise<ViewerProfile> {
  const profileQuery = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (profileQuery.error) {
    console.error('Failed to load profile', profileQuery.error)
  }

  const profile = profileQuery.data

  return {
    displayName: pickDisplayName(user, profile?.display_name),
    avatarUrl: pickAvatar(user, profile?.avatar_url),
    email: user.email ?? null,
  }
}
