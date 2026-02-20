'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/settings/profile', label: 'Profile', icon: UserRound },
  { href: '/settings/mcp', label: 'MCP', icon: Wrench },
]

export default function SettingsSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
