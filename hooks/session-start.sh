#!/bin/bash
# Claude Code SessionStart hook — injects context based on env var config
# Set vars in ~/.zshrc; see .env.example for full template

CONTEXT=""

# Advisor (default: enabled)
if [ "${DISABLE_ADVISOR:-0}" = "1" ]; then
    CONTEXT="${CONTEXT}Advisor is DISABLED (DISABLE_ADVISOR=1). Do not call advisor() under any circumstances. "
fi

# Kimai / ClockIt (default: disabled)
if [ "${ENABLE_KIMAI:-0}" != "1" ]; then
    CONTEXT="${CONTEXT}Kimai/ClockIt time tracking is DISABLED (ENABLE_KIMAI not set to 1). Do not suggest or use the clockit agent, /k /ks /ke commands, or any Kimai API calls. "
fi

# ActivityWatch (default: disabled)
if [ "${ENABLE_ACTIVITYWATCH:-0}" != "1" ]; then
    CONTEXT="${CONTEXT}ActivityWatch is DISABLED (ENABLE_ACTIVITYWATCH not set to 1). Do not suggest or use the activitywatch agent, /aw /aw-week /aw-setup commands, or any ActivityWatch API calls. "
fi

[ -z "$CONTEXT" ] && exit 0

CONTEXT_JSON=$(printf '%s' "$CONTEXT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))")
echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":$CONTEXT_JSON}}"
