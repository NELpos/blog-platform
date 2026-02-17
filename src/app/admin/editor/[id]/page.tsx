import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { AccessDenied } from '@/components/ui/AccessDenied'

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    notFound()
  }

  // 본인 글인지 확인 (RLS가 있지만 UX를 위해)
  if (post.author_id !== user.id) {
    return (
      <AccessDenied
        description="이 포스트는 현재 계정으로 수정할 수 없습니다."
        primaryAction={{ href: '/dashboard', label: '대시보드로 이동' }}
        secondaryAction={{ href: '/', label: '홈으로 이동', variant: 'outline' }}
      />
    )
  }

  redirect(`/studio?post=${id}&mode=edit`)
}
