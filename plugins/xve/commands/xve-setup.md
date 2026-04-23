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

## Step 4 — Install xve-hud statusline (confirm first)

Ask the user:
> "Install the XVE statusline (xve-hud)? Shows a handoff-urgency banner on the statusline — amber at 60% context, red at 85%, early bump if you're burning quota fast. Requires `jq`. [Y/n]"

If yes:
```bash
command -v jq >/dev/null || { echo "jq missing — skipping. Install jq and re-run /xve-hud-setup later."; SKIP_HUD=1; }
```

If `jq` is present, merge the following into `~/.claude/settings.json` (preserve other keys with `jq`):

```json
{
  "statusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/statusline/xve-hud.sh"
  }
}
```

Remind the user: a **full Claude Code restart** is required for the statusline change to take effect.

## Step 5 — Check env vars

```bash
echo "XVE_EMAIL:          ${XVE_EMAIL:-(not set ⚠)}"
echo "DISABLE_ADVISOR:    ${DISABLE_ADVISOR:-0 (advisor enabled)}"
```

If `XVE_EMAIL` is not set, ask the user:
> "What email should Claude use to identify your account? (e.g. `you@example.com`)"

Then append to `~/.zshrc` (or the user's shell rc file) and confirm:
```bash
echo "export XVE_EMAIL=<answer>" >> ~/.zshrc
```

Remind the user to restart their terminal (or `source ~/.zshrc`) so the new env var loads.

Other env vars (optional — mention, don't prompt):
```zsh
# export DISABLE_ADVISOR=1       # uncomment to disable Opus advisor
# XVE_CUSTOMER_N — see .env.example for full template
```

## Step 6 — Write guidance to CLAUDE.md

Append best practices to `~/.claude/CLAUDE.md`. Each block is idempotent — skip if the section already exists.

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

## LLM Council

Use `council this` when the cost of a bad call is high and there are real tradeoffs between options.

Good fit:
- Genuine uncertainty with meaningful options (architecture choices, hiring, pricing, strategy)
- Decision you keep going back and forth on

Not a good fit:
- Factual lookups — just ask directly
- Creation tasks (write a tweet, summarise this)
- Already decided — don't run council to validate
EOF
fi

if ! grep -q "## Coding Guidelines" ~/.claude/CLAUDE.md 2>/dev/null; then
  cat >> ~/.claude/CLAUDE.md << 'EOF'

## Coding Guidelines

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First
- Minimum code that solves the problem. No speculative features.
- No abstractions for single-use code, no unrequested "flexibility".
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes
- Touch only what the request requires. Don't improve adjacent code.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Every changed line should trace directly to the user's request.

### Goal-Driven Execution
- Transform tasks into verifiable goals before starting.
- For multi-step tasks, state a brief plan with verification steps.
- Define success criteria upfront so you can loop independently.
EOF
fi
```

## Step 7 — Summary

```
XVE Claude Code Setup
─────────────────────
settings.json:        ✓ applied
session-start.sh:     ✓ / ✗
xve-hud:              ✓ wired / ✗ skipped
XVE_EMAIL:            ✓ / ✗ not set
CLAUDE.md advisor:    ✓ written / ✗ skipped (already present)
CLAUDE.md guidelines: ✓ written / ✗ skipped (already present)
```

## Step 8 — Open the guide

Run `/xve-help` to open the XVE docs in the browser so the user has the getting started guide on screen.
