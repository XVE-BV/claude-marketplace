# starter

Starter settings for Claude Code: one skill, `/starter:setup`, which never triggers on its own, and one output style, `ultra-concise`.

`setup` asks which user-scope preferences to apply, and writes only those to `settings.json` and `rules/` (in `CLAUDE_CONFIG_DIR`, else `~/.claude`):

| Item | Key it sets | Effect |
|------|-------------|--------|
| `memory` | `autoMemoryEnabled: false` | Claude stops reading and writing auto memory, subagent memory included. |
| `workflows` | `disableWorkflows: true` | Dynamic workflows and the bundled workflow commands are off. |
| `recap` | `awaySummaryEnabled: false` | No one-line recap when you come back to the terminal. |
| `suggestions` | `promptSuggestionEnabled: false` | No grayed-out predictions in the prompt. |
| `idlecompact` | `idleCompaction: false` | No compaction of a long conversation while the terminal sits idle. Needs Claude Code 2.1.290 or later. The first message after the one-hour prompt cache expires then resends the whole conversation uncached; `/compact` and auto-compact still work. |
| `style` | `outputStyle: "starter:ultra-concise"` | Selects the output style below. |
| `advisor` | `rules/starter-advisor.md` | Advisor checkpoints, decisive thinking, compaction survival. About 350 tokens. |
| `chat` | `rules/starter-chat.md` | TL;DR user-facing messages, questions only at the bottom. About 170 tokens. |
| `coding` | `rules/starter-coding.md` | Think before coding, simplicity, surgical changes, goal-driven work, review mindset. About 320 tokens. |
| `writing` | `rules/starter-writing.md` | Human prose with a banned-word list, for written artifacts only (commit messages, PR descriptions, READMEs, docs, code comments). About 270 tokens. |

The four rule files go in `~/.claude/rules/`, the documented user-level rules folder, which loads at launch in every project. Each costs input tokens in every session, so pick only what you want; deleting a file removes it. The text is the guideline set from `core-claude`'s `CLAUDE.md` block, without its org-specific lines, and with the Writing rule limited to written artifacts so it does not fight an output style. `setup` never edits your `CLAUDE.md`. If that file already holds a `core:guidelines` block it skips the rule files, to avoid loading the same guidance twice. A changed rule file is overwritten with no backup, so keep hand edits elsewhere.

## ultra-concise

An output style (`output-styles/ultra-concise.md`), listed by `/output-style` as `starter:ultra-concise`. Responses are fragments with the result first, and no greeting, narration, recap or offer of more help. A table replaces prose for comparisons, option sets and status across several items, and a diagram replaces prose for flows, sequences, dependencies and architecture, whenever either explains faster. Diagrams are drawn with box-drawing characters and arrows in a fenced block under 80 columns, not Mermaid, so they read as visuals in the terminal. An answer ends at its last table, diagram or code block; only a warning or a required next step may follow, never notes or a summary. Error messages, failing test output, security and data-loss warnings, destructive-action confirmations and anything you asked to have explained keep their full length. It keeps Claude Code's coding instructions (`keep-coding-instructions: true`) and applies to the main conversation, not to other subagents. It exists only while `starter` is enabled; without it, `outputStyle` falls back to Default. The built-in `Concise` style is the milder alternative.

Nothing is preselected. A key you don't pick is never touched, and a key you pick overwrites its current value. The script leaves no backup files; it replaces `settings.json` atomically (temp file, then rename). It writes nothing when every picked key already holds its value, creates the file if it is missing, and refuses an invalid file without changing it.

Windows uses `scripts/setup.ps1` (PowerShell 5.1 or 7). macOS and Linux use `scripts/setup.sh`, which needs `python3` (on a Mac, `xcode-select --install` provides it).

A repository's own settings file overrides user scope when it sets the same key, so a project can turn auto memory back on. Existing memory files stay on disk; they just aren't loaded.

Permissions are not part of `setup`.
