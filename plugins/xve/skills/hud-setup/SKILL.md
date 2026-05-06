---
description: Wire the xve-hud statusline into ~/.claude/settings.json.
disable-model-invocation: true
---

Install the XVE statusline (xve-hud). Adds a handoff-urgency banner on top of the claude-pace-derived quota lines.

## Prerequisites

`jq` must be installed. Check:

```bash
command -v jq >/dev/null && echo "jq OK" || echo "jq MISSING — install it first (brew install jq / apt install jq)"
```

If missing, stop and tell the user to install it, then re-run this command.

## Step 1 — Locate the script

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/statusline/xve-hud.sh"
[ -x "$SCRIPT" ] || { echo "xve-hud.sh not found or not executable at $SCRIPT"; exit 1; }
```

## Step 2 — Merge statusLine into ~/.claude/settings.json

Read existing `~/.claude/settings.json`. If it already has a `statusLine` block pointing at a different command, ask the user:

> "Your ~/.claude/settings.json already has a statusLine pointing at `<existing command>`. Replace it with xve-hud? [Y/n]"

If yes (or no existing statusLine), merge in:

```json
{
  "statusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/statusline/xve-hud.sh"
  }
}
```

Preserve all other top-level keys. Use `jq` for the merge to avoid corrupting the file.

## Step 3 — Verify

Print the resulting `statusLine` block:

```bash
jq '.statusLine' ~/.claude/settings.json
```

Confirm the command path resolves at runtime and remind the user to **fully restart Claude Code** (not just reload) for the statusline change to take effect.

## Step 4 — Summary

```
XVE Statusline (xve-hud)
────────────────────────
jq:              ✓
script present:  ✓
settings.json:   ✓ statusLine wired
```

Tell the user: after restart they'll see a quiet statusline under 60% context, an amber "handoff soon" banner at 60-85%, and a red "handoff NOW" banner at 85%+. Amber also trips early (at 50%+ context) if the 5h quota pace is ⇡15%+ — a heads-up that the 60% threshold is arriving sooner than expected.
