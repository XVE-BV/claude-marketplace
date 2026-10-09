---
name: purge-claude-user-scope-skill
description: Wipe all Claude Code user-scope files (~/.claude) while leaving the claude binary installed. Less destructive than uninstall.
disable-model-invocation: true
---

Deletes the Claude Code user scope: `~/.claude` (Windows: `%USERPROFILE%\.claude`), meaning settings, memory, plugins, hooks, sessions and history. The `claude` binary stays installed. To remove the binary too, use the uninstall-claude skill instead.

Do not run the script yourself. A running Claude Code keeps writing to `~/.claude` and, on Windows, locks files in it. The user runs the script after quitting Claude Code.

1. Confirm with AskUserQuestion: delete `<full path of ~/.claude>` and everything in it. If they decline, stop.
2. Find the OS. Windows if `$env:OS` is `Windows_NT` or `uname -s` starts with `MINGW`, `MSYS` or `CYGWIN`. Otherwise macOS or Linux.
3. Build the command. `<skill dir>` is the absolute "Base directory for this skill" shown when this skill loaded. Do not use `$CLAUDE_PLUGIN_ROOT`: tool shells don't have it.
   - Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File "<skill dir>\purge.ps1"`
   - macOS / Linux: `bash "<skill dir>/purge.sh"`
4. Give the user the command in a code block and tell them: quit Claude Code (every window), open a terminal, paste it. It prints one line per path it removed. Then stop.
