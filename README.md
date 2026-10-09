# xve-claude-marketplace

Claude Code plugins for XVE.

| Plugin | What it does |
|--------|--------------|
| `starter` | Empty for now. |
| `destructive` | Skills that delete Claude Code state. `purge-claude-user-scope` removes `~/.claude` (settings, memory, plugins, hooks, sessions, history) and keeps the `claude` binary installed. It asks you to type `PURGE` before it deletes anything. |

## Install

```
claude plugin marketplace add https://github.com/XVE-BV/claude-marketplace.git
claude plugin install starter@xve-claude-marketplace
claude plugin install destructive@xve-claude-marketplace
```

Skills in `destructive` never trigger on their own (`disable-model-invocation: true`). Run them from the `/` menu.
