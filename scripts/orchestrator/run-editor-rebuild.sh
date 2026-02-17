#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TASK_DIR="$ROOT_DIR/tasks/editor-rebuild"
ARTIFACT_DIR="$ROOT_DIR/artifacts"

TASKS=(
  "01-schema-api"
  "02-markdown-core"
  "03-editor-ui"
  "04-renderer-integration"
  "05-cleanup"
  "06-validation"
)

mkdir -p "$ARTIFACT_DIR"

echo "Starting editor rebuild orchestration"
for task in "${TASKS[@]}"; do
  task_file="$TASK_DIR/${task}.md"
  artifact_file="$ARTIFACT_DIR/${task}.md"

  if [[ ! -f "$task_file" ]]; then
    echo "Missing task definition: $task_file" >&2
    exit 1
  fi

  if [[ ! -f "$artifact_file" ]]; then
    cat > "$artifact_file" <<EOM
# ${task}
- status: pending
- owner: unassigned
- files:
- checks:
- notes:
EOM
  fi

  echo "Task ready: $task"
done

echo "All task definitions are ready. Assign sub-agents and update artifacts in $ARTIFACT_DIR."
