# AI-Lint Remediation Playbook

## Finding Record Format
For each lint issue, capture:
- `ruleId`
- `severity`
- `file`
- `line`
- `root_cause`
- `fix_action`
- `retest_command`

## Loop Protocol (Max 3)
1. Attempt 1
- Run `pnpm lint:ci`.
- If failed and fixable issues exist, run `pnpm lint:fix`.
- Re-run `pnpm lint:ci`.

2. Attempt 2
- For remaining non-fixable issues, apply manual structural fixes.
- Re-run `pnpm lint:ci`.

3. Attempt 3
- Final manual correction for remaining blockers.
- Re-run `pnpm lint:ci`.
- If still failing, mark as blocker and report options.

## Root Cause Guardrail
- Start each attempt with a root-cause hypothesis and evidence snapshot.
- If the same strategy fails twice, stop and present a new hypothesis before attempt 3.

## Blocker Report
When 3 attempts fail, include:
- top failing `ruleId`s
- impacted files
- why autofix did not apply
- recommended next actions

## Reporting Requirement
Write the lint loop result to `docs/changes/*` with:
- lint findings summary
- autofix iterations
- manual fix notes
