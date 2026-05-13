# xve-claude-marketplace

Claude Code plugins for machine setup and configuration.

## Getting started

> New to terminals? See [how to open a terminal and paste commands](docs/open-terminal.md).

**Step 1 — Open Claude Code and add this marketplace:**

```
claude plugin marketplace add https://github.com/XVE-BV/claude-marketplace.git
```

**Step 2 — Install the plugin:**

```
claude plugin install xve@xve-claude-marketplace
```

open claude in terminal.

**Step 3 — Run setup** ([read what this does first](docs/setup.md))**:**

type
```
/xve:setup # and enter
```

Claude will guide you through the rest.

---

| Doc | What's in it |
|-----|-------------|
| [Skills reference](docs/plugins.md) | All skills and what they do |
| [Matt Pocock skills](#matt-pocock-skills) | Ported engineering and productivity skills |
| [Configuration & env vars](docs/configuration.md) | Env var reference, model/advisor strategy |
| [Repository structure](docs/structure.md) | File layout and what each file does |
| [LLM Council](docs/llm-council.md) | Multi-advisor decision framework — when and how to use it |
| [Setup guide](docs/setup.md) | What `/xve:setup` does, step by step |
| [Notification hooks](docs/notification-hooks.md) | OS notifications for lifecycle events (Stop, StopFailure, PreCompact, TeammateIdle, etc.) |

---

## Matt Pocock skills

Eight skills ported from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT License, Copyright (c) 2026 Matt Pocock). All are standalone and require no per-project setup.

| Skill | What it does | Validation |
|-------|-------------|------------|
| `/xve:diagnose` | Disciplined 6-phase debugging loop: build feedback loop, reproduce, hypothesise, instrument, fix, cleanup | Internal merit |
| `/xve:tdd` | Red-green-refactor with vertical-slice anti-pattern callout. Bundled reference files: tests.md, mocking.md, deep-modules.md, interface-design.md, refactoring.md | Matt's daily-5, ExplainX, Medium |
| `/xve:improve-codebase-architecture` | Surface deepening opportunities using module/interface/depth/seam vocabulary. Bundled: LANGUAGE.md, DEEPENING.md, INTERFACE-DESIGN.md | Matt's daily-5 |
| `/xve:prototype` | Routes to a terminal TUI (logic/state questions) or URL-param UI variants (design questions). Bundled: LOGIC.md, UI.md | Internal merit |
| `/xve:zoom-out` | One-liner: go up a layer of abstraction and map modules + callers | Internal merit |
| `/xve:grill-me` | Relentless decision-tree interview about a plan or design | Matt's daily-5, ExplainX, Medium |
| `/xve:caveman` | Ultra-compressed mode, cuts ~75% tokens while keeping technical accuracy | Internal merit |
| `/xve:write-a-skill` | Meta-skill for authoring new skills with proper structure and progressive disclosure | Internal merit |

Skills skipped and why: `handoff` (redundant with `xve:session-handoff` and has confirmed bugs), `grill-with-docs` (requires CONTEXT.md/ADR convention), issue-tracker bundle `to-prd`/`to-issues`/`triage`/`setup-matt-pocock-skills` (requires per-project docs/agents setup), `git-guardrails` (overlaps judge-hook work in progress).
