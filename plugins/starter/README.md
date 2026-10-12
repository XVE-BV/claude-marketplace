# starter

Starter settings for Claude Code. One skill, `/starter:setup`, which never triggers on its own.

`setup` asks which of four user-scope preferences to turn off, and writes only those to `settings.json` (in `CLAUDE_CONFIG_DIR`, else `~/.claude`):

| Item | Key it sets | Effect |
|------|-------------|--------|
| `memory` | `autoMemoryEnabled: false` | Claude stops reading and writing auto memory, subagent memory included. |
| `workflows` | `disableWorkflows: true` | Dynamic workflows and the bundled workflow commands are off. |
| `recap` | `awaySummaryEnabled: false` | No one-line recap when you come back to the terminal. |
| `suggestions` | `promptSuggestionEnabled: false` | No grayed-out predictions in the prompt. |

Nothing is preselected. A key you don't pick is never touched, and a key you pick overwrites its current value. The script copies `settings.json` to `settings.json.bak.<timestamp>` before its first write, writes nothing when every picked key already holds its value, creates the file if it is missing, and refuses an invalid file without changing it.

Windows uses `scripts/setup.ps1` (PowerShell 5.1 or 7). macOS and Linux use `scripts/setup.sh`, which needs `python3` (on a Mac, `xcode-select --install` provides it).

A repository's own settings file overrides user scope when it sets the same key, so a project can turn auto memory back on. Existing memory files stay on disk; they just aren't loaded.

Permissions are not part of `setup`.
