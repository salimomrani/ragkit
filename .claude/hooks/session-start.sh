#!/bin/bash
# Hook: SessionStart (once: true) — injects RagKit constitution into context once per session.
# Avoids having to read constitution.md manually on every architectural decision.

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null)"
CONSTITUTION="$REPO_ROOT/.specify/memory/constitution.md"

if [ -f "$CONSTITUTION" ]; then
  echo "=== RagKit Architecture Constitution (auto-loaded) ==="
  cat "$CONSTITUTION"
  echo "=== End Constitution ==="
fi
