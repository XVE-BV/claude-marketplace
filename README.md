# xve-claude-marketplace

Personal Claude Code plugin marketplace — time tracking and machine setup for XVE.

## Plugins

### `kimai` — Timesheet management
Log billable hours to Kimai/ClockIt with slash commands.

| Command | Action |
|---------|--------|
| `/k [args]` | General: log time, view entries. No args = today's summary |
| `/ks` | Start a running timer (detects project from CWD) |
| `/ke` | Stop active timer, rounded to nearest 15min |

- One entry per issue — never bundled
- Descriptions include JIRA issue + PR number
- 15-min rounding (`round(min/15)*15`)
- Multi-timer disambiguation when multiple timers are active

### `activitywatch` — Passive time analysis
Query local ActivityWatch for time spent per project across all watchers.

| Command | Action |
|---------|--------|
| `/aw [args]` | Today's breakdown per customer |
| `/aw-week` | This week's breakdown per customer |
| `/aw-setup` | Audit watchers, verify patterns, compare vs Kimai, install terminal watcher |

Supported watchers: window, AFk, browser (Chrome), VS Code, terminal (zsh hook).

### `xve` — Machine setup
Bootstrap Claude Code on a new machine to match the XVE standard config.

| Command | Action |
|---------|--------|
| `/xve-setup` | Apply settings, install agents/commands, copy hooks, check env vars |

## Setup

### 1. Install via Claude Code marketplace

Add the marketplace (one-time):

```
/plugin marketplace add https://github.com/jonasvanderhaegen-xve/xve-claude-marketplace.git
```

Install plugins:

```
/plugin install xve@xve-claude-marketplace
/plugin install kimai@xve-claude-marketplace
/plugin install activitywatch@xve-claude-marketplace
```

`kimai` and `activitywatch` are installed but inactive by default — enable via env vars (see step 2).

### 2. Set env vars

Actual values are in Bitwarden: **"xve claude marketplace env vars"**.

Copy them to `~/.zshrc` (or a sourced `.env`). See `.env.example` for the full list of keys and format docs.

### 3. Run setup

```
/xve-setup
```

This installs:
- `~/.claude/settings.json` — permissions, hooks, model config
- `~/.claude/agents/` — clockit, activitywatch agents
- `~/.claude/commands/` — k, ks, ke, aw, aw-week, aw-setup
- `~/.claude/clockit-stop.sh` — Stop hook for auto time-log prompts
- `~/.config/aw-watcher-terminal.zsh` — zsh hook for terminal CWD tracking

### 4. ActivityWatch watchers

Install additionally for full coverage:
- **Browser**: [aw-watcher-web](https://activitywatch.net/watchers/) — Chrome/Firefox extension
- **VS Code**: `ActivityWatch` extension from VS Code marketplace

## Claude Code configuration

`settings.json` applies the following strategy:

| Setting | Value | Reason |
|---------|-------|--------|
| `model` | `sonnet` | Fast executor |
| `advisorModel` | `opus` | Opus 4.7 advises on strategy before major decisions |
| `effortLevel` | `xhigh` | Maximum reasoning depth for agentic tasks |
| `DISABLE_ADAPTIVE_THINKING` | `1` | Sonnet doesn't need it — Opus handles the strategic layer |

**When advisor fires:** before writing code, before major decisions, when stuck, before declaring done. Set `DISABLE_ADVISOR=1` in env to suppress for a session.

**Plugin opt-in via env vars** — all disabled by default, enabled by setting to `1` in `~/.zshrc`:

| Env var | Default | Effect |
|---------|---------|--------|
| `ENABLE_KIMAI` | `0` | Enables clockit agent + `/k` `/ks` `/ke` commands |
| `ENABLE_ACTIVITYWATCH` | `0` | Enables activitywatch agent + `/aw` `/aw-week` `/aw-setup` commands |
| `DISABLE_ADVISOR` | `0` | Set to `1` to disable Opus advisor for a session |

Controlled by `~/.claude/session-start.sh` (installed by `/xve-setup`).

**Behavioral guidelines** (`/xve-setup` step 8): optionally installs [karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) — Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.

## Structure

```
.env.example              Env var template (copy values to ~/.zshrc, never commit)
hooks/
  session-start.sh        SessionStart hook — injects context based on env vars (advisor/kimai/aw)
  clockit-stop.sh         Stop hook — auto-offers Kimai logging when leaving client repos
  aw-watcher-terminal.zsh Zsh hook — tracks CWD + command per shell invocation
plugins/
  kimai/
    agents/clockit.md
    commands/k.md, ks.md, ke.md
  activitywatch/
    agents/activitywatch.md
    commands/aw.md, aw-week.md, aw-setup.md
    skills/activitywatch-queries/
  xve/
    commands/xve-setup.md
    config/settings.json    Claude Code settings template
    skills/customers/       Documents XVE_CUSTOMER_N env var pattern
```

## Credentials

Never committed. All sensitive data lives in env vars — see `.env.example`.

Customer names, project IDs, API tokens, and email are loaded at runtime from `XVE_CUSTOMER_N`, `CLOCKIT_TOKEN`, and `XVE_EMAIL`. No actual values exist in this repo.
