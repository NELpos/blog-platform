'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, UserRound, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

type UserNavMenuProps = {
  displayName: string
  avatarUrl: string | null
  email?: string | null
  className?: string
}

function getInitials(name: string) {
  const normalized = name.trim()
  if (!normalized) return 'U'
  const parts = normalized.split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'
}

export default function UserNavMenu({ displayName, avatarUrl, email, className }: UserNavMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Open user menu"
          className={cn(
            'inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/50 text-xs font-semibold text-foreground outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="size-full object-cover"
              unoptimized
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden>{getInitials(displayName)}</span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="z-[110] min-w-[220px] rounded-md border border-border bg-card p-1 shadow-xl"
        >
          <div className="px-2 py-2">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link
              href="/settings/profile"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
            >
              <UserRound className="size-4" />
              Profile settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings/mcp"
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
            >
              <Wrench className="size-4" />
              MCP settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-destructive outline-none hover:bg-destructive/10 focus:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
