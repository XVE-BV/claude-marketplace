# /xve-setup

Run this once on a new machine after installing the plugins. It wires up Claude Code with the full XVE configuration.

## Flow

```mermaid
flowchart TD
    A["Step 1 — Apply settings.json"] --> B
    B["Step 2 — Install hooks?\nsession-start.sh"] -->|"Yes"| B1["Hooks installed"]
    B -->|"No"| C
    B1 --> C
    C["Step 3 — Check env vars\nXVE_EMAIL, ..."] --> D
    D["Step 4 — Install karpathy-skills\nauto, no prompt"] --> E
    E["Step 5 — Summary"]
```

## What it does

### 1 — Applies settings

Merges `plugins/xve/config/settings.json` into `~/.claude/settings.json`. This configures:

- **Model strategy:** `opusplan` as executor + Opus 4.7 as advisor for strategic decisions
- **Permissions:** pre-approved allow/deny lists so Claude doesn't prompt for common commands
- **Token and timeout limits**

### 2 — Installs hooks (asks first)

Claude asks whether you want these before installing:

- **`session-start.sh`** — runs at session start, reads your env vars and injects context (enables/disables advisor based on flags)

### 3 — Checks env vars

Reads your environment and reports what's set and what's missing:

| Var | Purpose |
|-----|---------|
| `XVE_EMAIL` | Your email, used by Claude to identify your account |
| `DISABLE_ADVISOR` | Set to `1` to turn off Opus advisor calls |

If `XVE_EMAIL` is not set, Claude asks you for it interactively and appends `export XVE_EMAIL=...` to your `~/.zshrc`. Restart your terminal afterward so the var loads.

### 4 — Installs karpathy-skills

Automatically installs four coding principles that reduce rework:

1. Think before coding — surface assumptions first
2. Simplicity first — minimum code, no speculative features
3. Surgical changes — touch only what was asked
4. Goal-driven execution — define success criteria before implementing

### 5 — Summary

Prints a checklist at the end showing what was applied, what was skipped, and what still needs attention.

## After setup

Restart your terminal (to load the new `~/.zshrc` entries), then open a new Claude Code session. The hooks and agents will be active immediately.
