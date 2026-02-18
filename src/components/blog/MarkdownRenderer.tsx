'use client'

import type { ElementType, ReactNode } from 'react'
import CodeBlockCard from '@/components/blog/CodeBlockCard'
import MermaidDiagramCard from '@/components/blog/MermaidDiagramCard'
import { parseShortcodeLine } from '@/lib/markdown/shortcodes'

type MarkdownRendererProps = {
  content: string
}

function parseCodeFenceInfo(info: string) {
  const trimmed = info.trim()
  if (!trimmed) {
    return { language: '', title: '' }
  }

  const language = trimmed.split(/\s+/)[0] ?? ''
  const titleMatch = trimmed.match(/title=(?:"([^"]+)"|'([^']+)')/)
  const title = titleMatch?.[1] ?? titleMatch?.[2] ?? ''

  return { language, title }
}

function parseTableRow(line: string): string[] {
  let normalized = line.trim()
  if (normalized.startsWith('|')) normalized = normalized.slice(1)
  if (normalized.endsWith('|')) normalized = normalized.slice(0, -1)
  return normalized.split('|').map((cell) => cell.trim())
}

function isTableSeparatorLine(line: string): boolean {
  const cells = parseTableRow(line)
  if (cells.length === 0) return false
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))
}

function safeUrl(input: string): string | null {
  try {
    const parsed = new URL(input)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function extractYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    return null
  } catch {
    return null
  }
}

function extractVimeoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('vimeo.com')) return null
    const id = parsed.pathname.split('/').filter(Boolean).pop()
    return id ? `https://player.vimeo.com/video/${id}` : null
  } catch {
    return null
  }
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenPattern = /(\[[^\]]+\]\((?:https?:\/\/)[^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let index = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    const start = match.index
    const token = match[0]

    if (start > index) {
      nodes.push(text.slice(index, start))
    }

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`${start}-b`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={`${start}-i`}>{token.slice(1, -1)}</em>)
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(<code key={`${start}-c`} className="rounded bg-muted px-1.5 py-0.5 text-sm">{token.slice(1, -1)}</code>)
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (linkMatch) {
        const href = safeUrl(linkMatch[2])
        if (href) {
          nodes.push(
            <a key={`${start}-a`} href={href} target="_blank" rel="noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
              {linkMatch[1]}
            </a>,
          )
        } else {
          nodes.push(token)
        }
      } else {
        nodes.push(token)
      }
    }

    index = start + token.length
  }

  if (index < text.length) {
    nodes.push(text.slice(index))
  }

  return nodes
}

