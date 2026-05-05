# Configuration

## Claude Code model strategy

| Setting | Value | Reason |
|---------|-------|--------|
| `model` | `sonnet` | Fast executor |
| `advisorModel` | `opus` | Opus 4.7 handles strategic decisions |
| `effortLevel` | `xhigh` | Maximum reasoning for agentic tasks |
| `DISABLE_ADAPTIVE_THINKING` | `1` | Not needed — Opus covers the strategic layer |

Advisor fires before writing code, before major decisions, when stuck, and before declaring done.

## Env var toggles

| Env var | Default | Effect |
|---------|---------|--------|
| `DISABLE_ADVISOR` | `0` | Set to `1` to disable Opus advisor |

Controlled at session start by `~/.claude/session-start.sh` (installed by `/xve-setup`).

## Env var reference

All values from Bitwarden: **"xve claude marketplace env vars"**. See `.env.example` for key names and format.

| Var | Purpose |
|-----|---------|
| `XVE_CUSTOMER_N` | Customer mapping: `path_hint\|project_id\|label` |

## Behavioral guidelines

`/xve-setup` optionally installs [karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills):
- Think Before Coding
- Simplicity First
- Surgical Changes
- Goal-Driven Execution
