'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'

interface PublicPostSearchBarProps {
  workspaceSlug: string
  initialQuery: string
}

export default function PublicPostSearchBar({
  workspaceSlug,
  initialQuery,
}: PublicPostSearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const currentQuery = useMemo(() => (searchParams.get('q') ?? '').trim(), [searchParams])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextQuery = query.trim()
      if (nextQuery === currentQuery) return

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('cursor')
      if (nextQuery) {
        nextParams.set('q', nextQuery)
      } else {
        nextParams.delete('q')
      }

      const href = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
      startTransition(() => {
        router.replace(href, { scroll: false })
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query, currentQuery, pathname, router, searchParams, startTransition])

  return (
    <div className="mx-auto mb-8 flex max-w-2xl gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="제목 또는 내용으로 검색"
        className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
      />
      {query.trim() && (
        <Link
          href={`/blog/${workspaceSlug}`}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          초기화
        </Link>
      )}
      <span className="inline-flex h-10 min-w-20 items-center justify-center text-xs text-muted-foreground">
        {isPending ? '검색 중...' : ''}
      </span>
    </div>
  )
}
