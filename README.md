# xve-claude-marketplace

Claude Code plugins for XVE.

| Plugin | What it does |
|--------|--------------|
| `starter` | Empty for now. |
| `destructive` | Skills that delete Claude Code state, on Windows and macOS. `purge-claude-user-scope` removes `~/.claude` (settings, memory, plugins, hooks, sessions, history) and `~/.claude.json` (MCP servers, account state) and keeps the `claude` binary. `uninstall-claude` also removes the binary (Homebrew cask, npm or direct install) with `~/.local/share/claude`, and strips Claude lines from shell rc files and PowerShell profiles. |

## Install

```
claude plugin marketplace add https://github.com/XVE-BV/claude-marketplace.git
claude plugin install starter@xve-claude-marketplace
claude plugin install destructive@xve-claude-marketplace
```

Skills in `destructive` never trigger on their own (`disable-model-invocation: true`). Run `/destructive:purge-claude-user-scope` or `/destructive:uninstall-claude`. Claude asks you to confirm, then gives you one command to paste into a terminal after you quit Claude Code. The delete can't run from inside Claude Code: Windows won't delete a running `claude.exe`, and a running session keeps writing to `~/.claude`.
