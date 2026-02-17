import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateAction {
  href: string
  label: string
  variant?: 'default' | 'outline'
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={className ?? 'p-12 text-center'}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      {action && (
        <div className="mt-5">
          <Button asChild variant={action.variant ?? 'outline'}>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
