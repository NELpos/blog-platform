# Layer 01: Core Governance

## Goal
Keep agent execution predictable, auditable, and minimal.

## Source Priority
1. Code/schema: `src/*`, `supabase/*`
2. Ops docs: `AGENTS.md`, `README.md`, `docs/agent-layers/*`, `docs/harness/*`
3. Historical context: `tasks/*`, `artifacts/*`, `docs/done/*`, `docs/harness/legacy/*`

## Global Rules
- Do not skip planning for feature work.
- Ask for clarification if requirement affects architecture or interfaces.
- Keep scope explicit: in-scope/out-of-scope.
- Require acceptance criteria before implementation.
- Record all major changes in `docs/changes/*`.

## Debugging and Bug Fix Rules
- Before writing a bug fix, record a `Root Cause Hypothesis` and supporting `Evidence`.
- Do not apply symptom-only patches without tracing the execution path.
- If evidence is weak or conflicting, re-investigate before code edits.
