import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NotFoundStateProps {
  title?: string
  description?: string
  actionHref?: string
  actionLabel?: string
}

export function NotFoundState({
  title = '페이지를 찾을 수 없습니다',
  description = '요청하신 경로가 존재하지 않거나 삭제되었습니다.',
  actionHref = '/',
  actionLabel = '홈으로 이동',
}: NotFoundStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5">
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
