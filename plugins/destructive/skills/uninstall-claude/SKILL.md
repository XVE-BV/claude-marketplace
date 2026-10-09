---
name: uninstall-claude
description: Remove all Claude Code user-scope files and uninstall the claude binary from this machine.
disable-model-invocation: true
---

Never run script because Windows cannot delete running `claude.exe` and running Claude Code keeps writing to `~/.claude`; user runs script after quitting Claude Code.

Script removes binary: Homebrew cask `claude-code` (macOS), npm package `@anthropic-ai/claude-code`, else file `claude` resolves to on PATH.

Script removes data: `~/.local/share/claude` (native install versions), `~/.claude`, `~/.claude.json` (Windows: under `%USERPROFILE%`).

Script removes lines referencing Claude, plus `# >>> core:env >>>` block from `/core:setup`, in shell rc files (`.zshrc`, `.zprofile`, `.bashrc`, `.bash_profile`, `.profile`, fish `config.fish`) and, on Windows, PowerShell profiles.

Before building command: AskUserQuestion confirming Claude Code uninstall and deletion of `<full path of ~/.claude>`, `<full path of ~/.claude.json>`, `<full path of ~/.local/share/claude>`. Decline -> stop, build nothing.

OS is Windows if `$env:OS` is `Windows_NT` or `uname -s` starts with `MINGW`, `MSYS` or `CYGWIN`; else macOS or Linux.

Windows command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/uninstall.ps1"`

macOS or Linux command: `bash "${CLAUDE_SKILL_DIR}/uninstall.sh"`

After building command: give it to user in code block; tell user to quit Claude Code (every window), open terminal, paste it; script prints one line per thing removed. Then stop.
