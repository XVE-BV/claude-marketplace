# Repository structure

```
.env.example                    Env var template — never commit actual values
hooks/
  session-start.sh              Injects session context from env vars
  clockit-stop.sh               Auto-prompts Kimai log when leaving a client repo
  aw-watcher-terminal.zsh       Tracks terminal CWD + command in ActivityWatch
plugins/
  kimai/
    agents/clockit.md           Kimai agent
    commands/k.md ks.md ke.md   Time logging commands
  activitywatch/
    agents/activitywatch.md     ActivityWatch agent
    commands/aw.md aw-week.md aw-setup.md
    skills/activitywatch-queries/
  xve/
    commands/xve-setup.md       Bootstrap command
    config/settings.json        Claude Code settings template
    skills/customers/           XVE_CUSTOMER_N env var docs
docs/
  plugins.md                    Plugin and command reference
  configuration.md              Model strategy, env toggles, var reference
  structure.md                  This file
```
