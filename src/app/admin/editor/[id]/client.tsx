'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useDebouncedCallback } from 'use-debounce'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const MarkdownEditor = dynamic(() => import('@/components/editor/MarkdownEditor'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-lg bg-muted" />,
})

interface EditorClientProps {
  post: {
    id: string
    title: string
    content_markdown: string
    published: boolean
  }
}

export default function EditorClient({ post }: EditorClientProps) {
  const router = useRouter()
  const [title, setTitle] = useState(post.title)
  const [contentMarkdown, setContentMarkdown] = useState(post.content_markdown ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(post.published)

  const debouncedSave = useDebouncedCallback(async (newTitle: string, nextContentMarkdown: string) => {
    setSaveStatus('saving')
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content_markdown: nextContentMarkdown,
          published: isPublished,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
      toast.error('저장 중 오류가 발생했습니다.')
    }
  }, 1000)

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setSaveStatus('idle')
    debouncedSave(newTitle, contentMarkdown)
  }

  const handleContentChange = (newContentMarkdown: string) => {
    setContentMarkdown(newContentMarkdown)
    setSaveStatus('idle')
    debouncedSave(title, newContentMarkdown)
  }

  const handlePublish = async () => {
    debouncedSave.cancel()
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_markdown: contentMarkdown,
          published: true,
          published_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error('Failed to publish')

      setIsPublished(true)
      setSaveStatus('saved')
      toast.success('포스트가 발행되었습니다!')
      router.refresh()
    } catch {
      toast.error('발행 중 오류가 발생했습니다.')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card backdrop-blur">
        <div className="container-shell flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'error' && 'Save failed'}
              {saveStatus === 'idle' && 'Unsaved changes'}
            </span>
            <Button onClick={handlePublish} disabled={isPublishing || isPublished} className="min-w-24">
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPublished ? (
                'Published'
              ) : (
                'Publish'
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container-shell py-8">
        <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Nelantir Nexus</p>
          <label htmlFor="post-title" className="sr-only">
            Post title
          </label>
          <input
            id="post-title"
            type="text"
            placeholder="Post Title"
            value={title}
            onChange={handleTitleChange}
            aria-label="Post title"
            className="mt-2 w-full rounded-md border border-transparent bg-transparent px-1 text-4xl font-bold tracking-tight placeholder:text-muted-foreground focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
          <MarkdownEditor initialContent={contentMarkdown} onChange={handleContentChange} />
        </section>
      </main>
    </div>
  )
}
