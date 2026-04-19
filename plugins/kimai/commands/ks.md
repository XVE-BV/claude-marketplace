---
description: Kimai start — begin a running timer for the current project (detected from CWD).
---

Use the clockit agent to start a running timer.

1. Detect project from CWD using repo→project mapping (btb=8, nassau.tech=5, nassau=12, dwb=7, peppol=153). If no match, ask.
2. GET active timers — if same project already running, warn `Already running → [Customer] #ID [HH:MM]` and abort unless user confirms.
3. Ask: `Description? (JIRA issue + PR, e.g. "BTB-123 mscContactIds fix #45")` — wait for reply.
4. POST to `/timesheets` with `begin` = now, NO `end` field.
5. Output: `Started → [Customer] #ID [HH:MM]` — nothing else.
