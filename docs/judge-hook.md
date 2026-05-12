# Judge Hook

A `PreToolUse` hook that implements the LLM-as-judge pattern as a deterministic regex layer with optional LLM escalation. Sits between Claude Code's intent and any tool call with real-world side effects.

**Status:** opt-in. Not wired into the plugin's default `settings.json`. Enable by copying the example rules and adding the hook entry to your `~/.claude/settings.json` (see below).

## What it does

For every tool call (`PreToolUse`), the hook:

1. Reads the rules file at `~/.claude/judge-rules.json` (override with `$JUDGE_RULES_FILE`).
2. Walks rules in order — the first one whose `tool` and `pattern` both match wins.
3. Per matched rule:
   - `class: deny` → exits 2 with the reason → Claude Code blocks the call
   - `class: allow` → exits 0 → call proceeds (use to allowlist exceptions above broader denies)
   - `class: escalate` → spawns `claude -p` with the rule's `judge_prompt` + the tool proposal; LLM returns `ALLOW` or `BLOCK` on the first line, reason on the second
4. No rule matches → exits 0 (allow).

If `~/.claude/judge-rules.json` is missing, the hook is a no-op. Adding rules is the entire activation mechanism.

## Quick start

```bash
# 1. Copy the example rules
cp ~/.claude/plugins/xve/hooks/judge-rules.example.json ~/.claude/judge-rules.json

# 2. Wire the hook into ~/.claude/settings.json under "hooks.PreToolUse"
#    (see the snippet below)

# 3. Restart Claude Code or start a new session
```

Settings snippet to add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/judge-hook.sh",
            "statusMessage": "Judging tool call..."
          }
        ]
      }
    ]
  }
}
```

You will also need to copy `judge-hook.sh` to `~/.claude/judge-hook.sh` (or reference it directly from the plugin install path — adjust the `command` field).

## Rule format

```json
{
  "rules": [
    {
      "tool": "Bash",
      "pattern": "rm\\s+-[rRf]+\\s+(/|~)",
      "class": "deny",
      "reason": "destructive rm at root or home"
    },
    {
      "tool": "Bash",
      "pattern": "git\\s+push\\s+(origin\\s+)?(main|master)\\b",
      "class": "escalate",
      "reason": "push to main needs review",
      "judge_prompt": "A Claude Code session is about to push to main. Block unless the user clearly asked for this."
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `tool` | string | Exact tool name (`Bash`, `Write`, `Edit`, etc.) or `*` for any |
| `pattern` | string (POSIX ERE) | Matched against the tool_input JSON. Empty = match all inputs of this tool |
| `class` | enum | `deny` / `allow` / `escalate` |
| `reason` | string | Shown to the user when denying or escalating |
| `judge_prompt` | string | Required when `class=escalate`. Sent to the LLM judge before the proposal |

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `JUDGE_RULES_FILE` | `~/.claude/judge-rules.json` | Path to rules file |
| `JUDGE_LLM_TIMEOUT` | `10` | Seconds before LLM escalation falls open |
| `JUDGE_LLM_MODEL` | `claude-haiku-4-5-20251001` | Model for escalation calls |

## Fail-open behavior

The hook is **fail-open** on infrastructure errors. If `jq` is missing, the rules file is empty, the `claude` CLI is unavailable, or the LLM call times out, the hook exits 0 and the tool call proceeds.

This is a usability tradeoff. For anything that **must** block deterministically, use `class: deny` rules — they do not depend on `claude` or network. Save `class: escalate` for cases where regex is insufficient and you accept the latency + cost + occasional fall-open behavior.

## Cost and latency

- `deny` and `allow` rules: zero LLM cost, microseconds of overhead.
- `escalate` rules: one `claude -p` call per matched rule. Latency ~1-3 seconds with Haiku; cost a fraction of a cent per call. Tune `JUDGE_LLM_MODEL` if you need more capable judgment.

Use escalate sparingly — patterns like "every Bash command" or "every Write" will make Claude Code feel sluggish and burn money. The example rules limit escalation to `git push main/master` and destructive SQL.

## Testing rules

The plugin ships an eval scaffold at `hooks/judge-eval/`:

```bash
cd ~/.claude/plugins/xve/hooks/judge-eval
./run-evals.sh                  # regex cases only (fast, free)
RUN_LLM_EVALS=1 ./run-evals.sh  # also runs escalate cases (costs ~$0.01)
```

Each fixture under `fixtures/` is a JSON file with a `_description`, `_expected_exit`, optionally `_requires_llm: true`, plus the `tool_name` + `tool_input` to feed the hook. Add fixtures for any rule you author.

## Relationship to Claude Code's built-in permissions

Claude Code already has `permissions.allow` / `permissions.deny` in settings. The hook is **additive** — it runs after permissions evaluate (if permissions deny, the hook never sees the call) and lets you express richer rules: regex over tool inputs, LLM-based judgment, structured reasons. Use both: permissions for the simple allow/deny list, the hook for everything more nuanced.

## When not to use this

- Read-only sessions — there's nothing to gate.
- Sessions where you accept full responsibility for tool calls (e.g., interactive exploration on a scratch machine).
- High-throughput automation where every millisecond matters — even regex evaluation adds tens of milliseconds per tool call.

## Related skills

The judge pattern as design discipline (separate from the runtime hook):

- `/xve:action-surface-audit-skill` — map an agent's action surface before adding a judge
- `/xve:judge-criteria-skill` — design what a judge evaluates
- `/xve:judge-prompt-writer-skill` — write the judge system prompt
- `/xve:judge-eval-suite-skill` — generate test cases for the judge
- `/xve:judge-architecture-review-skill` — audit an existing system's judge layer

These produce design artifacts (specs, prompts, eval cases). The hook is the runtime that enforces them in Claude Code itself.
