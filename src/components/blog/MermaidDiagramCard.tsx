'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import CodeBlockCard from '@/components/blog/CodeBlockCard'

type MermaidDiagramCardProps = {
  code: string
}

type MermaidModule = typeof import('mermaid').default

let mermaidInstance: MermaidModule | null = null
let mermaidInitialized = false

async function loadMermaid() {
  if (!mermaidInstance) {
    const mermaidModule = await import('mermaid')
    mermaidInstance = mermaidModule.default
  }

  if (!mermaidInitialized && mermaidInstance) {
    mermaidInstance.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'dark',
    })
    mermaidInitialized = true
  }

  return mermaidInstance
}

function normalizeMermaidId(seed: string) {
  return `mermaid-${seed.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export default function MermaidDiagramCard({ code }: MermaidDiagramCardProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const componentId = useId()
  const graphId = useMemo(() => normalizeMermaidId(componentId), [componentId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      try {
        const mermaid = await loadMermaid()
        const { svg: renderedSvg } = await mermaid.render(graphId, code)
        if (cancelled) return
        setSvg(renderedSvg)
        setError(null)
      } catch {
        if (cancelled) return
        setSvg(null)
        setError('Mermaid diagram을 렌더링하지 못했습니다.')
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [code, graphId])

  if (!svg) {
    if (error) {
      return (
        <div className="my-5 space-y-3">
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {error}
          </p>
          <CodeBlockCard code={code} language="mermaid" />
        </div>
      )
    }

    return (
      <div className="my-5 rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Mermaid diagram 렌더링 중...
      </div>
    )
  }

  return (
    <div className="my-5 overflow-x-auto rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
          aria-label="Copy mermaid source"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mermaid-diagram min-w-[320px]" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
