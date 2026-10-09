---
name: purge-user-scope
description: Wipe all Claude Code user-scope files (~/.claude, ~/.claude.json) while leaving the claude binary installed. Less destructive than uninstall.
disable-model-invocation: true
---

Never run script because running Claude Code keeps writing to `~/.claude` and, on Windows, locks files in it; user runs script after quitting Claude Code.

Script deletes `~/.claude` and `~/.claude.json` (Windows: under `%USERPROFILE%`): settings, memory, plugins, hooks, sessions, history, MCP servers, account state. `claude` binary stays installed; binary removal -> `uninstall-cli` skill.

```mermaid
flowchart TD
  ask["AskUserQuestion: delete full path of ~/.claude with everything in it, and full path of ~/.claude.json"] -->|decline| stop["stop, build nothing"]
  ask -->|confirm| os{"$env:OS is Windows_NT, or uname -s starts with MINGW, MSYS or CYGWIN"}
  os -->|yes| win["Windows command"]
  os -->|no| nix["macOS or Linux command"]
  win & nix --> hand["command in code block; tell user: quit Claude Code, every window; open terminal; paste; script prints one line per path removed"] --> stop
```

Windows command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/purge.ps1"`

macOS or Linux command: `bash "${CLAUDE_SKILL_DIR}/purge.sh"`
