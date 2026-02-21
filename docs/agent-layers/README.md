# Agent Layers

Use progressive disclosure. Start at layer 01, then open only needed docs for the task.

AI-Lint doctrine references live in `docs/ai-lint/*` and are used with quality/retry layers.

## Layer Map
- `00-founder-context.md`: founder intent, product direction, and operating mindset
- `01-core-governance.md`: global constraints, decision gates, source priority
- `02-feature-planning.md`: plan-first flow, skill-selection question, KR->EN prompt conversion
- `03-frontend-flow.md`: Stitch-first design path for new/large UI, then shadcn implementation review
- `04-backend-flow.md`: API/session/authz review before backend code changes
- `05-db-flow.md`: DB skill and migration/RLS checks
- `06-quality-gates.md`: definition of done and test gates before coding
- `07-parallel-and-loop.md`: parallelization and retry loop limits
- `08-reporting.md`: change report rules in `docs/changes/*`
- `09-e2e-automation.md`: agent-browser -> chrome-devtools -> playwright sequence
- `10-final-review.md`: final code review expectations
