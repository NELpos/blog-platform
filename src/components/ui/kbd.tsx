import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
