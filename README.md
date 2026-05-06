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
| [Configuration & env vars](docs/configuration.md) | Env var reference, model/advisor strategy |
| [Repository structure](docs/structure.md) | File layout and what each file does |
| [LLM Council](docs/llm-council.md) | Multi-advisor decision framework — when and how to use it |
| [Setup guide](docs/setup.md) | What `/xve:setup` does, step by step |
