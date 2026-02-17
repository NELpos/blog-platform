import { codeToHtml } from 'shiki'

const highlightCache = new Map<string, string>()

function normalizeLanguage(language?: string) {
  if (!language) return 'text'

  const normalized = language.trim().toLowerCase()
  if (normalized === 'typescript') return 'ts'
  if (normalized === 'javascript') return 'js'
  if (normalized === 'shell' || normalized === 'bash' || normalized === 'sh') return 'bash'
  if (normalized === 'markdown' || normalized === 'md') return 'md'
  return normalized
}

export async function highlightCode(code: string, language?: string) {
  const lang = normalizeLanguage(language)
  const cacheKey = `${lang}::${code}`
  const cached = highlightCache.get(cacheKey)
  if (cached) return cached

  try {
    const html = await codeToHtml(code, {
      lang,
      theme: 'github-dark',
    })
    highlightCache.set(cacheKey, html)
    return html
  } catch {
    const html = await codeToHtml(code, {
      lang: 'text',
      theme: 'github-dark',
    })
    highlightCache.set(cacheKey, html)
    return html
  }
}

