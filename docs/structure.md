# Repository structure

```
.env.example                    Env var template — never commit actual values
hooks/
  session-start.sh              Injects session context from env vars
  env-guard.sh                  PreToolUse hook — blocks .env file access via any tool
plugins/
  xve/
    commands/xve-setup.md       Bootstrap command
    config/settings.json        Claude Code settings template
    skills/customers/           XVE_CUSTOMER_N env var docs
docs/
  plugins.md                    Plugin and command reference
  configuration.md              Model strategy, env toggles, var reference
  structure.md                  This file
```
