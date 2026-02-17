export type ShortcodeType = 'image' | 'video'

export interface ShortcodeNode {
  type: ShortcodeType
  url: string
  attrs: Record<string, string>
}

const SHORTCODE_PATTERN = /^@\[(image|video)\]\(([^)]+)\)(?:\{([^}]*)\})?\s*$/

function sanitizeUrl(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function parseAttrs(raw: string | undefined): Record<string, string> {
  if (!raw) return {}

  const attrs: Record<string, string> = {}
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean)

  for (const part of parts) {
    const [keyRaw, ...valueParts] = part.split('=')
    const key = keyRaw?.trim()
    if (!key || valueParts.length === 0) continue

    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (!value) continue
    attrs[key] = value
  }

  return attrs
}

export function parseShortcodeLine(line: string): ShortcodeNode | null {
  const match = line.trim().match(SHORTCODE_PATTERN)
  if (!match) return null

  const type = match[1] as ShortcodeType
  const sanitizedUrl = sanitizeUrl(match[2])
  if (!sanitizedUrl) return null

  return {
    type,
    url: sanitizedUrl,
    attrs: parseAttrs(match[3]),
  }
}

export function buildImageShortcode(url: string, attrs?: Partial<Record<'alt' | 'width' | 'align' | 'caption', string>>) {
  const sanitizedUrl = sanitizeUrl(url)
  if (!sanitizedUrl) return ''

  const attrString = [
    attrs?.alt ? `alt="${attrs.alt}"` : null,
    attrs?.width ? `width="${attrs.width}"` : null,
    attrs?.align ? `align="${attrs.align}"` : null,
    attrs?.caption ? `caption="${attrs.caption}"` : null,
  ].filter(Boolean).join(',')

  return attrString
    ? `@[image](${sanitizedUrl}){${attrString}}`
    : `@[image](${sanitizedUrl})`
}

export function buildVideoShortcode(url: string, attrs?: Partial<Record<'provider' | 'title', string>>) {
  const sanitizedUrl = sanitizeUrl(url)
  if (!sanitizedUrl) return ''

  const attrString = [
    attrs?.provider ? `provider="${attrs.provider}"` : null,
    attrs?.title ? `title="${attrs.title}"` : null,
  ].filter(Boolean).join(',')

  return attrString
    ? `@[video](${sanitizedUrl}){${attrString}}`
    : `@[video](${sanitizedUrl})`
}
