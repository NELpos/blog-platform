# E2E Foundation Done

## scope
- Introduce local-first Playwright E2E setup without adding auth bypass logic
- Lock studio regression scenarios around save/version/publish and post switching

## completed slices
- Added Playwright config (`playwright.config.ts`) and auth-state path contract
- Added one-time OAuth capture test (`tests/e2e/auth.setup.ts`)
- Added studio regression suite (`tests/e2e/studio.spec.ts`)
- Added npm scripts: `e2e:install`, `e2e:setup`, `e2e`
- Updated docs (`README.md`, `docs/harness/workflow.md`)

## verification evidence
- `pnpm exec playwright test tests/e2e/auth.setup.spec.ts --list`
- `pnpm exec playwright test tests/e2e/studio.spec.ts --list`
- `pnpm lint`

## unresolved risks
- OAuth session expiry requires rerunning `pnpm e2e:setup`
- CI integration intentionally deferred (local-first scope)

## next actions
- Add CI smoke E2E for one critical path after auth strategy for CI is finalized
- Expand regression set to dashboard bulk actions and public render parity
