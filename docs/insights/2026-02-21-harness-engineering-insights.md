# Harness Engineering Retrospective (2026-02-21)

## Context
This document summarizes the full harness-engineering evolution completed in this repository, including normalization, AI-Lint integration, founder-context codification, usage-report-driven improvements, and lightweight consolidation.

Source reports:
- `docs/changes/2026-02-21-harness-normalization-change.md`
- `docs/changes/2026-02-21-ai-lint-standard-integration-change.md`
- `docs/changes/2026-02-21-founder-context-and-onboarding-docs-change.md`
- `docs/changes/2026-02-21-usage-report-harness-gap-closure-change.md`
- `docs/changes/2026-02-21-harness-docs-lightweight-cleanup-change.md`

## What Changed

### 1) Governance Reset: Legacy to Layered v2
- Root `AGENTS.md` shifted to thin-root policy.
- Legacy harness experiments were archived under `docs/harness/legacy/*`.
- Active operating model moved to layered docs under `docs/agent-layers/*`.
- Reporting moved to `docs/changes/*` as the default completion ledger.

### 2) AI-Lint as an Operational Gate
- Added explicit lint gate contracts (`lint`, `lint:fix`, `lint:ci`, `ai-lint:check`, `ai-lint:loop`).
- Added doctrine docs under `docs/ai-lint/*` and scripts under `scripts/ai-lint/*`.
- Enforced bounded loop behavior (autofix first, manual structural fixes after).
- Closed real warnings and validated zero-warning state.

### 3) Founder/Intent/Onboarding Codification
- Added founder context and product intent docs.
- Captured KPI baselines and context-reuse philosophy.
- Added platform onboarding docs for user-facing workflow (not code contributor onboarding).

### 4) Usage-Report-Informed Guardrails
Core improvements from usage-pattern analysis:
- root-cause-first bugfix flow
- plan-approved -> implement-immediately default
- work-unit checkpointing (commit + report + verification)
- reusable workflow templates (`bugfix-root-cause`, `implement-approved-plan`)

### 5) Lightweight Consolidation
- Removed duplicated field contracts from layer docs.
- Centralized canonical field definitions in harness templates.
- Added template index `docs/harness/templates/README.md`.
- Compressed workflow text while preserving policy coverage.

## High-Leverage Insights

### Insight 1: Context Architecture Beats Prompt Length
Moving from a monolithic instruction style to layered source-of-truth docs reduced ambiguity and made policy drift easier to detect.

### Insight 2: Lint Is Most Useful as a Loop, Not a Command
Single-run lint checks are weak in agent workflows. The practical value came from loop semantics, explicit remediation capture, and bounded retries.

### Insight 3: Root-Cause-First Is a Cost-Control Mechanism
Most wasted iteration comes from symptom fixes. Forcing hypothesis + evidence before code changed iteration quality more than any single tool addition.

### Insight 4: Plan-to-Implement Transition Must Be Explicit
A major stall pattern is “good plan, no code.” Codifying implementation trigger and stop condition reduced plan-only dead ends.

### Insight 5: Documentation Itself Needs Anti-Drift Rules
Harness docs can become noisy quickly. Canonical templates + layer references gave better maintainability than repeating field lists across docs.

## What Worked Well
- Thin root + layered references
- Soft-gate adoption strategy (strong defaults, pragmatic exceptions)
- Explicit change reports per workstream
- Real validation closure (`lint:ci`, `build`, `e2e`)

## Frictions Encountered
- Auth state expiration affected E2E reliability until `pnpm e2e:setup` refresh.
- Existing warnings required manual fixes beyond autofix capability.
- Documentation growth introduced duplication until template canonicalization pass.

## Current Operating Baseline
- Governance: `AGENTS.md`
- Layered rules: `docs/agent-layers/*`
- Lint doctrine: `docs/ai-lint/*`
- Workflow templates: `docs/harness/templates/README.md`
- Completion ledger: `docs/changes/*`

## Remaining Risks
- Soft-gate success depends on disciplined reporting.
- KPI definitions are set, but metric instrumentation quality needs iteration.
- Historical docs remain for traceability and can still be accidentally referenced.

## Next Iteration Priorities
1. KPI instrumentation quality pass
- Ensure event definitions are measurable and queryable end-to-end.

2. Workflow telemetry for reuse rate
- Track template/context retrieval and actual reuse linkage in published outputs.

3. Exception review cadence
- Audit soft-gate exceptions periodically and promote stable rules to hard-gate where justified.

4. One-page operator view
- Add a single "daily harness checklist" for faster execution without sacrificing policy.

## Practical Lessons Learned
- Build harness as product infrastructure, not process overhead.
- Prefer explicit contracts over implied habits.
- Keep rule text short, keep evidence requirements strict.
- Treat context quality as the primary multiplier in agentic development.
