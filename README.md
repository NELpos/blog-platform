# Nelantir Nexus

Nelantir의 Nexus 플랫폼: Next.js App Router + Supabase 기반의 Markdown-first tech blog platform.

## Project Overview
This project separates writing and management flows clearly:
- `Dashboard`: search/manage posts and run bulk operations
- `Studio`: focused writing/editing + save/publish workflow
- `Public Blog`: published post delivery

## Core Features
- Markdown-first post authoring
- Mermaid diagram rendering via markdown fence (` ```mermaid `)
- Studio edit/view workflow with explicit save semantics
- Manual draft save (no timed autosave) with unsaved-change leave warning
- Version history is created on publish only (published snapshots)
- Public post rendering with markdown renderer and shortcode support
- Keyboard-first productivity (quick open, save shortcuts)

## Architecture at a Glance
- App routes: `src/app/*`
- Feature components: `src/components/*`
- Shared libs/utilities: `src/lib/*`
- DB model/policies/migrations: `supabase/*`

Key route groups:
- `src/app/dashboard/page.tsx`
- `src/app/studio/page.tsx`
- `src/app/studio/new/page.tsx`
- `src/app/blog/[workspace_slug]/[post_slug]/page.tsx`

Key APIs:
- `src/app/api/posts/route.ts`
- `src/app/api/posts/[id]/route.ts`
- `src/app/api/posts/bulk/route.ts`

## Getting Started
### Prerequisites
- Node.js 20+
- pnpm 10+

### Install and Run
```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Environment Variables
Copy and fill:
```bash
cp .env.local.example .env.local
```

Optional:
- Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable Google One Tap on `/login`

Supabase setup details:
- `docs/SUPABASE_SETUP.md`

## Development Commands
- `pnpm dev`: start dev server
- `pnpm lint`: lint checks
- `pnpm lint:fix`: lint auto-fix for fixable issues
- `pnpm lint:ci`: lint gate with zero warnings
- `pnpm ai-lint:check`: structured AI-Lint diagnostics report
- `pnpm ai-lint:loop`: AI-Lint loop (autofix pass + blocker diagnostics)
- `pnpm build`: production build
- `pnpm start`: run built app
- `pnpm e2e:install`: install Playwright browser
- `pnpm e2e:setup`: one-time Google OAuth session capture for E2E
- `pnpm e2e`: run studio E2E scenarios with saved auth state

Recommended verification before PR:
```bash
pnpm lint && pnpm build
```

## Database and Migrations
Primary files:
- `supabase/schema.sql`
- `supabase/rls.sql`
- `supabase/triggers.sql`
- `supabase/migrations/*`

When DB behavior changes, add migration and update related docs.

## Key User Flows
1. Login and open Dashboard
2. Open/create a post in Studio
3. Save draft or publish
4. Visit public post page when published
5. Manage published status/delete from management flow

## Agent Operation
- Root policy: `AGENTS.md`
- Layered rules: `docs/agent-layers/*`
- Founder context: `docs/agent-layers/00-founder-context.md`
- Project intent: `docs/project-intent.md`
- Engineering philosophy: `docs/engineering-philosophy.md`
- AI-Lint doctrine: `docs/ai-lint/*`
- Harness workflow: `docs/harness/workflow.md`
- Templates: `docs/harness/templates/*`
- Change reports: `docs/changes/*`
- Legacy harness experiment: `docs/harness/legacy/*`

## Documentation Map
- Agent execution guide: `AGENTS.md`
- Product/dev onboarding: `README.md`
- Product context: `docs/project-intent.md`, `docs/engineering-philosophy.md`
- Harness retrospective insights: `docs/insights/2026-02-21-harness-engineering-insights.md`
- Supabase setup: `docs/SUPABASE_SETUP.md`
- Layered operation docs: `docs/agent-layers/*`
- Harness workflow and templates: `docs/harness/workflow.md`, `docs/harness/templates/README.md`
- Platform user onboarding: `docs/platform-onboarding/*`
- Historical task context: `tasks/*`, `artifacts/*`, `docs/done/*`

## Troubleshooting
- If API returns missing-column errors, verify Supabase migrations are applied
- If content load/save fails, check `/api/posts/*` route logs and auth session
- If public view mismatch appears, verify selected published version and publish/unpublish state
