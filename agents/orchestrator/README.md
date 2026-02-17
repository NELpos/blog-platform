# Editor Rebuild Orchestrator

## Goal
Coordinate markdown-first editor migration work through task artifacts produced by sub-agents.

## Contract
- Input: task definition in `tasks/editor-rebuild/*.md`
- Output: artifact report in `artifacts/<task-id>.md`
- Completion: artifact includes status, changed files, validation, and risks.

## Sub-agent Roles
1. `schema-api-agent`: schema and route migration
2. `editor-agent`: markdown editor and toolbox UX
3. `render-agent`: markdown + shortcode renderer
4. `integration-agent`: dashboard/admin/public integration
5. `cleanup-agent`: dependency and dead-code cleanup
6. `qa-agent`: lint/build/manual verification

## Execution Order
1. `01-schema-api`
2. `02-markdown-core`
3. `03-editor-ui`
4. `04-renderer-integration`
5. `05-cleanup`
6. `06-validation`

## Artifact Format
```md
# <task-id>
- status: done|blocked
- owner: <agent-name>
- files:
  - path
- checks:
  - command + result
- notes:
  - decisions/risks
```
