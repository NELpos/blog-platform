import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export async function uploadImage(file: File): Promise<string> {
  const supabase = createClient()
  const bucket = 'post-images'

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    toast.error('이미지 업로드는 로그인 후 사용할 수 있습니다.')
    throw userError ?? new Error('Not authenticated')
  }

  // 파일명 고유하게 생성 (timestamp-random-filename)
  const nameExt = file.name.includes('.') ? file.name.split('.').pop() : undefined
  const typeExt = file.type.split('/')[1]
  const fileExt = nameExt || typeExt || 'png'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
  const filePath = `${fileName}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading image:', error)
    if (error.message.toLowerCase().includes('row-level security')) {
      toast.error('이미지 업로드 권한이 없습니다. Storage RLS 정책 또는 로그인 상태를 확인하세요.')
    } else {
      toast.error('이미지 업로드 중 오류가 발생했습니다.')
    }
    throw error
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrl
}
