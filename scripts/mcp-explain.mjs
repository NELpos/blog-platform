import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function printPlan(title, result) {
  console.log(`\n=== ${title} ===`)
  if (result.error) {
    console.log(result.error.message)
    return false
  }
  console.log(result.data)
  return true
}

async function main() {
  loadEnvLocal()
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: samplePost, error: samplePostError } = await supabase
    .from('posts')
    .select('id, author_id, slug')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (samplePostError) {
    throw new Error(`Failed to load sample post: ${samplePostError.message}`)
  }
  if (!samplePost) {
    console.log('No posts found. EXPLAIN skipped.')
    return
  }

  const { data: sampleKey } = await supabase
    .from('api_keys')
    .select('key_hash')
    .limit(1)
    .maybeSingle()

  const explainOpts = {
    analyze: true,
    verbose: true,
    buffers: true,
    format: 'text',
  }

  console.log('Sample context:')
  console.log(
    JSON.stringify(
      {
        post_id: samplePost.id,
        author_id: samplePost.author_id,
        slug: samplePost.slug,
      },
      null,
      2,
    ),
  )

  const readBySlug = await supabase
    .from('posts')
    .select('id, title, slug, updated_at')
    .eq('author_id', samplePost.author_id)
    .eq('slug', samplePost.slug)
    .limit(1)
    .explain(explainOpts)

  const searchNoQuery = await supabase
    .from('posts')
    .select('id, title, slug, updated_at')
    .eq('author_id', samplePost.author_id)
    .order('updated_at', { ascending: false })
    .limit(10)
    .explain(explainOpts)

  const searchWithQuery = await supabase
    .from('posts')
    .select('id, title, slug, updated_at')
    .eq('author_id', samplePost.author_id)
    .textSearch('search_tsv', 'mcp context', { type: 'websearch', config: 'simple' })
    .order('updated_at', { ascending: false })
    .limit(10)
    .explain(explainOpts)

  const keyLookup = sampleKey?.key_hash
    ? await supabase
      .from('api_keys')
      .select('id, user_id, status, expires_at, revoked_at')
      .eq('key_hash', sampleKey.key_hash)
      .limit(1)
      .explain(explainOpts)
    : null

  const ok1 = printPlan('EXPLAIN post_read by slug', readBySlug)
  const ok2 = printPlan('EXPLAIN post_search no query', searchNoQuery)
  const ok3 = printPlan('EXPLAIN post_search with textSearch', searchWithQuery)
  const ok4 = keyLookup ? printPlan('EXPLAIN api_key lookup by key_hash', keyLookup) : true

  if (!(ok1 && ok2 && ok3 && ok4)) {
    console.log('\nHint: Supabase에서 PostgREST explain이 꺼져 있으면 아래 에러가 나옵니다.')
    console.log('`None of these media types are available: application/vnd.pgrst.plan+text ...`')
    console.log('이 경우 Dashboard > API settings에서 EXPLAIN 활성화 후 재실행하세요.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
