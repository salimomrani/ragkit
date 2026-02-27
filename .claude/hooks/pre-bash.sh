#!/bin/bash
# PreToolUse hook — enforces project rules on every Bash command.
# Exit 2 = block | Exit 0 = allow

COMMAND=$(cat | jq -r '.tool_input.command // ""')

# Strip heredoc bodies so patterns don't match inside commit messages.
# Extracts delimiter after <</'<< then skips body lines until closing delimiter.
COMMAND_STRIPPED=$(echo "$COMMAND" | awk '
  /<</ {
    tmp = $0
    gsub(/^.*<<'"'"'?/, "", tmp)
    gsub(/[^A-Za-z_0-9].*$/, "", tmp)
    delim = tmp
    in_hd = 1; print; next
  }
  in_hd { if ($0 == delim) in_hd = 0; next }
  { print }
')

# Block: npm install / uninstall outside frontend/
if echo "$COMMAND_STRIPPED" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+(install|i|uninstall|un)(\s|$)'; then
  current_dir=$(pwd)
  in_frontend=0
  # Allow if already inside frontend/ directory
  if echo "$current_dir" | grep -qE '/frontend(/|$)'; then
    in_frontend=1
  fi
  # Allow if command explicitly navigates into frontend/ first
  if echo "$COMMAND_STRIPPED" | grep -qE '(^|[;&|[:space:]])cd[[:space:]]+([^;&|]*\/)?frontend([[:space:]]|$|/)'; then
    in_frontend=1
  fi
  if [ "$in_frontend" -eq 0 ]; then
    echo "BLOCKED: 'npm install' is only allowed inside frontend/. Run: cd frontend && npm install" >&2
    exit 2
  fi
fi

# Block: git push targeting master (explicit)
if echo "$COMMAND_STRIPPED" | grep -qE 'git push\s+.*\bmaster\b|git push\s+master\b'; then
  echo "BLOCKED: Direct push to master is forbidden. Create a branch and open a PR: git checkout -b <branch> && git push -u origin <branch>" >&2
  exit 2
fi

# Block: git push (implicit) while on master branch
if echo "$COMMAND_STRIPPED" | grep -qE '^\s*git push(\s+(origin|-u\s+origin|--[a-z-]+))*\s*$'; then
  current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$current_branch" = "master" ]; then
    echo "BLOCKED: Direct push to master is forbidden. Create a branch and open a PR: git checkout -b <branch> && git push -u origin <branch>" >&2
    exit 2
  fi
fi
