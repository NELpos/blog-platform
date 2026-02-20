# MCP Performance Harness

MCP tool (`post_search`, `post_read`, `post_create`) 성능 점검용 실행 가이드입니다.

## 1) Commands

```bash
pnpm mcp:bench -- --runs=60
pnpm mcp:explain
```

- `mcp:bench`: PostgREST end-to-end latency 실측(p50/p95/p99)
- `mcp:explain`: Postgres 실행 계획(EXPLAIN ANALYZE) 확인

## 2) EXPLAIN enable checklist

`pnpm mcp:explain` 실행 시 아래 에러가 나오면 EXPLAIN이 비활성 상태입니다.

```text
None of these media types are available: application/vnd.pgrst.plan+text ...
```

Supabase Dashboard에서 PostgREST EXPLAIN을 활성화한 뒤 재실행합니다.

## 3) Latest benchmark (2026-02-19)

Runs: `60`  
Units: `ms`

- `readBySlug`
  - p50: `40.033`
  - p95: `113.251`
  - p99: `121.066`
  - avg: `49.266`
- `searchNoQuery`
  - p50: `41.410`
  - p95: `110.892`
  - p99: `138.187`
  - avg: `48.589`
- `searchWithQuery`
  - p50: `38.397`
  - p95: `119.394`
  - p99: `129.102`
  - avg: `46.104`
- `apiKeyLookup`
  - p50: `39.745`
  - p95: `82.110`
  - p99: `111.600`
  - avg: `45.679`

## 4) Result log template

아래 블록을 복사해 회차별로 append 하세요.

```md
## Benchmark (YYYY-MM-DD HH:mm, runs=N)

- readBySlug: p50=?, p95=?, p99=?, avg=?
- searchNoQuery: p50=?, p95=?, p99=?, avg=?
- searchWithQuery: p50=?, p95=?, p99=?, avg=?
- apiKeyLookup: p50=?, p95=?, p99=?, avg=?

Notes:
- (example) EXPLAIN enabled/disabled
- (example) index added/removed
- (example) region/network condition
```
