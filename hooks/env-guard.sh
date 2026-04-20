#!/bin/bash
# Blocks Claude from accessing .env files via Read/Edit/Write/Bash tools

INPUT=$(cat)
TOOL=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null)

case "$TOOL" in
  Read|Edit|Write|NotebookEdit)
    FILE=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
    if echo "$FILE" | grep -qE '(^|/)\.env(\.|$)'; then
      echo "env-guard: .env file access blocked ($FILE)"
      exit 2
    fi
    ;;
  Bash)
    CMD=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)
    if echo "$CMD" | grep -qE '\.env(\b|\.)'; then
      echo "env-guard: bash command references .env file — blocked"
      exit 2
    fi
    ;;
esac

exit 0
