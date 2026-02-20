import fs from 'node:fs'
import { performance } from 'node:perf_hooks'
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

function parseRuns() {
  const arg = process.argv.find((item) => item.startsWith('--runs='))
  const value = arg ? Number(arg.slice('--runs='.length)) : 60
  if (!Number.isFinite(value) || value < 5) return 60
  return Math.floor(value)
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p))
  return sorted[idx]
}

async function timed(label, fn, runs) {
  const samples = []
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now()
    const { error } = await fn()
    const t1 = performance.now()
    if (error) throw new Error(`${label} failed: ${error.message}`)
    samples.push(t1 - t0)
  }
  samples.sort((a, b) => a - b)
  return {
    p50: Number(percentile(samples, 0.5).toFixed(3)),
    p95: Number(percentile(samples, 0.95).toFixed(3)),
    p99: Number(percentile(samples, 0.99).toFixed(3)),
    avg: Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(3)),
    min: Number(samples[0].toFixed(3)),
    max: Number(samples[samples.length - 1].toFixed(3)),
  }
}

async function main() {
  loadEnvLocal()
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const runs = parseRuns()

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
    console.log('No posts found. Benchmark skipped.')
    return
  }

  const { data: sampleKey } = await supabase
    .from('api_keys')
    .select('key_hash')
    .limit(1)
    .maybeSingle()

  // Warm-up run
  for (let i = 0; i < 8; i += 1) {
    await supabase
      .from('posts')
      .select('id')
      .eq('author_id', samplePost.author_id)
      .eq('slug', samplePost.slug)
      .limit(1)
  }

  const readBySlug = await timed(
    'post_read_by_slug',
    () =>
      supabase
        .from('posts')
        .select('id, title, slug, updated_at')
        .eq('author_id', samplePost.author_id)
        .eq('slug', samplePost.slug)
        .limit(1),
    runs,
  )

  const searchNoQuery = await timed(
    'post_search_no_query',
    () =>
      supabase
        .from('posts')
        .select('id, title, slug, updated_at')
        .eq('author_id', samplePost.author_id)
        .order('updated_at', { ascending: false })
        .limit(10),
    runs,
  )

  const searchWithQuery = await timed(
    'post_search_with_query',
    () =>
      supabase
        .from('posts')
        .select('id, title, slug, updated_at')
        .eq('author_id', samplePost.author_id)
        .textSearch('search_tsv', 'mcp context', { type: 'websearch', config: 'simple' })
        .order('updated_at', { ascending: false })
        .limit(10),
    runs,
  )

  let apiKeyLookup = null
  if (sampleKey?.key_hash) {
    apiKeyLookup = await timed(
      'api_key_lookup',
      () =>
        supabase
          .from('api_keys')
          .select('id, user_id, status, expires_at, revoked_at')
          .eq('key_hash', sampleKey.key_hash)
          .limit(1),
      runs,
    )
  }

  console.log(
    JSON.stringify(
      {
        runs,
        sample: samplePost,
        units: 'ms',
        readBySlug,
        searchNoQuery,
        searchWithQuery,
        apiKeyLookup,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
