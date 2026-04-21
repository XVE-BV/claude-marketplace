#!/bin/bash
# Blocks Claude from accessing .env files via Read/Edit/Write/Bash/Grep tools

INPUT=$(cat)
TOOL=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null)

is_env_file() {
  local f="$1"
  echo "$f" | grep -qE '(^|/)\.env(\.|$)' || return 1
  # Allow safe templates
  echo "$f" | grep -qE '(^|/)\.env\.(example|sample|dist|template)$' && return 1
  return 0
}

case "$TOOL" in
  Read|Edit|Write|NotebookEdit)
    FILE=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
    if is_env_file "$FILE"; then
      echo "env-guard: .env file access blocked ($FILE)"
      exit 2
    fi
    ;;
  Grep)
    PATH_ARG=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('path',''))" 2>/dev/null)
    if is_env_file "$PATH_ARG"; then
      echo "env-guard: grep on .env file blocked ($PATH_ARG)"
      exit 2
    fi
    ;;
  Bash)
    CMD=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)
    if echo "$CMD" | grep -qE '\.env(\b|\.)'; then
      # Allow references to safe templates
      if ! echo "$CMD" | grep -qE '\.env\.(example|sample|dist|template)'; then
        echo "env-guard: bash command references .env file — blocked"
        exit 2
      fi
    fi
    ;;
esac

exit 0
