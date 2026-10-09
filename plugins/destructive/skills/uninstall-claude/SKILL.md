---
name: uninstall-claude-skill
description: Remove all Claude Code user-scope files and uninstall the claude binary from this machine.
disable-model-invocation: true
---

Uninstalls Claude Code. The script removes:
- the binary: Homebrew cask `claude-code` (macOS), npm package `@anthropic-ai/claude-code`, or else the file `claude` resolves to on PATH
- `~/.claude` (Windows: `%USERPROFILE%\.claude`)
- lines that reference Claude, plus the `# >>> core:env >>>` block from /core:setup, in shell rc files (`.zshrc`, `.zprofile`, `.bashrc`, `.bash_profile`, `.profile`, fish `config.fish`) and, on Windows, the PowerShell profiles

Do not run the script yourself. Windows cannot delete a running `claude.exe`, and a running Claude Code keeps writing to `~/.claude`. The user runs the script after quitting Claude Code.

1. Confirm with AskUserQuestion: uninstall Claude Code and delete `<full path of ~/.claude>`. If they decline, stop.
2. Find the OS. Windows if `$env:OS` is `Windows_NT` or `uname -s` starts with `MINGW`, `MSYS` or `CYGWIN`. Otherwise macOS or Linux.
3. Build the command. `<skill dir>` is the absolute "Base directory for this skill" shown when this skill loaded. Do not use `$CLAUDE_PLUGIN_ROOT`: tool shells don't have it.
   - Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File "<skill dir>\uninstall.ps1"`
   - macOS / Linux: `bash "<skill dir>/uninstall.sh"`
4. Give the user the command in a code block and tell them: quit Claude Code (every window), open a terminal, paste it. It prints one line per thing it removed. Then stop.
