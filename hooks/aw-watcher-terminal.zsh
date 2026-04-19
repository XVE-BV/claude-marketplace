#!/bin/zsh
# ActivityWatch terminal watcher — tracks CWD + command duration per shell command

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
    [[ $duration -lt 2 ]] && return  # skip instant commands

    local last_cmd="$_AW_LAST_CMD"
    local last_cwd="$_AW_LAST_CWD"

    python3 - "$duration" "$last_cwd" "$last_cmd" "$_AW_BASE" "$_AW_TERMINAL_BUCKET" <<'PYEOF' >/dev/null 2>&1 &
import sys, json, urllib.request
from datetime import datetime, timezone, timedelta

duration = int(sys.argv[1])
cwd      = sys.argv[2]
cmd      = sys.argv[3]
base     = sys.argv[4]
bucket   = sys.argv[5]

ts = (datetime.now(timezone.utc) - timedelta(seconds=duration)).strftime('%Y-%m-%dT%H:%M:%S.%f+00:00')
payload = json.dumps([{
    "timestamp": ts,
    "duration": duration,
    "data": {"cwd": cwd, "cmd": cmd, "shell": "zsh"}
}]).encode()
req = urllib.request.Request(
    f"{base}/buckets/{bucket}/events",
    data=payload,
    headers={"Content-Type": "application/json"}
)
urllib.request.urlopen(req, timeout=3)
PYEOF
}

zmodload zsh/datetime
autoload -Uz add-zsh-hook
add-zsh-hook preexec _aw_preexec
add-zsh-hook precmd _aw_precmd

_aw_terminal_init
