'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { highlightCode } from '@/lib/markdown/highlight'

type CodeBlockCardProps = {
  code: string
  language?: string
  title?: string
}

function normalizeLanguageLabel(language?: string) {
  if (!language) return 'text'
  const normalized = language.toLowerCase()
  if (normalized === 'ts') return 'typescript'
  if (normalized === 'js') return 'javascript'
  if (normalized === 'py') return 'python'
  if (normalized === 'sh') return 'shell'
  if (normalized === 'md') return 'markdown'
  return normalized
}

export default function CodeBlockCard({ code, language, title }: CodeBlockCardProps) {
  const [copied, setCopied] = useState(false)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const languageLabel = useMemo(() => normalizeLanguageLabel(language), [language])

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

    const run = async () => {
      try {
        const html = await highlightCode(code, language)
        if (!cancelled) {
          setHighlighted(html)
        }
      } catch {
        if (!cancelled) {
          setHighlighted(null)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [code, language])

  return (
    <div className="my-5 overflow-hidden rounded-3xl border border-[#19304f] bg-[#02060d] shadow-[0_10px_30px_rgba(2,8,23,0.45)]">
      <div className="flex items-center justify-between border-b border-[#19304f] px-4 py-2.5">
        <span className="font-mono text-sm tracking-tight text-[#8fa3bd]">{title?.trim() || languageLabel}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[#a7b7cc] transition hover:bg-[#0b1726] hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="overflow-x-auto px-5 py-5 code-highlight">
        {highlighted ? (
          <div dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <pre className="md-codeblock m-0 bg-transparent p-0">
            <code className="font-mono text-[13px] leading-6 text-[#f2f7ff]">{code}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
