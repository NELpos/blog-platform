# 01-schema-api

## Objective
Migrate posts canonical content from `content` JSONB to `content_markdown` TEXT.

## Inputs
- `supabase/schema.sql`
- `supabase/migrations/*`
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`
- `src/types/database.types.ts`

## Deliverables
- migration SQL for hard delete + schema switch
- updated API contracts using `content_markdown`
- updated generated-like DB typings

## Done Criteria
- no API path reads/writes `posts.content`
- schema defines only `content_markdown`
