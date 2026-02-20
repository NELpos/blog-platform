import { cn } from '@/lib/utils'

type BrandMarkProps = {
  className?: string
}

export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className="font-semibold tracking-tight text-foreground">Nelantir</span>
      <span className="font-bold tracking-tight text-primary">Nexus</span>
    </span>
  )
}
