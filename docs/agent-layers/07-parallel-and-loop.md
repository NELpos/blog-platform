# Layer 07: Parallel and Retry Loop

## Parallelization Rule
Parallelize only when tasks are independent by file/interface ownership.

## Retry Rule
If validation fails:
1. Diagnose root cause.
2. Apply focused fix.
3. Re-run affected checks.

Default maximum auto-fix loop: 3 attempts. After 3 failures, report blocker and options.

## Wrong-Approach Guardrail
- If the same approach fails twice, stop and re-analyze from scratch.
- Present the new root-cause hypothesis before attempting a third fix.

## AI-Lint Loop Contract
- Attempt 1: allow autofix (`pnpm lint:fix`) for fixable violations.
- Attempt 2: manual structural fix for non-fixable violations, then `pnpm lint:ci`.
- Attempt 3: final manual fix and verification. If still failing, mark as blocker with root cause and options.
