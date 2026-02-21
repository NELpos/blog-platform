# Layer 06: Quality Gates

## Pre-Implementation Gate
Must define:
- functional acceptance criteria
- test scenarios (unit/integration/E2E where relevant)
- failure expectations and non-goals

## Minimum Verification
- `pnpm lint:ci`
- targeted automated tests for changed behavior
- `pnpm build`
- E2E for user-facing flow changes

## AI-Lint Gate Order
1. Run `pnpm lint:ci` first as the static quality gate.
2. If lint fails, apply AI-Lint remediation workflow (`docs/ai-lint/remediation-playbook.md`).
3. Run targeted tests and `pnpm build` only after lint gate passes.
