#!/usr/bin/env bash
set -euo pipefail

# Install sub-agent templates bundled in this skill to Claude Code agents directory.
# Usage:
#   bash scripts/install-claude-subagents.sh           # install to project .claude/agents
#   bash scripts/install-claude-subagents.sh --global  # install to ~/.claude/agents

MODE="project"
if [[ "${1:-}" == "--global" ]]; then
  MODE="global"
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$SKILL_DIR/assets/sub-agents"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "[error] source directory not found: $SRC_DIR" >&2
  exit 1
fi

if [[ "$MODE" == "global" ]]; then
  DEST_DIR="$HOME/.claude/agents"
else
  DEST_DIR="$(pwd)/.claude/agents"
fi

mkdir -p "$DEST_DIR"

count=0
for file in "$SRC_DIR"/*.md; do
  [[ -f "$file" ]] || continue
  cp -f "$file" "$DEST_DIR/"
  count=$((count + 1))
done

echo "[ok] installed $count sub-agent file(s) to: $DEST_DIR"
echo "[next] restart Claude Code to pick up new project/user agents if needed."
