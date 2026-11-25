# xve-claude-marketplace

Claude Code plugins for XVE.

| Plugin | What it does |
|--------|--------------|
| `starter` | `setup` turns off auto memory, dynamic workflows, the session recap, prompt suggestions, idle compaction or the feedback survey in `~/.claude/settings.json`, can switch you to the plugin's `ultra-concise` output style, and can install four guideline rule files (advisor, chat, coding, writing) into `~/.claude/rules/`, each one only if you pick it. It leaves no backup files, leaves every other key alone, and runs on Windows (PowerShell) and macOS or Linux (needs `python3`). Run `/starter:setup`; it never triggers on its own. |
| `destructive` | Skills that delete Claude Code state, on Windows and macOS. `purge-user-scope` removes `~/.claude` (settings, memory, plugins, hooks, sessions, history) and `~/.claude.json` (MCP servers, account state) and keeps the `claude` binary. `uninstall-cli` also removes the binary (Homebrew cask, npm or direct install) with `~/.local/share/claude`, and strips Claude lines from shell rc files and PowerShell profiles. |
| `claudecodemonitor-hud-mod` | Mod: one line above the prompt with the session's model and effort beside the ones your settings set, the advisor model, and the git branch. Needs Claude Code 2.1.287 or later. |
| `meta` | Skills that author this marketplace. `create-skill` adds or edits a skill here, with its plugin files, marketplace entry and README row, and writes the skill in a terse rule form meant for an LLM reader, not a human one. |
| `provided-by-team` | Skills written by XVE team members. `robbe-review-skill` reviews a PR or branch against its Jira ticket: does the app now do what the ticket asks, in every real case? It checks the business logic first, and `strict` also checks how the code is written. It changes nothing in the repo or on GitHub; it writes the review comments to `/tmp/robbe-review-skill/` and opens them as a page with a Copy button per comment. Once it runs, a hook stays on for the rest of the session: it lets two read-only `gh api` calls, the comments file and the comments page through without a prompt, and it blocks any `gh api` call that writes. macOS or Linux, needs `python3` and `gh`. |

## Install

```
claude plugin marketplace add https://github.com/XVE-BV/claude-marketplace.git
claude plugin install starter@xve-claude-marketplace
claude plugin install destructive@xve-claude-marketplace
claude plugin install claudecodemonitor-hud-mod@xve-claude-marketplace
claude plugin install meta@xve-claude-marketplace
claude plugin install provided-by-team@xve-claude-marketplace
```

Skills in `destructive` never trigger on their own (`disable-model-invocation: true`). Run `/destructive:purge-user-scope` or `/destructive:uninstall-cli`. Claude asks you to confirm, then gives you one command to paste into a terminal after you quit Claude Code. The delete can't run from inside Claude Code: Windows won't delete a running `claude.exe`, and a running session keeps writing to `~/.claude`.
