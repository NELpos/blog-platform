'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewStudioPostPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(true)

  const createDraft = useCallback(async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', content_markdown: '' }),
      })

      if (!response.ok) throw new Error('Failed to create draft')

      const post = await response.json()
      router.replace(`/studio?post=${post.id}&mode=edit`)
    } catch {
      setIsCreating(false)
      toast.error('포스트 생성 중 오류가 발생했습니다.')
    }
  }, [router])

  useEffect(() => {
    createDraft()
  }, [createDraft])

  if (!isCreating) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-6">
        <div className="w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Draft를 만들지 못했습니다.</h1>
          <p className="text-sm text-muted-foreground">잠시 후 다시 시도하거나 대시보드로 돌아가세요.</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={createDraft}>다시 시도</Button>
            <Link href="/dashboard">
              <Button variant="outline">대시보드로 이동</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      <span className="ml-2 text-neutral-500">Creating draft...</span>
    </div>
  )
}
