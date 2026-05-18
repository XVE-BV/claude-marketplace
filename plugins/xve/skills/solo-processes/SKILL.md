---
name: solo-processes-skill
description: Use PROACTIVELY when the user wants to start, stop, restart, or inspect a persistent process in a Solo-tracked project. Triggers: 'start the dev server', 'run the queue worker', 'what is running', 'tail the logs', 'what port is X on', 'restart the watcher', 'process output', 'stop the server'. Skip for one-shot Bash commands not in a Solo project.
---

# Solo Processes

Manage persistent processes in Solo-tracked projects.

## Startup workflow

1. `list_projects` to see available projects and their IDs
2. `select_project(project_id)` to set the default scope
3. `start_process(name)` or `get_process_status(process_id)` to start or inspect

## start_process vs spawn_process

Use `start_process(name)` for commands declared in `solo.yml` (named commands like `dev`, `queue`, `watch`). Use `spawn_process(command)` for ad-hoc commands not in `solo.yml`.

## Reading output

- `get_process_output(process_id)` for standard text output (default)
- `get_process_raw_output(process_id)` when the output contains ANSI or control codes
- `search_output(process_id, pattern)` to find specific log lines by regex

## Port lookup

After starting a process, use `get_process_ports(process_id)` to see bound ports. To block until a port is ready: `wait_for_bound_port(process_id, port)`.

## Sending input

`send_input(process_id, input)` types text and appends Enter by default. Use `submit=false` to suppress Enter. For control codes, use `bytes=[3]` (Ctrl+C), `bytes=[4]` (Ctrl+D), or `bytes=[27]` (Escape).

## Diagnosing crashes

Call `get_process_status(process_id)` and use `poll()` and `has_exited()` on the result. Do not use `is_running()`: it does not account for processes that exited between calls.

For exit context, also check `search_output` for the last few lines before the crash.

## Handoff

If handing off process state to another agent, invoke `xve:solo-handoff` next. At end-of-session in a Solo project, use `xve:session-handoff` with Solo process IDs (not shell IDs from `run_in_background`).
