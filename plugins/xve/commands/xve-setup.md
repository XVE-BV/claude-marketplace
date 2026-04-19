---
description: XVE setup — apply personal Claude Code settings, agents, and commands to this machine.
---

Set up this machine's Claude Code environment to match the XVE standard configuration.

## Step 1 — Detect repo location

Find where this marketplace is checked out:
```bash
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "UNKNOWN")"
```

If unknown, ask user for the path.

## Step 2 — Apply ~/.claude/settings.json

Read `plugins/xve/config/settings.json` from this repo. Merge with existing `~/.claude/settings.json` (preserve any machine-specific additions, overwrite matching keys).

Key things applied:
- env vars (ENABLE_TOOL_SEARCH, BASH_DEFAULT_TIMEOUT_MS, CLAUDE_CODE_MAX_OUTPUT_TOKENS, etc.)
- permissions allow/deny lists
- model: sonnet, effortLevel: xhigh, advisorModel: opus
- Stop hook → clockit-stop.sh
- UserPromptSubmit hook → assertion checker

**Advisor strategy:** `model: sonnet` (fast executor) + `advisorModel: opus` (strategic oversight via Opus 4.7) + `effortLevel: xhigh` + `DISABLE_ADAPTIVE_THINKING: 1`. Sonnet handles execution; Opus advises before major decisions. ~11% cheaper than Opus-only with near-identical quality on agentic tasks. Adaptive thinking disabled on Sonnet intentionally — the advisor covers that layer.

Call advisor: before writing code, when stuck, before declaring done. Not after every step.

**Note:** The Stop hook path is hardcoded to `~/.claude/clockit-stop.sh`. Confirm this path exists before writing.

## Step 3 — Install hooks (confirm first)

Ask the user:
> "Install session hooks? These run automatically on every Claude session:
> - **session-start.sh** — injects context at session start (enables/disables Kimai, ActivityWatch, advisor via env vars)
> - **clockit-stop.sh** — prompts to log time when Claude stops
>
> Install? [Y/n]"

If yes:
```bash
cp -n "$REPO_DIR/hooks/clockit-stop.sh" ~/.claude/clockit-stop.sh
chmod +x ~/.claude/clockit-stop.sh

cp "$REPO_DIR/hooks/session-start.sh" ~/.claude/session-start.sh
chmod +x ~/.claude/session-start.sh
```

`session-start.sh` injects context at session start based on env vars:
- `DISABLE_ADVISOR=1` → blocks advisor() calls
- `ENABLE_KIMAI=1` → enables Kimai agent (default: off)
- `ENABLE_ACTIVITYWATCH=1` → enables ActivityWatch agent (default: off)

## Step 4 — Install terminal watcher (confirm first)

Ask the user:
> "Install terminal watcher? This adds a zsh hook that tracks time per project in ActivityWatch. It modifies ~/.zshrc.
>
> Install? [Y/n]"

If yes: check `~/.config/aw-watcher-terminal.zsh`. If missing, copy from `$REPO_DIR/hooks/aw-watcher-terminal.zsh` and add source line to `~/.zshrc`.

## Step 5 — Check env vars

```bash
echo "CLOCKIT_TOKEN:      ${CLOCKIT_TOKEN:-(not set ⚠)}"
echo "CLOCKIT_BASE:       ${CLOCKIT_BASE:-https://clockit.xve-web.eu/api (default)}"
echo "XVE_EMAIL:          ${XVE_EMAIL:-(not set ⚠)}"
echo "DISABLE_ADVISOR:    ${DISABLE_ADVISOR:-0 (advisor enabled)}"
echo "ENABLE_KIMAI:       ${ENABLE_KIMAI:-0 (disabled)}"
echo "ENABLE_ACTIVITYWATCH: ${ENABLE_ACTIVITYWATCH:-0 (disabled)}"
```

If any are missing or need adjusting, add to `~/.zshrc`:
```zsh
export CLOCKIT_TOKEN=your_token_here
export XVE_EMAIL=your@email.com
export ENABLE_KIMAI=1            # enable Kimai agent + /k /ks /ke
export ENABLE_ACTIVITYWATCH=1    # enable AW agent + /aw /aw-week /aw-setup
# export DISABLE_ADVISOR=1       # uncomment to disable Opus advisor
# XVE_CUSTOMER_N — see .env.example for full template
```

## Step 6 — Install karpathy-skills

Install automatically — no prompt:

```bash
claude plugin marketplace add https://github.com/forrestchang/andrej-karpathy-skills.git
claude plugin install andrej-karpathy-skills@andrej-karpathy-skills
```

Four principles that cut rework significantly:
1. **Think Before Coding** — surface assumptions, present interpretations, ask before guessing
2. **Simplicity First** — minimum code, no speculative features or premature abstraction
3. **Surgical Changes** — touch only what was asked, match existing style, no scope creep
4. **Goal-Driven Execution** — define verifiable success criteria before implementing

## Step 7 — Summary

```
XVE Claude Code Setup
─────────────────────
settings.json:    ✓ applied
clockit-stop.sh:  ✓ / ✗
terminal watcher: ✓ / ✗
CLOCKIT_TOKEN:    ✓ / ✗ not set
XVE_EMAIL:        ✓ / ✗ not set
karpathy-skills:  ✓ installed / ✗ failed
```
