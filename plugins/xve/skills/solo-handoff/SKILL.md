---
name: solo-handoff-skill
description: Use PROACTIVELY when the user needs to share state across Claude sessions, hand off work to another agent, or coordinate across Solo projects. Triggers: 'hand off to another agent', 'save this for next session', 'shared todo', 'transfer to other project', 'scratchpad', 'lock to prevent race', 'cross-project', 'another agent needs this'. For in-conversation work only, use TaskCreate instead.
---

# Solo Handoff

Coordination primitives for cross-session and cross-agent state.

## When to use what

| Need | Tool |
|---|---|
| Persist structured notes for next session | `scratchpad_write` |
| Shared task list across agents | `todo_create` / `todo_list` |
| Prevent concurrent writes to a shared resource | `lock_acquire` / `lock_release` |
| Move state to a different Solo project | `scratchpad_transfer` / `todo_transfer` |
| In-conversation work only | TaskCreate (built-in, not Solo) |
| Permanent user-level preferences | `~/.claude/memory/` |

## Scratchpad lifecycle

1. `scratchpad_write(name, content)` to create (project scopes from the session; a leading H1 in content becomes the title)
2. `scratchpad_append(id, content)` or `scratchpad_edit(id, target, content, expected_revision)` to update
3. `scratchpad_read(id)` for full content; `scratchpad_tail(id, lines)` for recent lines
4. `scratchpad_archive(id)` when done, or `scratchpad_delete(id, expected_revision)` to remove entirely

`scratchpad_list()` to browse all scratchpads. `scratchpad_find(id, query)` searches text *within* one scratchpad, not across all of them.

## Cross-project transfer

`scratchpad_transfer(id, target_project_id)` moves a scratchpad to another project. `todo_transfer(todo_id, target_project_id)` does the same for todos. Resolve `target_project_id` with `list_projects` first.

## Todos with dependencies

`todo_add_blocker(todo_id, blocker_todo_id)` sets a dependency chain. `todo_set_blockers(todo_id, [ids])` replaces the full set. Pass `response_mode: rich` on write ops (`todo_create`, `todo_update`, etc.) to get hydrated state in the response; use `todo_get` for a full read of any todo.

## Locks

`lock_acquire(key)` before writing shared state; `lock_release(key)` after. `lock_status(key)` to check. Always release in the same session that acquired, or the lock persists until TTL.

## Handoff chain

If handing off to a freshly spawned agent, invoke `xve:solo-spawn` first to get the agent process ID, then pass scratchpad IDs in the initial prompt.
