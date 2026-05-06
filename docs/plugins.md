# Skills

All skills are in the `xve` namespace — invoke with `/xve:<name>`.

## Explicit (user-invoked only)

| Skill | Action |
|-------|--------|
| `/xve:setup` | Bootstrap Claude Code on a new machine |
| `/xve:docs` | Open the XVE docs in the browser |
| `/xve:hud-setup` | Wire the xve-hud statusline into `~/.claude/settings.json` |

## Auto-triggered (Claude loads when relevant, or invoke directly)

| Skill | Triggers |
|-------|---------|
| `/xve:session-handoff` | "session handoff", "wrap up session", "hand off" |
| `/xve:llm-council` | "council this", "war room this", "pressure-test this", genuine multi-option decision |
| `/xve:diagram-design` | Architecture, flowchart, sequence, ER, timeline, swimlane, and other diagram requests |
| `/xve:humanize-writing` | "humanize this", "sounds too AI", "remove em dashes" |
| `/xve:combell-db-import` | "import combell dump", "restore combell backup", "load combell sql" |
| `/xve:wp-combell-to-local` | "localize wp db", "convert combell backup for local dev", "set up local wp from combell" |

## LLM Council

5 advisors run in parallel (Contrarian, First Principles, Expansionist, Outsider, Executor) → 5 anonymous peer reviewers → Chairman verdict → HTML report + markdown transcript saved locally.

**Use:** genuine uncertainty, high cost of wrong call.
**Skip:** factual lookups, creation tasks, already-decided things.

Full guide: [llm-council.md](llm-council.md)
