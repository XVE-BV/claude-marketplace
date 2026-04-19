---
description: ActivityWatch setup — audit watchers, verify patterns, compare vs Kimai, install terminal watcher if missing.
---

Use the activitywatch agent to run a full setup audit. Execute all steps in order.

## Step 1 — Discover and check watchers

```bash
curl -s "http://localhost:5600/api/0/buckets/" | python3 -c "
import json, sys
from datetime import datetime, timezone
buckets = json.load(sys.stdin)
for k, v in sorted(buckets.items()):
    print(f'  {k}  (last: {v.get(\"last_updated\",\"\")[:19]})')
"
```

Check for:
- `aw-watcher-window_*` — required
- `aw-watcher-afk_*` — required
- `aw-watcher-web-chrome` or `aw-watcher-web_*` — install from https://activitywatch.net/watchers/
- `aw-watcher-vscode_*` — install from VS Code extension marketplace
- `aw-watcher-terminal_*` — see Step 1b

**Step 1b — Terminal watcher**

If `aw-watcher-terminal_*` missing: check if `~/.config/aw-watcher-terminal.zsh` exists and is sourced in `~/.zshrc`. If file missing, create it:

```zsh
#!/bin/zsh
_AW_TERMINAL_BUCKET="aw-watcher-terminal_$(hostname -s)"
_AW_BASE="http://localhost:5600/api/0"
_AW_CMD_START=0
_AW_LAST_CMD=""
_AW_LAST_CWD=""

_aw_terminal_init() {
    curl -s -X POST "$_AW_BASE/buckets/$_AW_TERMINAL_BUCKET" \
        -H "Content-Type: application/json" \
        -d "{\"client\":\"aw-watcher-terminal\",\"type\":\"app.terminal.activity\",\"hostname\":\"$(hostname -s)\"}" \
        >/dev/null 2>&1
}

_aw_preexec() {
    _AW_CMD_START=$EPOCHSECONDS
    _AW_LAST_CMD="$1"
    _AW_LAST_CWD="$PWD"
}

_aw_precmd() {
    [[ $_AW_CMD_START -eq 0 ]] && return
    local duration=$(( EPOCHSECONDS - _AW_CMD_START ))
    _AW_CMD_START=0
    [[ $duration -lt 2 ]] && return
    local last_cmd="$_AW_LAST_CMD"
    local last_cwd="$_AW_LAST_CWD"
    python3 - "$duration" "$last_cwd" "$last_cmd" "$_AW_BASE" "$_AW_TERMINAL_BUCKET" <<'PYEOF' >/dev/null 2>&1 &
import sys, json, urllib.request
from datetime import datetime, timezone, timedelta
duration=int(sys.argv[1]); cwd=sys.argv[2]; cmd=sys.argv[3]; base=sys.argv[4]; bucket=sys.argv[5]
ts=(datetime.now(timezone.utc)-timedelta(seconds=duration)).strftime('%Y-%m-%dT%H:%M:%S.%f+00:00')
payload=json.dumps([{"timestamp":ts,"duration":duration,"data":{"cwd":cwd,"cmd":cmd,"shell":"zsh"}}]).encode()
req=urllib.request.Request(f"{base}/buckets/{bucket}/events",data=payload,headers={"Content-Type":"application/json"})
urllib.request.urlopen(req,timeout=3)
PYEOF
}

zmodload zsh/datetime
autoload -Uz add-zsh-hook
add-zsh-hook preexec _aw_preexec
add-zsh-hook precmd _aw_precmd
_aw_terminal_init
```

Then add to `~/.zshrc`:
```zsh
[[ -f ~/.config/aw-watcher-terminal.zsh ]] && source ~/.config/aw-watcher-terminal.zsh
```

## Step 2 — Verify customer patterns against real data

For each configured customer pattern, query today (fallback: last 7 days) and show top 5 matched titles/URLs/paths + duration. Flag customers with 0 matches.

Also test exclusion patterns if configured — confirm they're filtering correctly.

## Step 3 — Find unmatched billable time

Query window events that don't match any customer pattern. Show top 10 unmatched titles by duration — user may identify missed billable work.

## Step 4 — Kimai gap analysis

Compare AW time per customer today vs Kimai entries:
```bash
curl -s "https://clockit.xve-web.eu/api/timesheets?size=50&full=1&begin=$(date +%Y-%m-%d)T00:00:00&end=$(date +%Y-%m-%d)T23:59:59" \
  -H "Authorization: Bearer $CLOCKIT_TOKEN" \
  -H "Accept: application/json"
```

If AW shows ≥15min for a customer but no Kimai entry → flag as unlogged.

## Step 5 — Summary report

```
AW Setup Health
───────────────
Watchers:  window ✓  afk ✓  browser ✓  editor ✓  terminal ?
Patterns:  [list each customer with ✓ / ? / ✗]
Unlogged:  [customer Xmin — in AW, no Kimai entry today]
Unmatched: [top 3 suspicious unmatched titles]
```

Offer concrete next steps.
