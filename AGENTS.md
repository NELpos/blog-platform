# Repository Guidelines

## Purpose & Scope
This file defines the top-level operating contract for agents in this repository.

Reference priority:
1. Source code and schema (`src/*`, `supabase/*`)
2. Operational docs (`AGENTS.md`, `README.md`, `docs/agent-layers/*`, `docs/harness/*`)
3. Historical artifacts (`tasks/*`, `artifacts/*`, `docs/done/*`, `docs/harness/legacy/*`)

## Thin Root Rules
- Keep this file minimal. Put domain-specific guidance in `docs/agent-layers/*`.
- Do not add long role-play process descriptions here.
- If guidance grows, split it into a layer doc and link it.

## Mandatory Feature Workflow
1. Read `docs/research/text.md` when harness design changes are requested.
2. Plan first, then implement (unless user explicitly requests plan-only output).
3. Ask skill choice per feature, convert KR intent to EN execution prompt, and keep outputs in Korean.
4. Resolve ambiguity before coding; define acceptance criteria/tests before implementation.
5. Execute independent work in parallel where safe; use retry loop (max 3 cycles) on failures.
6. For each completed work unit, checkpoint with commit + `docs/changes/*` update + verification results.
7. Apply AI-Lint doctrine (`docs/ai-lint/*`) for feature code changes.
8. Run final code review for major changes.

## Domain Flow Entry Points
- Founder context: `docs/agent-layers/00-founder-context.md`
- Core governance: `docs/agent-layers/01-core-governance.md`
- Feature planning: `docs/agent-layers/02-feature-planning.md`
- Frontend flow: `docs/agent-layers/03-frontend-flow.md`
- Backend flow: `docs/agent-layers/04-backend-flow.md`
- DB flow: `docs/agent-layers/05-db-flow.md`
- Quality gates: `docs/agent-layers/06-quality-gates.md`
- Parallel/retry loop: `docs/agent-layers/07-parallel-and-loop.md`
- Reporting: `docs/agent-layers/08-reporting.md`
- E2E automation: `docs/agent-layers/09-e2e-automation.md`
- Final review: `docs/agent-layers/10-final-review.md`
- AI-Lint doctrine: `docs/ai-lint/*`
- Project intent: `docs/project-intent.md`
- Engineering philosophy: `docs/engineering-philosophy.md`

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
- Components: `PascalCase` filenames
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
