'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-lg bg-muted" />,
})

export default function EditorInputReproClient() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Editor Input Repro</h1>
      <p className="text-sm text-muted-foreground">
        Title and body should both keep typed input.
      </p>

      <label htmlFor="repro-title" className="sr-only">
        Repro title
      </label>
      <input
        id="repro-title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title"
        className="w-full rounded-md border border-border bg-background px-3 py-2"
      />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
        <MarkdownEditor initialContent={content} onChange={setContent} />
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Live output</p>
        <p data-testid="repro-title-preview" className="text-sm">
          {title || '(empty)'}
        </p>
        <pre data-testid="repro-content-preview" className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {content}
        </pre>
      </section>
    </main>
  )
}
