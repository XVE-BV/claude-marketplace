---
name: setup-skill
description: XVE setup: apply personal Claude Code settings, agents, and commands to this machine.
disable-model-invocation: true
---

Set up this machine's Claude Code environment to match the XVE standard configuration.

## Step 1: Detect repo location

Find where this marketplace is checked out:
```bash
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo "UNKNOWN")"
```

If unknown, ask user for the path.

## Step 2: Apply ~/.claude/settings.json

Read `plugins/xve/config/settings.json` from this repo. Merge with existing `~/.claude/settings.json` (preserve any machine-specific additions, overwrite matching keys).

Key things applied:
- env vars (ENABLE_TOOL_SEARCH, BASH_DEFAULT_TIMEOUT_MS, CLAUDE_CODE_MAX_OUTPUT_TOKENS, etc.)
- permissions allow/deny lists
- model: sonnet, effortLevel: xhigh, advisorModel: opus
- autoMode: `$defaults` only: trusted infrastructure configured interactively in Step 2b
- UserPromptSubmit hook → assertion checker

**Advisor strategy:** `model: sonnet` (fast executor) + `advisorModel: opus` (strategic oversight via Opus 4.7) + `effortLevel: xhigh` + `DISABLE_ADAPTIVE_THINKING: 1`. Sonnet handles execution; Opus advises before major decisions. ~11% cheaper than Opus-only with near-identical quality on agentic tasks. Adaptive thinking disabled on Sonnet intentionally: the advisor covers that layer.

Call advisor: before writing code, when stuck, before declaring done. Not after every step.

## Step 2b: Configure autoMode trusted infrastructure (confirm first)

Ask the user:
> "Auto mode is now active. The classifier doesn't know which GitHub orgs, domains, or hosting providers are yours yet: without this it may pause on routine pushes, your own API calls, or SSH/rsync deployments asking for confirmation.
>
> Add your trusted infrastructure now? [Y/n]"

If **no**: tell the user they can run `/xve:automode-env` at any time to configure this later.

If **yes**, ask three follow-up questions in sequence:

**1. GitHub orgs**
> "GitHub orgs to trust? Enter one per line, e.g. `github.com/your-org`: or Enter to skip."

For each org provided, append to `~/.claude/settings.json`:
```bash
jq --arg e "Source control: github.com/ORG and all repos under it" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

**2. Internal domains**
> "Internal domains to trust? Enter one per line, e.g. `*.example.com`: or Enter to skip."

For each domain:
```bash
jq --arg e "Trusted internal domains: DOMAIN" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

**3. Hosting / deployment targets**
> "Hosting providers or deployment targets? Describe in plain language, e.g. `Combell (combell.com): PHP/WordPress deployments via SSH and rsync`: or Enter to skip."

For each entry:
```bash
jq --arg e "Trusted hosting provider: DESCRIPTION" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

After all entries are applied, run `claude auto-mode config` and show the user their effective environment block to confirm.

## Step 3: Install session-start hook (confirm first)

Ask the user:
> "Install session hooks? These run automatically on every Claude session:
> - **session-start.sh**: injects context at session start (enables/disables advisor via env vars)
> - **env-guard.sh**: blocks Claude from reading/executing .env files via any tool
> - **writing-guard.sh**: PostToolUse hook on Write/Edit; flags AI writing tells (em dashes, banned vocab) in artifact content and asks Claude to revise. Does not fire on terminal chat.
>
> Install? [Y/n]"

If yes:
```bash
cp "$REPO_DIR/hooks/session-start.sh" ~/.claude/session-start.sh
chmod +x ~/.claude/session-start.sh

curl -fsSL https://raw.githubusercontent.com/XVE-BV/claude-marketplace/main/hooks/env-guard.sh \
  -o ~/.claude/env-guard.sh 2>/dev/null || cp "$REPO_DIR/hooks/env-guard.sh" ~/.claude/env-guard.sh
chmod +x ~/.claude/env-guard.sh

