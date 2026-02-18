# Harness Workflow

## Goal
Run frontend product work with clear role contracts, approval gates, and parallel execution.

## End-to-end Flow
1. Intake (Orchestration Agent)
2. Design proposal (Frontend Designer Agent)
3. Beta feedback (Beta User Agent)
4. UX review (UX Engineer Agent)
5. Gate 1: design approval
6. Execution plan + feature slices (Next.js Dev Lead Agent)
7. Gate 2: implementation approval
8. Implementation (Next.js Engineer Agent)
9. Verification and completion report (`docs/done/*`)

## Approval Gates
### Gate 1 - Design Direction Approval
Required inputs:
- `design-proposal`
- `beta-feedback`
- `ux-review`

Pass criteria:
- Target flow is understandable for first-time users
- Proposed UI components are implementable in current stack
- Major UX risks identified and prioritized

### Gate 2 - Implementation Approval
Required inputs:
- `execution-plan`
- feature-slice tasks

Pass criteria:
- Scope is fixed and non-overlapping
- Dependencies are explicit
- Done criteria and checks are defined per slice

## Parallelization Rule
Use **feature slices** as the unit of parallel work:
- each slice includes UI + API + data/test impact
- each slice has one owner
- common/shared foundation changes are handled first

## Status Model
- `pending`
- `in_progress`
- `blocked`
- `review`
- `done`

For `blocked`, include cause and unblock condition.
