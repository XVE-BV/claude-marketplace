---
name: purge-user-scope
description: Wipe all Claude Code user-scope files (~/.claude, ~/.claude.json) while leaving the claude binary installed. Less destructive than uninstall.
disable-model-invocation: true
---

Never run script because running Claude Code keeps writing to `~/.claude` and, on Windows, locks files in it; user runs script after quitting Claude Code.

Script deletes `~/.claude` and `~/.claude.json` (Windows: under `%USERPROFILE%`): settings, memory, plugins, hooks, sessions, history, MCP servers, account state. `claude` binary stays installed; binary removal -> `uninstall-cli` skill.

Before building command: AskUserQuestion confirming deletion of `<full path of ~/.claude>` with everything in it and `<full path of ~/.claude.json>`. Decline -> stop, build nothing.

OS is Windows if `$env:OS` is `Windows_NT` or `uname -s` starts with `MINGW`, `MSYS` or `CYGWIN`; else macOS or Linux.

Windows command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/purge.ps1"`

macOS or Linux command: `bash "${CLAUDE_SKILL_DIR}/purge.sh"`

After building command: give it to user in code block; tell user to quit Claude Code (every window), open terminal, paste it; script prints one line per path removed. Then stop.
