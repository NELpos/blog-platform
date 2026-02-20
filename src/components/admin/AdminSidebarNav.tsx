'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { KeyRound, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { href: '/admin/users', label: 'User Management', icon: UsersRound },
  { href: '/admin/api-keys', label: 'MCP API Keys', icon: KeyRound },
]

export default function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'border border-primary/20 bg-primary/10 text-primary'
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
