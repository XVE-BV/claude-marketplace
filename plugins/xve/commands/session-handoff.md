---
description: Produce an end-of-session handoff summary for /clear. Invokes the session-handoff skill.
---

Invoke the `session-handoff` skill (at `plugins/xve/skills/session-handoff/SKILL.md` in this plugin) and follow it exactly.

The skill's output is chat-only — do not write the handoff to a file. Once it prints, the user will run `/clear` and paste the summary into the next session.
