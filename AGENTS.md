# Repository Guidelines

## Purpose & Scope
This document is the agent operating guide for this repository.

- `AGENTS.md`: task execution rules and reference priority for agents
- `README.md`: human-facing project overview and onboarding

When references conflict, use this priority:
1. Source code and schema (`src/*`, `supabase/*`)
2. Operational docs (`AGENTS.md`, `README.md`, `docs/*`)
3. Historical artifacts (`tasks/*`, `artifacts/*`, `docs/done/*`)

## Project Snapshot (Codebase-based)
- `src/app/dashboard`: post management index (search, bulk actions)
- `src/app/studio`, `src/app/studio/new`: focused writing and editing studio
- `src/app/blog/[workspace_slug]/[post_slug]`: public post page
- `src/app/api/posts/*`: post CRUD, bulk actions, pending update workflow
- `src/app/api/public/workspaces/[workspace_slug]/*`: public feed and search event endpoints
- `src/app/login`, `src/components/auth/*`: Google OAuth + Google One Tap entry points
- `src/components/blog/PostStudio.tsx`: main studio workflow UI
- `supabase/*`: schema, RLS, triggers, migrations

## Task-first Reference Layers
Use this map before implementation.

### Post API / Save Workflow
- Layer 1: `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`, `src/app/api/posts/bulk/route.ts`
- Layer 2: `README.md`, `docs/harness/workflow.md`
- Layer 3: `tasks/editor-rebuild/*`, `artifacts/*`

### Studio / Editor UX
- Layer 1: `src/components/blog/PostStudio.tsx`, `src/components/editor/MarkdownEditor.tsx`, `src/components/blog/PostViewer.tsx`
- Layer 2: `README.md`, `docs/harness/roles/frontend-designer.md`, `docs/harness/roles/ux-engineer.md`
- Layer 3: `artifacts/stitch/*`, `artifacts/03-editor-ui.md`

### Public Rendering
- Layer 1: `src/components/blog/MarkdownRenderer.tsx`, `src/lib/markdown/*`, `src/app/blog/[workspace_slug]/[post_slug]/page.tsx`
- Layer 2: `README.md`
- Layer 3: `tasks/editor-rebuild/04-renderer-integration.md`, `artifacts/04-renderer-integration.md`

### Public Feed / Search
- Layer 1: `src/app/api/public/workspaces/[workspace_slug]/posts/route.ts`, `src/app/api/public/workspaces/[workspace_slug]/search-events/route.ts`, `src/lib/public/posts.ts`, `src/components/blog/PublicPostFeed.tsx`, `src/components/blog/PublicPostSearchBar.tsx`
- Layer 2: `README.md`
- Layer 3: `supabase/migrations/20260218_public_posts_search_fts.sql`, `supabase/migrations/20260218_public_posts_korean_search_trgm.sql`, `supabase/migrations/20260218_public_search_events.sql`

### Auth / Session
- Layer 1: `src/components/auth/GoogleOneTap.tsx`, `src/components/auth/LoginForm.tsx`, `src/app/auth/callback/route.ts`, `src/lib/supabase/middleware.ts`
- Layer 2: `docs/SUPABASE_SETUP.md`, `README.md`
- Layer 3: `tests/e2e/auth.setup.spec.ts`

### DB / Migration / RLS
- Layer 1: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/triggers.sql`, `supabase/migrations/*`
- Layer 2: `docs/SUPABASE_SETUP.md`, `README.md`
- Layer 3: `tasks/editor-rebuild/01-schema-api.md`, `artifacts/01-schema-api.md`


## Build, Test, and Development Commands
- `pnpm dev`: start local dev server at `http://localhost:3000`
- `pnpm lint`: run ESLint checks
- `pnpm build`: production build and type checks
- `pnpm start`: run built app locally
- `pnpm e2e:install`: install Playwright Chromium
- `pnpm e2e:setup`: capture Google OAuth session for E2E
- `pnpm e2e`: run studio E2E scenario

Before PR:
- `pnpm lint && pnpm build`

## Coding Style & Naming Conventions
- Language: TypeScript (`strict`)
- Components: `PascalCase` filenames (e.g. `PostStudio.tsx`)
- Routes: Next.js App Router lowercase segments with dynamic params
- Utilities: lowercase files under `src/lib`
- Style: single quotes, no semicolons, 2-space indentation

## Testing Guidelines
Primary checks:
- `pnpm lint`
- `pnpm build`
- `pnpm e2e` (after `pnpm e2e:setup` when auth state is missing)

Manual checks:
- login (Google OAuth / One Tap fallback)
- dashboard post index (search, bulk actions)
- studio save/publish/view workflow
- public blog feed/search and post page rendering

## Commit & PR Guidelines
- Use clear imperative commit messages
- Keep PR scope focused
- Describe behavior changes and affected routes/APIs
- Add screenshots for UI changes
- Note any Supabase schema/RLS/env changes
