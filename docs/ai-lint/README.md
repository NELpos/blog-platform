# AI-Lint Doctrine

## Goal
Enforce repeatable lint quality gates in harness workflows with clear remediation steps.

## Policy
- Use ESLint CLI directly (`eslint .`) for Next.js 16+ projects.
- Keep ruleset changes incremental. Do not introduce broad rule expansion by default.
- Do not use suppressions files (for example `eslint-suppressions.json`) in this repository.
- Keep autofix bounded to attempt 1 in the lint loop.

## Standard Flow
1. Run `pnpm lint:ci`.
2. If failing, run AI-Lint diagnostics (`pnpm ai-lint:check`).
3. Attempt 1 may use autofix (`pnpm lint:fix`).
4. Attempts 2 and 3 require manual structural fixes for non-fixable violations.
5. Record findings and manual fixes in `docs/changes/*`.

## References
- Rule mapping: `docs/ai-lint/rule-catalog.md`
- Remediation loop: `docs/ai-lint/remediation-playbook.md`
