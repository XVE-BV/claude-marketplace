#!/bin/bash
# ClockIt stop hook — reads customer config from XVE_CUSTOMER_N env vars
# Each var format: "path_hint|kimai_project_id|display_label|aw_pattern"
# Set these in ~/.zshrc — see .env.example

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('session_id','unknown'))" 2>/dev/null || echo "unknown")

MARKER="/tmp/.clockit-offered-$SESSION_ID"
[ -f "$MARKER" ] && exit 0

CWD=$(pwd)
PROJECT=""
CUSTOMER=""
AW_PATTERN=""

# Iterate XVE_CUSTOMER_1 .. XVE_CUSTOMER_20
for i in $(seq 1 20); do
    VAR="XVE_CUSTOMER_$i"
    ENTRY="${!VAR}"
    [ -z "$ENTRY" ] && continue

    PATH_HINT=$(echo "$ENTRY" | cut -d'|' -f1)
    PROJ_ID=$(echo "$ENTRY"   | cut -d'|' -f2)
    LABEL=$(echo "$ENTRY"     | cut -d'|' -f3)
    AW_PAT=$(echo "$ENTRY"    | cut -d'|' -f4)

    if echo "$CWD" | grep -qiE "$PATH_HINT"; then
        PROJECT="$PROJ_ID"
        CUSTOMER="$LABEL"
        AW_PATTERN="$AW_PAT"
        break
    fi
done

[ -z "$PROJECT" ] && exit 0

touch "$MARKER"

# Try ActivityWatch for actual time
MINS=$(python3 - "$AW_PATTERN" <<'PYEOF' 2>/dev/null
import json, sys, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

pattern = sys.argv[1]

try:
    resp = urllib.request.urlopen("http://localhost:5600/api/0/buckets/", timeout=2).read()
    buckets = json.loads(resp)
    win_bucket = next((k for k,v in sorted(buckets.items(), key=lambda x: x[1].get('last_updated',''), reverse=True) if 'window' in k), None)
    afk_bucket = next((k for k,v in sorted(buckets.items(), key=lambda x: x[1].get('last_updated',''), reverse=True) if 'afk' in k), None)

    if not win_bucket:
        print("NO_AW"); sys.exit(0)

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    afk_part = f'; afk = query_bucket("{afk_bucket}"); afk = filter_keyvals(afk, "status", ["not-afk"]); events = filter_period_intersect(events, afk)' if afk_bucket else ''
    q = (
        f'events = query_bucket("{win_bucket}")'
        + afk_part +
        f'; matched = filter_keyvals_regex(events, "title", "{pattern}")'
        '; RETURN = sum_durations(matched)'
    )

    payload = json.dumps({
        'timeperiods': [today.isoformat() + '/' + tomorrow.isoformat()],
        'query': [q]
    }).encode()

    req = urllib.request.Request('http://localhost:5600/api/0/query/', data=payload, headers={'Content-Type': 'application/json'})
    secs = json.loads(urllib.request.urlopen(req, timeout=3).read())[0]

    if secs < 300:
        print("SKIP"); sys.exit(0)

    mins = max(15, round(secs / 60 / 15) * 15)
    print(mins)
except Exception:
    print("NO_AW")
PYEOF
)

NOW=$(date +%Y-%m-%dT%H:%M:%S)

if [ "$MINS" = "SKIP" ]; then
    exit 0
elif [ "$MINS" = "NO_AW" ] || [ -z "$MINS" ]; then
    MINS=15
    MSG="In $CUSTOMER repo (no ActivityWatch data). Ask user: want to log ${MINS}min to ClockIt? project=$PROJECT activity=1 (Werk) end=$NOW"
else
    BEGIN=$(python3 -c "from datetime import datetime,timedelta; print((datetime.now()-timedelta(minutes=$MINS)).strftime('%Y-%m-%dT%H:%M:%S'))")
    MSG="ActivityWatch: ${MINS}min active in $CUSTOMER today. Ask user: want to log ${MINS}min to ClockIt? project=$PROJECT activity=1 (Werk) begin=$BEGIN end=$NOW"
fi

echo "$MSG"
exit 2
