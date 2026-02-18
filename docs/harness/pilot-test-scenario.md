# Harness Pilot Test Scenario (v1)

## Goal
Verify that the harness workflow works end-to-end with one small real feature.

## Pilot Workstream
- Name: `studio-command-palette-polish`
- Scope:
  - In command palette, show current post badge
  - Add empty-state help text for zero search results
  - Keep `Esc` close behavior stable
- Out of scope:
  - DB schema changes
  - New API endpoints

## Duration
- Target: 1 working day

## Roles and Deliverables
1. Frontend Designer Agent
- Output: `docs/harness/runs/<date>-design-proposal.md`
- Use template: `docs/harness/templates/design-proposal.template.md`

2. Beta User Agent
- Output: `docs/harness/runs/<date>-beta-feedback.md`
- Use template: `docs/harness/templates/beta-feedback.template.md`

3. UX Engineer Agent
- Output: `docs/harness/runs/<date>-ux-review.md`
- Use template: `docs/harness/templates/ux-review.template.md`

4. Orchestration Agent (Gate 1)
- Decision record: `APPROVED` or `REVISE`
- Write decision at bottom of UX review doc

5. Next.js Dev Lead Agent
- Output: `docs/harness/runs/<date>-execution-plan.md`
- Use template: `docs/harness/templates/execution-plan.template.md`
- Create 2-3 slices:
  - slice A: command list UI
  - slice B: keyboard/interaction handling
  - slice C: tests/manual checks + docs sync

6. Orchestration Agent (Gate 2)
- Decision record: `APPROVED` or `REVISE`
- Write decision at bottom of execution plan doc

7. Next.js Engineer Agent(s)
- Implement approved slices only
- Each slice must include checks and done criteria evidence

8. Dev Lead Completion Report
- Output: `docs/done/<date>-studio-command-palette-polish-done.md`
- Use template: `docs/harness/templates/done-report.template.md`

## Required Checks
- `pnpm lint`
- `pnpm build` (or note environment blocker)
- Manual checks:
  - `Cmd/Ctrl + K` opens palette
  - `Esc` closes palette
  - Empty search result renders guidance text
  - Selecting post with unsaved changes follows save/cancel flow

## Pass Criteria
1. No implementation starts before Gate 2 approval.
2. All outputs are present in expected files.
3. Feature slices are non-overlapping and owner-assigned.
4. Done report includes scope, checks, unresolved risks, next actions.

## Failure Injection (Mandatory)
Run one intentional failure test:
- Attempt to start implementation before Gate 2.
- Expected result: Orchestration blocks start and requests missing approval record.

Record the outcome in the done report under `Unresolved Risks` or `Next Actions`.

## Debrief (15 minutes)
After completion, answer:
1. Which handoff caused the most delay?
2. Which template field was ambiguous?
3. Which approval gate criteria should be clarified?
4. What should be automated next (v2: scripts/CI)?
