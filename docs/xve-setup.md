# /xve-setup

Run this once on a new machine after installing the plugins. It wires up Claude Code with the full XVE configuration.

## What it does

### 1 — Applies settings

Merges `plugins/xve/config/settings.json` into `~/.claude/settings.json`. This configures:

- **Model strategy:** `opusplan` as executor + Opus 4.7 as advisor for strategic decisions
- **Permissions:** pre-approved allow/deny lists so Claude doesn't prompt for common commands
- **Token and timeout limits**

### 2 — Installs agents

Copies the Kimai and ActivityWatch agents to `~/.claude/agents/` so Claude can act as a time tracking assistant automatically.

### 3 — Installs commands

Copies all slash commands to `~/.claude/commands/`:

| Commands | From |
|----------|------|
| `/k`, `/ks`, `/ke` | kimai plugin |
| `/aw`, `/aw-week`, `/aw-setup` | activitywatch plugin |

### 4 — Installs hooks

Two background scripts wired into Claude's lifecycle:

- **`session-start.sh`** — runs at session start, reads your env vars and injects context (enables/disables Kimai, ActivityWatch, advisor based on flags)
- **`clockit-stop.sh`** — runs when Claude stops, prompts you to log time if a timer is running

### 5 — Installs terminal watcher

Adds `aw-watcher-terminal.zsh` to `~/.config/` and sources it from `~/.zshrc`. This lets ActivityWatch track time spent in the terminal per project.

### 6 — Checks env vars

Reads your environment and reports what's set and what's missing:

| Var | Purpose |
|-----|---------|
| `CLOCKIT_TOKEN` | Kimai API token — required for `/k`, `/ks`, `/ke` |
| `CLOCKIT_BASE` | Kimai base URL (defaults to `clockit.xve-web.eu`) |
| `XVE_EMAIL` | Your email, used by Claude to identify your account |
| `ENABLE_KIMAI` | Set to `1` to activate Kimai agent and commands |
| `ENABLE_ACTIVITYWATCH` | Set to `1` to activate ActivityWatch agent and commands |
| `DISABLE_ADVISOR` | Set to `1` to turn off Opus advisor calls |

Get the values from Bitwarden: **"xve claude marketplace env vars"**.

### 7 — Offers karpathy-skills (optional)

Offers to install four coding principles that reduce rework:

1. Think before coding — surface assumptions first
2. Simplicity first — minimum code, no speculative features
3. Surgical changes — touch only what was asked
4. Goal-driven execution — define success criteria before implementing

### 8 — Summary

Prints a checklist at the end showing what was applied, what was skipped, and what still needs attention.

## After setup

Restart your terminal (to load the new `~/.zshrc` entries), then open a new Claude Code session. The hooks and agents will be active immediately.
