# Change Report

## Summary
Normalized repository-level agent guidance and rebuilt harness engineering docs to a layered v2 structure.

## KR Request
AGENTS.md 잔존 하네스 실험 흔적을 정리하고, 코드베이스에 맞는 Harness Engineering 운영 체계를 계층 문서 기반으로 재구성.

## EN Agent Prompt
Review and normalize AGENTS.md by removing legacy harness experiment coupling, then rebuild a decision-complete harness engineering document system using thin root policy, layered docs under docs/, explicit skill selection at planning, KR-to-EN prompt conversion, domain-specific frontend/backend/db flows, pre-implementation quality gates, bounded retry loops, E2E workflow, and final code-review requirements.

## Selected Skills
- code-review
- skill-creator

## Files Changed
- `AGENTS.md`
- `README.md`
- `docs/done/README.md`
- `docs/harness/workflow.md`
- `docs/harness/templates/plan.template.md`
- `docs/harness/templates/change-report.template.md`
- `docs/harness/templates/e2e-report.template.md`
- `docs/harness/legacy/README.md`
- `docs/agent-layers/README.md`
- `docs/agent-layers/01-core-governance.md`
- `docs/agent-layers/02-feature-planning.md`
- `docs/agent-layers/03-frontend-flow.md`
- `docs/agent-layers/04-backend-flow.md`
- `docs/agent-layers/05-db-flow.md`
- `docs/agent-layers/06-quality-gates.md`
- `docs/agent-layers/07-parallel-and-loop.md`
- `docs/agent-layers/08-reporting.md`
- `docs/agent-layers/09-e2e-automation.md`
- `docs/agent-layers/10-final-review.md`
- `docs/changes/README.md`
- moved: `docs/harness/*` old role/template/workflow docs -> `docs/harness/legacy/*`

## Acceptance Criteria Result
- AGENTS.md no longer hard-codes old harness role-layer contracts: passed
- Root policy converted to thin-root + layered references: passed
- Legacy harness docs preserved under archive path: passed
- New v2 harness workflow/templates created: passed
- Change reporting path migrated to docs/changes: passed

## Test Matrix
- Static document verification (paths/links/consistency): passed
- Build/lint/e2e: not run (docs-only changes)

## Defects Found and Fixed
- Residual `docs/harness/roles/*` dependency in root and README replaced with layered docs model.
- `docs/done` template pointer updated to avoid stale active-process guidance.

## Remaining Risks
- Existing human habits may still reference legacy docs until team onboarding updates.
- If downstream automation expects old template names, additional migration mapping may be needed.
