#!/bin/bash
# Hook: PreToolUse (Bash) — PALO project-specific rules.
# Global rules (force-push, master push, --no-verify) handled by pre-bash-global.sh.
# Exit 2 = block | Exit 0 = allow

COMMAND=$(cat | jq -r '.tool_input.command // ""')

# Strip heredoc bodies so patterns don't match inside commit messages.
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
  if echo "$current_dir" | grep -qE '/frontend(/|$)'; then
    in_frontend=1
  fi
  if echo "$COMMAND_STRIPPED" | grep -qE '(^|[;&|[:space:]])cd[[:space:]]+([^;&|]*\/)?frontend([[:space:]]|$|/)'; then
    in_frontend=1
  fi
  if [ "$in_frontend" -eq 0 ]; then
    echo "BLOCKED: 'npm install' is only allowed inside frontend/. Run: cd frontend && npm install" >&2
    exit 2
  fi
fi
