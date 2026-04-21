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
- UserPromptSubmit hook → assertion checker

**Advisor strategy:** `model: sonnet` (fast executor) + `advisorModel: opus` (strategic oversight via Opus 4.7) + `effortLevel: xhigh` + `DISABLE_ADAPTIVE_THINKING: 1`. Sonnet handles execution; Opus advises before major decisions. ~11% cheaper than Opus-only with near-identical quality on agentic tasks. Adaptive thinking disabled on Sonnet intentionally — the advisor covers that layer.

Call advisor: before writing code, when stuck, before declaring done. Not after every step.

## Step 3 — Install session-start hook (confirm first)

Ask the user:
> "Install session hooks? These run automatically on every Claude session:
> - **session-start.sh** — injects context at session start (enables/disables advisor via env vars)
> - **env-guard.sh** — blocks Claude from reading/executing .env files via any tool
>
> Install? [Y/n]"

If yes:
```bash
cp "$REPO_DIR/hooks/session-start.sh" ~/.claude/session-start.sh
chmod +x ~/.claude/session-start.sh

curl -fsSL https://raw.githubusercontent.com/XVE-BV/claude-marketplace/main/hooks/env-guard.sh \
  -o ~/.claude/env-guard.sh 2>/dev/null || cp "$REPO_DIR/hooks/env-guard.sh" ~/.claude/env-guard.sh
chmod +x ~/.claude/env-guard.sh
```

`session-start.sh` injects context at session start based on env vars:
- `DISABLE_ADVISOR=1` → blocks advisor() calls

`env-guard.sh` is a PreToolUse hook that blocks access to `.env` files via `Read`/`Edit`/`Write` and any bash command referencing `.env`. Deny rules in settings.json alone are insufficient — this hook is the actual gate.

## Step 4 — Check env vars

```bash
echo "XVE_EMAIL:          ${XVE_EMAIL:-(not set ⚠)}"
echo "DISABLE_ADVISOR:    ${DISABLE_ADVISOR:-0 (advisor enabled)}"
```

If any are missing or need adjusting, add to `~/.zshrc`:
```zsh
export XVE_EMAIL=your@email.com
# export DISABLE_ADVISOR=1       # uncomment to disable Opus advisor
# XVE_CUSTOMER_N — see .env.example for full template
```

## Step 5 — Install karpathy-skills

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

## Step 6 — Write advisor guidance to CLAUDE.md

Append the advisor best practices to `~/.claude/CLAUDE.md`. Skip if the section already exists (idempotent).

```bash
if ! grep -q "## Advisor" ~/.claude/CLAUDE.md 2>/dev/null; then
  cat >> ~/.claude/CLAUDE.md << 'EOF'

## Advisor

Call advisor() BEFORE substantive work — before writing, before committing to an approach. Reading files to orient is fine first.

Also call when:
- Stuck (errors recurring, approach not converging)
- Changing approach
- Task complete — but first make deliverables durable (write file, commit)

On longer tasks: once before committing to approach, once before declaring done. Don't call after every step — advisor adds most value before the approach crystallizes.

Give advice serious weight. If data and advice conflict, don't silently switch — make one more advisor call: "I found X, you suggest Y, which breaks the tie?"
EOF
fi
```

## Step 7 — Summary

```
XVE Claude Code Setup
─────────────────────
settings.json:    ✓ applied
session-start.sh: ✓ / ✗
XVE_EMAIL:        ✓ / ✗ not set
karpathy-skills:  ✓ installed / ✗ failed
CLAUDE.md advisor: ✓ written / ✗ skipped (already present)
```

## Step 8 — Open the guide

Run `/xve-help` to open the XVE docs in the browser so the user has the getting started guide on screen.
