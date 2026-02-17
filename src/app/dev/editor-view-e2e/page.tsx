'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import PostViewer from '@/components/blog/PostViewer'

const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-lg bg-muted" />,
})

type Mode = 'edit' | 'view'

export default function EditorViewE2EPage() {
  const [mode, setMode] = useState<Mode>('edit')
  const [title, setTitle] = useState('E2E Formatting Test Post')
  const [content, setContent] = useState('')

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">E2E Repro</p>
        <h1 className="text-2xl font-semibold">Editor Toolbar + View Rendering</h1>
      </header>

      <section className="flex items-center gap-2">
        <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
          Edit
        </Button>
        <Button variant={mode === 'view' ? 'default' : 'outline'} onClick={() => setMode('view')}>
          View
        </Button>
      </section>

      {mode === 'edit' ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <label htmlFor="e2e-title" className="sr-only">
            Post title
          </label>
          <input
            id="e2e-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-2xl font-semibold"
          />
          <MarkdownEditor initialContent={content} onChange={setContent} />
        </section>
      ) : (
        <article className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-3xl font-bold">{title || 'Untitled'}</h2>
          <PostViewer contentMarkdown={content} />
        </article>
      )}
    </main>
  )
}
