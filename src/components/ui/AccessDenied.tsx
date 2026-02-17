import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface AccessDeniedAction {
  href: string
  label: string
  variant?: 'default' | 'outline'
}

interface AccessDeniedProps {
  title?: string
  description?: string
  primaryAction?: AccessDeniedAction
  secondaryAction?: AccessDeniedAction
}

export function AccessDenied({
  title = '접근 권한이 없습니다',
  description = '요청하신 리소스에 접근할 수 없습니다.',
  primaryAction = { href: '/dashboard', label: '대시보드로 이동' },
  secondaryAction = { href: '/', label: '홈으로 이동', variant: 'outline' },
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button asChild>
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
          <Button asChild variant={secondaryAction.variant ?? 'outline'}>
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
