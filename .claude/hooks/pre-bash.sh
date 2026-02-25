#!/bin/bash
# PreToolUse hook — enforces project rules on every Bash command.
# Exit 2 = block | Exit 0 = allow

COMMAND=$(cat | jq -r '.tool_input.command // ""')

# Block: npm install / uninstall (use 'cd frontend && npm install' or 'npm ci')
if echo "$COMMAND" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+(install|i|uninstall|un)(\s|$)'; then
  echo "BLOCKED: 'npm install' is not allowed directly. Use 'cd frontend && npm install' or 'npm ci' inside frontend/." >&2
  exit 2
fi

# Block: git push targeting master
if echo "$COMMAND" | grep -qE 'git push\s+.*\bmaster\b|git push\s+master\b'; then
  echo "BLOCKED: Direct push to master is forbidden. Create a branch and open a PR: git checkout -b <branch> && git push -u origin <branch>" >&2
  exit 2
fi
