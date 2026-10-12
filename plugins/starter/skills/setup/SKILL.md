---
name: setup
description: Turn off auto memory, dynamic workflows, session recap and prompt suggestions in user-scope Claude Code settings.json, each one opt-in. Use when setting up Claude Code on a new machine or when asked to run starter setup. Not for permissions.
disable-model-invocation: true
---

Never write key for unselected item; unselected items stay untouched, never set to opposite value. Every other settings key stays untouched.

Items, each opt-in, nothing preselected, names exactly as listed.

Item `memory`: sets `autoMemoryEnabled` to false; Claude stops reading and writing auto memory, subagent memory included.

Item `workflows`: sets `disableWorkflows` to true; turns off dynamic workflows and bundled workflow commands.

Item `recap`: sets `awaySummaryEnabled` to false; no one-line recap on return to terminal.

Item `suggestions`: sets `promptSuggestionEnabled` to false; no grayed-out predictions in prompt.

Target is `settings.json` in `CLAUDE_CONFIG_DIR`, else `~/.claude`. Selected item overwrites existing value of its key. Script backs up to `settings.json.bak.<timestamp>` before first write, writes nothing when every selected key already holds its value, creates file when missing, exits 1 naming file on invalid JSON object.

```mermaid
flowchart TD
  ask["AskUserQuestion, multiSelect, four items: memory, workflows, recap, suggestions"] --> any{"any item selected"}
  any -->|no| stop["stop, run nothing"]
  any -->|yes| os{"$env:OS is Windows_NT, or uname -s starts with MINGW, MSYS or CYGWIN"}
  os -->|yes| win["Windows command with selected names"]
  os -->|no| nix["macOS or Linux command with selected names"]
  win & nix --> report["report one line per item"] --> done["stop"]
```

Windows command: `powershell -NoProfile -ExecutionPolicy Bypass -File "${CLAUDE_SKILL_DIR}/scripts/setup.ps1"` followed by selected names, space-separated.

macOS or Linux command: `sh "${CLAUDE_SKILL_DIR}/scripts/setup.sh"` followed by selected names, space-separated; needs `python3`.

Script prints `created PATH`, `backup PATH`, `written KEY=VALUE`, `already KEY=VALUE`. Line starting `invalid JSON object` or `needs python3` -> relay verbatim, stop.

After script: report per selected item written or already held; list unselected items as untouched; quote backup path.

After `memory` written or held: tell user repository settings file overrides user scope when it sets `autoMemoryEnabled`, and existing memory files stay on disk unloaded.

After any write: tell user running sessions reload settings on save; `/status` shows loaded sources and `claude doctor` lists rejected entries.
