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
