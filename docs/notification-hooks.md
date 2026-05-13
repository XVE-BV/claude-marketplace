# Notification Hooks

Native OS desktop notifications for Claude Code lifecycle events. Fires when Claude finishes a turn, hits an API error, is about to compact context, and more. Lets you step away during long runs without missing anything.

**Status:** opt-in. Installed via Step 3c in `/xve:setup`, or manually (see below).

## Why use this

Claude Code has no native way to surface lifecycle events outside the terminal. If you step away during a long agentic run, you have no idea when it finishes, when it errors, or when the context window is about to compact.

The hooks close that gap. You get a native notification on the events that matter, dispatched by `~/.claude/notify.sh` on every platform.

## Hook events wired

| Hook | When it fires | Payload field used |
|------|--------------|-------------------|
| `PreCompact` | Context window compaction is about to start | `matcher` (auto or manual) |
| `PostCompact` | Compaction finished, context has been reset | `compaction_trigger` |
| `Stop` | Claude completed a turn | none |
| `StopFailure` | Turn ended due to API error | `error_type` |
| `TeammateIdle` | An agent team teammate is going idle | `agent_type` |
| `Notification` | Claude Code sent an `idle_prompt` notification | `notification_type` |

`Notification` is scoped to `idle_prompt` only. Other notification types (`permission_prompt`, `auth_success`, `elicitation_dialog`) are suppressed in `notify.sh` to avoid noise, especially when `bypassPermissions` is active.

## Platform support

| Platform | Mechanism |
|----------|-----------|
| macOS | `osascript display notification` |
| Windows | PowerShell `System.Windows.Forms.NotifyIcon` (non-blocking background process) |
| Linux | `notify-send` |

`notify.sh` detects the platform at runtime and falls back silently if no notification command is found.

## How notify.sh works

The script reads the hook JSON payload from stdin, extracts `hook_event_name`, and dispatches a platform-appropriate notification. It is a single file at `~/.claude/notify.sh`. All 6 hooks call the same script, which handles routing internally.

The `Notification` hook exits early (exit 0 silently) for any `notification_type` other than `idle_prompt`, so it never fires for permission prompts or auth events.

## Installation

### Via setup (recommended)

Run `/xve:setup` and say yes at the Step 3c prompt. It installs `notify.sh` and wires all 6 hooks idempotently.

### Manual

```bash
# 1. Copy the script
cp "$REPO_DIR/hooks/notify.sh" ~/.claude/notify.sh
chmod +x ~/.claude/notify.sh
```

Add to `~/.claude/settings.json` under `"hooks"`:

```json
{
  "PreCompact":    [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}],
  "PostCompact":   [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}],
  "Stop":          [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}],
  "StopFailure":   [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}],
  "TeammateIdle":  [{"hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}],
  "Notification":  [{"matcher": "idle_prompt", "hooks": [{"type": "command", "command": "bash ~/.claude/notify.sh"}]}]
}
```

Restart Claude Code after any hook change.

## Customization

### Stop is noisy

`Stop` fires after every Claude turn, including one-liners. Remove it if you find it disruptive:

```bash
jq 'del(.hooks.Stop)' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

### Add more hooks

`notify.sh` handles any event with a `case` statement. To add support for a new hook, extend the `case` block in `~/.claude/notify.sh` and wire it in `settings.json`.

## Limitations

- **macOS only gets native banners if Do Not Disturb is off.** `osascript` fires regardless, but DND suppresses the visual.
- **Windows requires a running PowerShell process.** The script spawns it in the background (`&`) but there is a brief delay before the notification appears.
- **Hooks are fail-open.** If `jq` is missing or `notify.sh` fails, the hook exits 0 and Claude Code continues normally. You lose the notification but nothing breaks.
- **No customization of notification content without editing notify.sh directly.** The messages are hardcoded in the script.
