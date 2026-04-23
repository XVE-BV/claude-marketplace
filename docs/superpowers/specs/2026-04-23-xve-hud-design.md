# xve-hud — Statusline with Handoff Urgency Banner

**Date:** 2026-04-23
**Scope:** Extend the existing `xve` plugin in `claude-marketplace` with a Claude Code statusline that warns the user when to run `/session-handoff`, based on context usage and burn-rate pace.

## Goal

Give XVE users a passive, always-visible signal telling them when to run `/session-handoff` — before Claude starts making mistakes around the 85% context danger zone.

The `/help` doc already publishes the canonical doctrine: **at ~60% context, pause and hand off.** Today that's a rule people have to remember. This spec makes it a line on the statusline.

## Non-goals

- No transcript-JSONL parsing (active tools, agents, todos). That's claude-hud's territory and requires Node.
- No configurable thresholds. The 60%/85% numbers are canon on `/help`; two places can't disagree.
- No new env vars.
- No separate `xve-hud` plugin entry — this extends the existing `xve` plugin (decision confirmed with user).

## Source material

- **claude-pace** (MIT, Astro-Han) — pure Bash + jq single-file statusline. Already reads stdin for `context_window` and `rate_limits`, already computes `5h` / `7d` quota usage and the pace delta (`⇡15%` = overspending, `⇣15%` = headroom). This is the runtime base.
- **claude-hud** (MIT, jarrodwatts) — reference only. Its richer features (tool activity, agents, todos) drag Node in and are out of scope.
- **`docs/index.html` `/help` route** — defines the color doctrine (green / blue / amber / red at 0-20% / 20-60% / 60% / 85%+) and the "whiteboard fills up" metaphor. The new statusline and its docs page must stay consistent with this language.

## Architecture

### File layout (inside `plugins/xve/`)

```
plugins/xve/
├── statusline/
│   ├── xve-hud.sh         # forked from claude-pace.sh + urgency banner
│   └── NOTICE             # preserves claude-pace MIT attribution
├── commands/
│   ├── xve-setup.md       # extended with one optional "wire statusline?" step
│   └── xve-hud-setup.md   # NEW — standalone installer
└── config/
    └── statusline.json    # { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/statusline/xve-hud.sh" }
```

### Runtime (`xve-hud.sh`)

Fork `claude-pace.sh` wholesale. Preserve its two existing output lines unchanged:

- **Line 1** — model, effort, project `(branch)`, git diff stats (`3f +24 -7`)
- **Line 2** — `5h` and `7d` quota bars, reset countdown, pace delta (`⇡15%` / `⇣15%`)

Add **one new line above them** — the XVE handoff banner. Computed from stdin JSON:

```
ctx_pct      = (context_window.current_usage.input_tokens
                / context_window.context_window_size) * 100
pace_delta   = already computed by claude-pace
```

### Urgency ladder

| Condition                                                      | Output                                              | Color |
|----------------------------------------------------------------|-----------------------------------------------------|-------|
| `ctx < 60%` and not pace-bumped                                | *(no banner line — quiet)*                          | —     |
| `ctx 60–85%` **or** `ctx ≥ 50% AND pace_delta ≥ +15%`          | `● handoff soon — /session-handoff`                 | amber |
| `ctx ≥ 85%`                                                    | `● handoff NOW — auto-compact imminent`             | red   |

Rationale for the pace-bump edge: burning 15% faster than sustainable means the 60% threshold arrives sooner than the user thinks. Nudging early at `ctx ≥ 50% + ⇡15%` prevents the "I thought I had more runway" failure.

### Integration points

- **`statusLine` in user's `~/.claude/settings.json`**:
  ```json
  {
    "statusLine": {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/plugins/xve/statusline/xve-hud.sh"
    }
  }
  ```
- **Dependencies** — `jq` (same as claude-pace; documented in `/hud` docs page).

## Setup UX

### `/xve-setup` (modified)

Add one step between "Apply settings.json" and "Install hooks":

> **Wire XVE statusline?** — merges the `statusLine` block into `~/.claude/settings.json` pointing at the plugin's `xve-hud.sh`. Asks before touching. Idempotent.

The existing setup-flow mermaid diagram in `docs/index.html` `/setup` route gets updated with this step.

### `/xve-hud-setup` (new)

Standalone command for users who already ran `/xve-setup` or want to toggle only the statusline. Same merge logic, extracted for reuse.

## Docs — new `/hud` Vue route in `index.html`

Add a fourth nav entry alongside `/help`, `/setup`, `/council`. Structure mirrors `/help`:

1. **Intro** — reuses the "whiteboard fills up" metaphor verbatim. One mental model across the docs.
2. **Mermaid diagram** — urgency state machine (`quiet → amber → red`, with the `⇡15% @ ctx ≥ 50%` early-bump edge).
3. **Threshold cards** — green / amber / red, same color classes (`card.green`, `card.amber`, `card.red`) already used on `/help`.
4. **Example strip** — three ASCII rows showing the banner in each state so users recognize what they'll see.
5. **Integration paragraph** — points to `/xve-setup` (recommended) and `/xve-hud-setup` (standalone).

No env var section — none introduced.

## Licensing and attribution

- `claude-pace` is MIT. Fork it; keep original copyright. Add `plugins/xve/statusline/NOTICE`:
  ```
  xve-hud is derived from claude-pace by Astro-Han (MIT).
  Original: https://github.com/Astro-Han/claude-pace
  Modifications © XVE, under MIT.
  ```
- No upstreaming obligation. Divergence is expected (XVE-specific thresholds and banner).

## Out of scope (explicit YAGNI)

- TypeScript or any Node-based rendering
- `dist/` build step in the marketplace repo
- Transcript JSONL parsing (tools, agents, todos)
- Configurable thresholds — the 60%/85% numbers are canon
- Per-project overrides
- Statusline telemetry

## Success criteria

- A user with `ctx ≥ 60%` sees the amber banner and knows to run `/session-handoff` without having to re-read `/help`.
- A user with `ctx ≥ 85%` sees the red banner and knows auto-compact is about to strip their context.
- A user burning fast (pace `⇡15%+`) at `ctx ≥ 50%` sees the amber banner early, preventing the "I thought I had more runway" failure.
- The statusline never appears below 50% context and never shows a banner when things are fine — quiet state must actually be quiet.
- `/help` doctrine and `/hud` doctrine use identical thresholds and identical color language. One mental model.
- `jq` is the only runtime dependency. No Node, no `dist/`, no build step.
