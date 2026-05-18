---
name: solo-spawn-skill
description: Use PROACTIVELY when the user wants to spawn a long-lived independent agent, run work in parallel across Solo projects, or schedule a timer-based wake-up that must outlive this session. Triggers: 'spawn another claude', 'run a parallel agent', 'delegate to another project', 'set a timer', 'wake me when X', 'run this in the background in solo'. Skip for short in-conversation parallel work (use main Agent tool instead).
---

# Solo Spawn

Spawn long-lived agents and schedule cross-session wake-ups.

## Spawn vs. Agent decision

Use the main-conversation `Agent` tool for in-conversation parallel work that completes before this session ends. Use `mcp__solo__spawn_agent` when the work is long-lived, must run independently in another Solo project, or needs timer-based wake-ups that outlive this session.

## Spawn workflow

1. `list_agent_tools` to see available runtimes; use the returned `id` as `agent_tool_id`
2. `spawn_agent(agent_tool_id, name, extra_args)` to create the process
3. Prepend the returned `agent_instructions` to the first prompt you send
4. `send_input(process_id, bytes)` to drive the agent (bytes are ASCII codes)

The spawned agent receives instructions via stdin. Structure prompts as self-contained turns.

## Cross-project orchestration

Spawn one agent per project (pass `project_id` to `spawn_agent`). Coordinate via `xve:solo-handoff` scratchpads: write state before spawning, pass the scratchpad ID in the initial prompt, let the agent append results.

## Timers

`timer_set(delay_ms, body, delivery_process_id)` injects `body` as a fresh user turn into the target process after the delay. `timer_fire_when_idle_any(timer_ids)` fires the first timer whose target process is idle. `timer_cancel(timer_id)` to abort.

Timer body must be self-contained: include all process IDs, scratchpad IDs, and the next action, since the agent has no memory of why the timer was set.

## Pitfalls

`whoami` fails when Claude is not itself running inside a Solo-managed process. Timers and full spawn semantics only work reliably when the orchestrating Claude is Solo-managed. In a standard Claude Code session, use `send_input` to drive spawned agents instead of expecting timer delivery back to yourself.

## Coordination

For state sharing between spawned agents, use `xve:solo-handoff`. To inspect a spawned process's logs or port bindings, use `xve:solo-processes`.