cp "$REPO_DIR/hooks/writing-guard.sh" ~/.claude/writing-guard.sh
chmod +x ~/.claude/writing-guard.sh
```

`session-start.sh` injects context at session start based on env vars:
- `DISABLE_ADVISOR=1` → blocks advisor() calls

`env-guard.sh` is a PreToolUse hook that blocks access to `.env` files via `Read`/`Edit`/`Write` and any bash command referencing `.env`. Deny rules in settings.json alone are insufficient: this hook is the actual gate.

`writing-guard.sh` is a PostToolUse hook on `Write|Edit` that scans the content being written to a file for AI writing tells. Em dashes get a strict zero-tolerance check on every file (skipping data, lock, and binary formats). Banned vocabulary and AI phrases are checked only on prose files (`.md`, `.html`, `.txt`, `.rst`, etc.) and only when the content is at least 150 words. When violations are found, the hook blocks and tells Claude to re-edit the file. The hook does not run on terminal chat; the `## Writing Guidelines` block in CLAUDE.md remains the primary prevention there. Requires `jq`.

## Step 3b: Install judge-hook (confirm first, opt-in)

Ask the user:
> "Install **judge-hook**: an extra safety net for tool calls? It pattern-matches risky inputs (`rm -rf /`, `curl|bash`, `sudo`, force pushes, writes to secret-like files) and can escalate ambiguous patterns to a haiku call. Stacks on top of the other PreToolUse hooks; failure modes are fail-open, so it's a safety layer, not a security boundary.
>
> Requires `jq`; LLM escalation also needs the `claude` CLI. No latency by default; LLM escalate rules cost ~\$0.001 + ~2s per fire.
>
> Full docs: `docs/judge-hook.md` in the marketplace repo (https://github.com/XVE-BV/claude-marketplace/blob/main/docs/judge-hook.md).
>
> Install? [y/N]"

Default to **No**: this is opt-in and rules need review before activation. If the user accepts:

```bash
SETTINGS="$HOME/.claude/settings.json"

# 1. Copy the hook script
cp "$REPO_DIR/hooks/judge-hook.sh" ~/.claude/judge-hook.sh
chmod +x ~/.claude/judge-hook.sh

# 2. Copy the example rules file ONLY if no rules file exists (don't clobber).
if [ ! -f ~/.claude/judge-rules.json ]; then
  cp "$REPO_DIR/hooks/judge-rules.example.json" ~/.claude/judge-rules.json
  echo "Wrote ~/.claude/judge-rules.json from example. Review and customize before relying on it."
else
  echo "~/.claude/judge-rules.json already exists: left untouched. Compare against $REPO_DIR/hooks/judge-rules.example.json for new rules."
fi

# 3. Merge a PreToolUse entry into ~/.claude/settings.json: idempotent (skip if
#    a hook already references judge-hook.sh) and defensive (creates missing
#    .hooks and .hooks.PreToolUse paths).
if jq -e '.hooks.PreToolUse // [] | map(.hooks // [] | map(.command // "")) | flatten | any(. | contains("judge-hook.sh"))' "$SETTINGS" >/dev/null 2>&1; then
  echo "judge-hook already wired into settings.json: leaving as-is."
else
  jq '.hooks //= {} | .hooks.PreToolUse //= [] | .hooks.PreToolUse += [{
    "matcher": "Bash|Write|Edit|NotebookEdit|mcp__",
    "hooks": [{
      "type": "command",
      "command": "bash ~/.claude/judge-hook.sh",
      "statusMessage": "Judging tool call..."
    }]
  }]' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"

  # With the judge-hook active, the deny list + hook are the gate.
  # Widen allow to * only if jq is present. Without jq the hook is a no-op,
  # so * allow without enforcement would leave the user unprotected.
  if command -v jq >/dev/null 2>&1; then
    jq '.permissions.allow = ["*"]' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
    echo "Permissions allow set to [\"*\"]. Judge-hook + deny list are now the safety gate."
  else
    echo "jq not found. Keeping curated allow list. Install jq and re-run setup to switch to allow:*."
  fi
fi
```

Then ask:
> "Switch default permission mode to `bypassPermissions`? Judge-hook + deny list are now the active safety gate, so per-call prompts add friction without adding protection. `bypassPermissions` eliminates all prompts: no Shift+Tab, no confirmations. On Sonnet 4.6 with a Max plan, `auto` mode (the previous default) does not work and silently falls back to prompting anyway.
>
> Recommended if judge-hook is installed. [Y/n]"

If yes:
```bash
jq '.permissions.defaultMode = "bypassPermissions"' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
echo "defaultMode set to bypassPermissions."
```

If no: leave `defaultMode` unset. Claude Code will prompt for each tool call as normal.

Tell the user to:
1. **Review `~/.claude/judge-rules.json`** before the next session. The shipped example denies common destructive patterns; their environment may need additions (org-specific branches, prod hostnames, custom file paths).
2. **Test rules** against the eval scaffold: `cd "$REPO_DIR/hooks/judge-eval" && ./run-evals.sh`.
3. Read `docs/judge-hook.md` for the rule format, environment variables (`JUDGE_RULES_FILE`, `JUDGE_LLM_TIMEOUT`, `JUDGE_LLM_MODEL`), and fail-open behavior.
4. Note: judge-hook is the 4th PreToolUse handler if env-guard, writing-guard, and judge-hook are all installed. They fire in registration order.

Requires a Claude Code restart for the hook to take effect.

## Step 3c: Install notification hooks (confirm first)

Ask the user:
> "Install OS notification hooks? These fire native desktop notifications on key lifecycle events so you can step away during long runs:
> - **PreCompact**: context window about to compact; prompts you to switch to sonnet[1m]
> - **PostCompact**: compaction done, context reset
> - **Stop**: Claude finished a turn (note: fires on every response, can be noisy)
> - **StopFailure**: Claude stopped due to an API error (rate limit, billing, server error, etc.)
> - **TeammateIdle**: a teammate agent is going idle
> - **Notification** (idle_prompt only): Claude has gone idle and is waiting for input
>
> Requires `jq`. Works on macOS (osascript), Windows (PowerShell NotifyIcon), and Linux (notify-send).
>
> Install? [Y/n]"

If yes:
```bash
SETTINGS="$HOME/.claude/settings.json"

# 1. Copy notify.sh
cp "$REPO_DIR/hooks/notify.sh" ~/.claude/notify.sh
chmod +x ~/.claude/notify.sh

# 2. Wire all 6 hooks: idempotent (skip if notify.sh already referenced)
if jq -e '
  [.hooks // {} | to_entries[] | .value[] | .hooks // [] | .[] | .command // ""]
  | flatten | any(contains("notify.sh"))
' "$SETTINGS" >/dev/null 2>&1; then
  echo "notify.sh already wired: skipping."
else
  jq '
    .hooks //= {}
    | .hooks.PreCompact //= []
    | .hooks.PreCompact += [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
    | .hooks.PostCompact //= []
    | .hooks.PostCompact += [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
    | .hooks.Stop //= []
    | .hooks.Stop += [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
    | .hooks.StopFailure //= []
    | .hooks.StopFailure += [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
    | .hooks.TeammateIdle //= []
    | .hooks.TeammateIdle += [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
    | .hooks.Notification //= []
    | .hooks.Notification += [{"matcher": "idle_prompt", "hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
  ' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
  echo "Notification hooks wired."
fi
```

`notify.sh` reads the hook payload from stdin, extracts the event name, and dispatches to the right OS notification API. The `Notification` hook is scoped to `idle_prompt` only: `permission_prompt` and `auth_success` are excluded to avoid noise, especially with bypassPermissions active.

**Note on Stop:** it fires after every Claude turn, including quick one-liners. If that's too noisy, remove the `Stop` entry from `hooks.Stop` in `~/.claude/settings.json` and keep `StopFailure` only.

Requires a Claude Code restart for hooks to take effect.

## Step 4: Install xve-hud statusline (confirm first)

Ask the user:
> "Install the XVE statusline (xve-hud)? Shows a handoff-urgency banner on the statusline: amber at 60% context, red at 85%, early bump if you're burning quota fast. Requires `jq`. [Y/n]"

If yes:
```bash
command -v jq >/dev/null || { echo "jq missing: skipping. Install jq and re-run /xve:hud-setup later."; SKIP_HUD=1; }
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

## Step 5: Check env vars

```bash
echo "DISABLE_ADVISOR:    ${DISABLE_ADVISOR:-0 (advisor enabled)}"
```

Other env vars (optional: mention, don't prompt):
```zsh
# export DISABLE_ADVISOR=1       # uncomment to disable Opus advisor
# XVE_CUSTOMER_N: see .env.example for full template
```

## Step 6: Write guidance to CLAUDE.md

Force-overwrite the xve-managed sections in `~/.claude/CLAUDE.md` with the latest canonical versions. A timestamped backup is taken first so the user can recover any local edits.

**Behavior:** On every run: first install or re-run: managed sections are stripped and replaced with the canonical versions below. Any user edits inside those sections will be overwritten (they live in the `.bak` file). Sections outside this set are left untouched.

```bash
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
touch "$CLAUDE_MD"

# Always back up first so user can recover local edits.
BACKUP="$HOME/.claude/CLAUDE.md.bak.$(date +%Y%m%d-%H%M%S)"
cp "$CLAUDE_MD" "$BACKUP"
echo "Backup: $BACKUP"

# Strip every xve-managed section (## Heading until next ## or EOF).
awk '
  BEGIN {
    managed["## Advisor"] = 1
    managed["## Model Delegation"] = 1
    managed["## Verify Before Asserting"] = 1
    managed["## Perspectives"] = 1
    managed["## LLM Council"] = 1
    managed["## Decisive Thinking"] = 1
    managed["## Coding Guidelines"] = 1
    managed["## Review Mindset"] = 1
    managed["## Writing Guidelines"] = 1
    in_strip = 0
    in_user_custom = 0
  }
  /^<!-- xve-user-custom-begin -->/ { in_user_custom = 1; print; next }
  /^<!-- xve-user-custom-end -->/ { in_user_custom = 0; print; next }
  in_user_custom { print; next }
  $0 in managed { in_strip = 1; next }
  in_strip && /^## / { in_strip = 0 }
  !in_strip { print }
' "$CLAUDE_MD" > "$CLAUDE_MD.tmp" && mv "$CLAUDE_MD.tmp" "$CLAUDE_MD"

# Append all canonical sections in one heredoc.
cat >> "$CLAUDE_MD" << 'EOF'

## Advisor

Call advisor() BEFORE substantive work: before writing, before committing to an approach. Reading files to orient is fine first.

Also call when:
- Stuck (errors recurring, approach not converging)
- Changing approach
- Task complete: but first make deliverables durable (write file, commit)

Skip when:
- You are already running as Opus; advisor() would be Opus consulting itself.
- This turn immediately follows a completed /plan session; the plan output already serves as the advisor input.

On longer tasks: once before committing to approach, once before declaring done. Don't call after every step: advisor adds most value before the approach crystallizes.

Give advice serious weight. If data and advice conflict, don't silently switch: make one more advisor call: "I found X, you suggest Y, which breaks the tie?"

## Model Delegation

When running as Opus, act as orchestrator. Match each subtask to cheapest model that can do it well; keep expensive reasoning where it pays off.

- Opus (you): planning, architecture, ambiguous or high-stakes decisions, reviewing risky changes, final verification. Keep on main thread.
- Sonnet: most implementation, well-specified coding, refactors, research, writing. Spawn Sonnet subagents for sizable implementation; run independent pieces in parallel.
- Haiku: mechanical, deterministic work with clear spec. Renames, formatting, simple lookups, file moves, boilerplate.

Don't burn Opus on grunt work cheaper model handles. Don't push judgment-heavy decisions onto model that will miss what matters. Plan, review, verify on main thread; delegate doing.

## Verify Before Asserting

When about to state or act on load-bearing factual claim while hedging (may, might, probably, likely, I think, should be), treat hedge as signal to verify, not ship. Confirm before you assert:

- Read actual source: code, file, config, API response.
- Run it: reproduce behavior rather than predict it.
- Search web (WebSearch / WebFetch) for anything outside codebase: library behavior, error text, version specifics.

State what you verified and how. If you genuinely can't confirm, say so and label it guess; don't dress hunch as fact. Hedging is fine for real uncertainty you've named, not as substitute for checking.

## Perspectives

Hold two perspectives the developer in front of you won't voice.

**The end user.** Build for the human who uses the end product, not for developer convenience. Optimize for their experience, correctness, and safety. Don't ship shortcuts that only ease the current task (quick-and-dirty SQL, skipped edge cases, convenience hacks) unless the developer explicitly asks for them.

**The attacker.** Review your own changes like a penetration tester: assume hostile input on every field, header, cookie, param, and upload; re-authorize at every trust boundary; write the abuse case before the feature. Highest-leverage checks:
- Access control: every endpoint and object reference verifies this user owns this resource, not just that they're logged in (IDOR/BOLA). Swap an ID, expect 403.
- Injection: trace every user value to its sink (SQL, shell, template, HTML); parameterize queries, encode output.
- Auth and sessions: tokens invalidated on logout, strong password hashing (bcrypt/argon2), reject JWT alg:none, lockout on repeated failures.
- Mass assignment: allowlist bindable fields; role, isAdmin, price, balance are never client-settable.
- Secrets and crypto: no hardcoded keys/tokens, TLS everywhere, no MD5/SHA1 for passwords, no sensitive data in client storage.
- Supply chain: run npm audit / pip-audit / bundle audit in CI, commit lockfiles, use npm ci, watch for typosquatting.

This mindset is for hardening your own product; don't write exploit code against third-party systems. Reference: OWASP Top 10 and API Security Top 10.

## LLM Council

Use `council this` when the cost of a bad call is high and there are real tradeoffs between options.

Good fit:
- Genuine uncertainty with meaningful options (architecture choices, hiring, pricing, strategy)
- Decision you keep going back and forth on

Not a good fit:
- Factual lookups: just ask directly
- Creation tasks (write a tweet, summarise this)
- Already decided: don't run council to validate

## Decisive Thinking

When deciding how to approach a problem, choose an approach and commit to it.
Avoid revisiting decisions unless you encounter new information that directly
contradicts your reasoning. If weighing two approaches, pick one and see it
through: you can course-correct later if it fails.

Thinking adds latency and should only be used when it will meaningfully
improve answer quality. When in doubt, respond directly.

State conclusions, not deliberation. If you reconsider, do it once and move
on: don't loop. If you catch yourself revisiting the same decision a second
time, call advisor() before continuing rather than spiraling further.

## Coding Guidelines

### Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them: don't pick silently.
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
- If you notice unrelated dead code, mention it: don't delete it.
- Every changed line should trace directly to the user's request.

### Goal-Driven Execution
- Transform tasks into verifiable goals before starting.
- For multi-step tasks, state a brief plan with verification steps.
- Define success criteria upfront so you can loop independently.

## Review Mindset

Treat every output: code, prose, decisions: as if a senior engineer will review it line by line and catch sloppy work. Not a hypothetical: assume it.

This isn't about being defensive or hedging. It's about the bar: would this hold up under scrutiny by someone who knows the domain better than you? If not, fix it before shipping.

## Writing Guidelines

Write like a human, not a language model. These rules apply to all output: responses, docs, messages, anything.

**Banned vocabulary (never use):** delve, tapestry, landscape (abstract), pivotal, underscore (verb), testament, meticulous, nuanced, multifaceted, embark, spearhead, bolster, garner, realm, robust, seamless, groundbreaking, transformative, paramount, myriad, cornerstone, catalyst, nestled, bustling, vibrant, comprehensive, invaluable, reimagine, empower.

**Structural tells to avoid:**
- Em dashes as a stylistic habit: use commas, periods, or parentheses instead. Max one per 500 words.
- Parallel negation: "Not X, but Y" → just state the positive.
- Rule of three: forcing ideas into trios. Pick one or two.
- Inflation of importance: "pivotal moment", "testament to", "crucial development" → delete. State facts.
- Signposting: "Let's dive in", "Here's what you need to know" → drop it, start with the substance.
- Neat endings on every paragraph → let some thoughts just stop.
- Sycophantic openers: "Great question!", "Certainly!" → cut entirely.

**Always do:**
- Vary sentence length. Short. Then a longer one. Then a fragment. AI writes at a steady rhythm; don't.
- Have opinions. Remove "it could be argued" and say the thing.
- Use specific details: numbers, names, dates: over vague claims.
- Start some sentences with "And" or "But."
- Don't dumb it down. "Human" isn't "simplistic."
EOF

echo "Updated CLAUDE.md sections. Old version: $BACKUP"
```

## Step 7: Summary

```
XVE Claude Code Setup
─────────────────────
settings.json:        ✓ applied
autoMode env:         ✓ configured / ✗ skipped (run /xve:automode-env to set up later)
session-start.sh:     ✓ / ✗
env-guard.sh:         ✓ / ✗
writing-guard.sh:     ✓ / ✗
notify.sh:            ✓ wired (6 hooks) / ✗ skipped
xve-hud:              ✓ wired / ✗ skipped
CLAUDE.md sections:   ✓ refreshed (backup: ~/.claude/CLAUDE.md.bak.<timestamp>)
```

## Step 8: Open the guide

Run `/xve:docs` to open the XVE docs in the browser so the user has the getting started guide on screen.

## Known limitations

**`/plan` emits a "BLOCKED: resolves outside working dir" warning.** The `/plan` feature stores plan files in `~/.claude/plans/`, which is outside any project's working directory. The Claude Code harness emits a non-blocking warning on each plan write (visible as `Failed with non-blocking status code: BLOCKED: ...` in the session output). The writes succeed and plans work normally; the warning is cosmetic. This is a harness-level behavior, not caused by any installed hook. No workaround exists on the setup side.
