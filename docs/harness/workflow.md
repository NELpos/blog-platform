# Harness Workflow v2

## Goal
Run feature development with explicit skill selection, layered references, and fixed quality gates.

## End-to-end Flow
1. Intake: capture KR request
2. Skill selection question to user
3. KR -> EN prompt conversion
4. Plan in Korean with acceptance criteria (Gate A)
5. Implement by domain flow immediately after plan approval (unless plan-only explicitly requested)
6. Quality gate: `pnpm lint:ci`, then tests/build/e2e as needed (Gate B)
7. Retry loop on failures (max 3), with root-cause-first analysis
8. Work-unit checkpoint: commit + change report + verification status
9. Final review for major changes and publish/update `docs/changes/*`

## Lint Failure Handling
- Use `docs/ai-lint/remediation-playbook.md` for root-cause mapping and fix steps.
- Keep autofix limited to attempt 1, then manual fixes for non-fixable issues.

## Reference Strategy
- Thin root policy in `AGENTS.md`
- Task-specific details in `docs/agent-layers/*`
- AI-Lint doctrine in `docs/ai-lint/*`
- Canonical templates in `docs/harness/templates/README.md`
- Legacy process retained at `docs/harness/legacy/*`
