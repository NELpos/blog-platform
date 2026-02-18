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

### DB / Migration / RLS
- Layer 1: `supabase/schema.sql`, `supabase/rls.sql`, `supabase/triggers.sql`, `supabase/migrations/*`
- Layer 2: `docs/SUPABASE_SETUP.md`, `README.md`
- Layer 3: `tasks/editor-rebuild/01-schema-api.md`, `artifacts/01-schema-api.md`

### Harness Process / Team Workflow
- Layer 1: `docs/harness/workflow.md`, `docs/harness/roles/*`, `docs/harness/templates/*`
- Layer 2: `AGENTS.md`, `README.md`
- Layer 3: `agents/orchestrator/README.md`, `docs/done/*`

## Build, Test, and Development Commands
- `pnpm dev`: start local dev server at `http://localhost:3000`
- `pnpm lint`: run ESLint checks
- `pnpm build`: production build and type checks
- `pnpm start`: run built app locally

Before PR:
- `pnpm lint && pnpm build`

## Coding Style & Naming Conventions
- Language: TypeScript (`strict`)
- Components: `PascalCase` filenames (e.g. `PostStudio.tsx`)
- Routes: Next.js App Router lowercase segments with dynamic params
- Utilities: lowercase files under `src/lib`
- Style: single quotes, no semicolons, 2-space indentation

## Harness Engineering Model (Roles)
1. Orchestration Agent: owns end-to-end flow and approval gates
2. Frontend Designer Agent: creates Stitch proposal and shadcn feasibility mapping
3. Beta User Agent: first-time user critique and edge-case feedback
4. UX Engineer Agent: converts beta feedback into prioritized UX changes
5. Next.js Dev Lead Agent: decomposes approved work into feature slices and assigns implementation
6. Next.js Engineer Agent(s): implement slices with tests and report completion

## Approval Gates (2-stage)
- Gate 1: design direction approved by user
- Gate 2: implementation-ready spec approved by user

No implementation starts before Gate 2 is approved.

## Task Lifecycle
1. Intake by Orchestration Agent
2. Design proposal (`design-proposal`)
3. Beta feedback (`beta-feedback`)
4. UX review (`ux-review`)
5. User approval gates
6. Execution plan + feature-slice tasks
7. Implementation and verification
8. Done report in `docs/done/*`

## Execution Rules
- Prefer feature-slice parallelization: each slice should include UI/API/data/test impact
- Avoid overlapping ownership for the same files where possible
- If blocked, record cause + unblock condition explicitly
- Keep docs synced when changing routes, APIs, or schema

## Done Reporting
When a cycle is completed, create a record in:
- `docs/done/YYYY-MM-DD-<workstream>-done.md`

Minimum fields:
- scope
- completed slices
- verification evidence
- unresolved risks
- next actions

## Testing Guidelines
No dedicated test runner is configured yet.

Use:
- `pnpm lint`
- `pnpm build`
- manual checks for login, dashboard, studio, publish/view flows

## Commit & PR Guidelines
- Use clear imperative commit messages
- Keep PR scope focused
- Describe behavior changes and affected routes/APIs
- Add screenshots for UI changes
- Note any Supabase schema/RLS/env changes