function renderShortcode(line: string, key: string): ReactNode {
  const shortcode = parseShortcodeLine(line)
  if (!shortcode) {
    return <p key={key}>{parseInline(line)}</p>
  }

  if (shortcode.type === 'image') {
    const width = shortcode.attrs.width ?? '100%'
    const align = shortcode.attrs.align ?? 'center'
    const caption = shortcode.attrs.caption
    const alt = shortcode.attrs.alt ?? caption ?? 'Post image'

    const justifyClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'

    return (
      <figure key={key} className={`my-6 flex flex-col gap-2 ${justifyClass}`}>
        <img
          src={shortcode.url}
          alt={alt}
          style={{ width, maxWidth: '100%' }}
          className="rounded-lg border border-border bg-muted/20"
          loading="lazy"
        />
        {caption ? <figcaption className="text-sm text-muted-foreground">{caption}</figcaption> : null}
      </figure>
    )
  }

  const provider = shortcode.attrs.provider?.toLowerCase()
  const title = shortcode.attrs.title ?? 'Embedded video'
  const youtubeEmbed = extractYouTubeEmbedUrl(shortcode.url)
  const vimeoEmbed = extractVimeoEmbedUrl(shortcode.url)
  const embedUrl = provider === 'youtube'
    ? youtubeEmbed
    : provider === 'vimeo'
      ? vimeoEmbed
      : youtubeEmbed ?? vimeoEmbed

  if (!embedUrl) {
    return (
      <p key={key} className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
        Unsupported video URL: {shortcode.url}
      </p>
    )
  }

  return (
    <div key={key} className="my-6 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="aspect-video">
        <iframe
          src={embedUrl}
          title={title}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function renderMarkdown(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.startsWith('```')) {
      const fenceInfo = line.slice(3).trim()
      const { language, title } = parseCodeFenceInfo(fenceInfo)
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      if (i < lines.length && lines[i].startsWith('```')) i += 1

      blocks.push(
        language.toLowerCase() === 'mermaid'
          ? (
            <MermaidDiagramCard
              key={`mermaid-${i}`}
              code={codeLines.join('\n')}
            />
          )
          : (
            <CodeBlockCard
              key={`code-${i}`}
              language={language}
              title={title}
              code={codeLines.join('\n')}
            />
          ),
      )
      continue
    }

    const shortcode = parseShortcodeLine(line)
    if (shortcode) {
      blocks.push(renderShortcode(line, `shortcode-${i}`))
      i += 1
      continue
    }

    if (i + 1 < lines.length && lines[i].includes('|') && isTableSeparatorLine(lines[i + 1])) {
      const header = parseTableRow(lines[i])
      i += 2
      const rows: string[][] = []

      while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !isTableSeparatorLine(lines[i])) {
        rows.push(parseTableRow(lines[i]))
        i += 1
      }

      const width = header.length
      const normalizedRows = rows.map((row) => {
        if (row.length >= width) return row.slice(0, width)
        return [...row, ...Array.from({ length: width - row.length }, () => '')]
      })

      blocks.push(
        <div key={`table-${i}`} className="my-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse overflow-hidden rounded-xl border border-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {header.map((cell, index) => (
                  <th key={`th-${i}-${index}`} className="border-b border-border px-3 py-2 text-left font-semibold text-foreground">
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalizedRows.map((row, rowIndex) => (
                <tr key={`tr-${i}-${rowIndex}`} className="odd:bg-background even:bg-muted/20">
                  {row.map((cell, colIndex) => (
                    <td key={`td-${i}-${rowIndex}-${colIndex}`} className="border-b border-border px-3 py-2 align-top text-foreground/90 last:border-b-0">
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const className = level === 1
        ? 'text-2xl font-bold tracking-tight'
        : level === 2
          ? 'text-xl font-semibold tracking-tight'
          : level === 3
            ? 'text-lg font-semibold'
            : 'text-base font-semibold'

      const Tag = `h${Math.min(level, 6)}` as ElementType
      blocks.push(<Tag key={`h-${i}`} className={`mt-8 mb-3 ${className}`}>{parseInline(text)}</Tag>)
      i += 1
      continue
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/)
    if (blockquoteMatch) {
      const quoteLines: string[] = [blockquoteMatch[1]]
      i += 1
      while (i < lines.length && lines[i].match(/^>\s?(.*)$/)) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push(
        <blockquote key={`q-${i}`} className="my-4 border-l-4 border-primary/60 pl-4 text-muted-foreground">
          {quoteLines.map((item, idx) => <p key={`q-${i}-${idx}`}>{parseInline(item)}</p>)}
        </blockquote>,
      )
      continue
    }

    if (line.match(/^[-*+]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''))
        i += 1
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-4 list-disc space-y-2 pl-6">
          {items.map((item, idx) => <li key={`ul-${i}-${idx}`}>{parseInline(item)}</li>)}
        </ul>,
      )
      continue
    }

    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-4 list-decimal space-y-2 pl-6">
          {items.map((item, idx) => <li key={`ol-${i}-${idx}`}>{parseInline(item)}</li>)}
        </ol>,
      )
      continue
    }

    const paragraphLines: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('```')) {
      if (parseShortcodeLine(lines[i])) break
      if (i + 1 < lines.length && lines[i].includes('|') && isTableSeparatorLine(lines[i + 1])) break
      if (lines[i].match(/^(#{1,6})\s+/)) break
      if (lines[i].match(/^>\s?/)) break
      if (lines[i].match(/^[-*+]\s+/)) break
      if (lines[i].match(/^\d+\.\s+/)) break
      paragraphLines.push(lines[i])
      i += 1
    }

    blocks.push(
      <p key={`p-${i}`} className="my-3 leading-6 text-foreground/95">
        {parseInline(paragraphLines.join(' '))}
      </p>,
    )
  }

  return blocks
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="text-muted-foreground">본문이 비어 있습니다.</p>
  }

  return <div className="markdown-renderer max-w-none text-[15px]">{renderMarkdown(content)}</div>
}
