---
description: Kimai end — stop the active running timer, rounded to nearest 15min.
---

Use the clockit agent to stop an active timer.

1. GET `https://clockit.xve-web.eu/api/timesheets/active` with Bearer token.
2. If none: output `No active timer.` — done.
3. If exactly one: stop it directly.
4. If multiple: list them (`#ID [HH:MM] Project — description`), ask which to stop.
5. Calculate elapsed minutes, round to nearest 15 (`round(min/15)*15`, min 15). Set `end = begin + rounded_minutes`.
6. PATCH `/timesheets/{id}` with the rounded `end` time.
7. Output: `Stopped → [Customer] #ID [HH:MM–HH:MM] Xmin` — nothing else.
