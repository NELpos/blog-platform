import type { PostgrestError } from '@supabase/supabase-js'

type LegacyNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: LegacyNode[]
}

function nodeToMarkdown(node: LegacyNode): string {
  const type = node.type

  if (type === 'text') {
    return node.text ?? ''
  }

  if (type === 'hardBreak') {
    return '\n'
  }

  if (type === 'paragraph') {
    const text = (node.content ?? []).map(nodeToMarkdown).join('')
    return text.trim() ? `${text}\n\n` : '\n'
  }

  if (type === 'heading') {
    const level = Number(node.attrs?.level ?? 1)
    const text = (node.content ?? []).map(nodeToMarkdown).join('')
    return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${text}\n\n`
  }

  if (type === 'blockquote') {
    const text = (node.content ?? []).map(nodeToMarkdown).join('').trim()
    if (!text) return ''
    return text
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n') + '\n\n'
  }

  if (type === 'bulletList') {
    const items = (node.content ?? [])
      .map((child) => `- ${(child.content ?? []).map(nodeToMarkdown).join('').trim()}`)
      .join('\n')
    return items ? `${items}\n\n` : ''
  }

  if (type === 'orderedList') {
    const items = (node.content ?? [])
      .map((child, idx) => `${idx + 1}. ${(child.content ?? []).map(nodeToMarkdown).join('').trim()}`)
      .join('\n')
    return items ? `${items}\n\n` : ''
  }

  if (type === 'codeBlock') {
    const language = String(node.attrs?.language ?? '').trim()
    const text = (node.content ?? []).map(nodeToMarkdown).join('')
    return `\
\`\`\`${language}\n${text}\n\`\`\`\n\n`
  }

  if (type === 'image') {
    const src = String(node.attrs?.src ?? '').trim()
    const alt = String(node.attrs?.alt ?? '').trim()
    if (!src) return ''
    return `@[image](${src})${alt ? `{alt=\"${alt}\"}` : ''}\n\n`
  }

  return (node.content ?? []).map(nodeToMarkdown).join('')
}

export function legacyContentToMarkdown(legacy: unknown): string {
  if (typeof legacy === 'string') {
    return legacy
  }

  if (!legacy || typeof legacy !== 'object') {
    return ''
  }

  const root = legacy as LegacyNode
  if (!Array.isArray(root.content)) {
    return ''
  }

  return root.content.map(nodeToMarkdown).join('').trim()
}

export function isMissingColumnError(error: PostgrestError | null, columnName: string): boolean {
  if (!error) return false
  const message = error.message.toLowerCase()
  const target = columnName.toLowerCase()
  if (!message.includes(target)) return false

  if (error.code === '42703') return true
  if (error.code === 'PGRST204') return true
  return false
}

export function isLegacyJsonTypeError(error: PostgrestError | null): boolean {
  if (!error) return false
  return error.code === '22P02' && error.message.toLowerCase().includes('json')
}
