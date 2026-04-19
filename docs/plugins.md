# Plugins

## kimai — Timesheet management

| Command | Action |
|---------|--------|
| `/k` | Log time or view today's entries |
| `/ks` | Start a running timer |
| `/ke` | Stop active timer (rounds to nearest 15min) |

Rules: one entry per JIRA issue, never bundled. Descriptions include JIRA issue + PR number.

## activitywatch — Passive time analysis

| Command | Action |
|---------|--------|
| `/aw` | Today's breakdown per customer |
| `/aw-week` | This week's breakdown per customer |
| `/aw-setup` | Audit watchers, install terminal watcher, compare vs Kimai |

Watchers: window, AFK, browser (Chrome), VS Code, terminal (zsh hook).

## xve — Machine setup

| Command | Action |
|---------|--------|
| `/xve-setup` | Bootstrap Claude Code on a new machine |

## xve — LLM Council

Trigger: say "council this", "war room this", "pressure-test this", or present a real decision with stakes ("should I X or Y").

5 advisors run in parallel (Contrarian, First Principles, Expansionist, Outsider, Executor) → 5 anonymous peer reviewers → Chairman verdict → HTML report + markdown transcript saved locally.

**Use:** genuine uncertainty, high cost of wrong call.
**Skip:** factual lookups, creation tasks, already-decided things.

Full guide: [llm-council.md](llm-council.md)
