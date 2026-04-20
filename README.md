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

**Step 3 — Set your env vars:**

1. Open Claude in a terminal and say:
   > _"Set the following environment variables in the correct shell config file"_
   then paste the contents of the **"xve claude marketplace env vars"** note from Bitwarden.
   Claude adds them to `~/.zshrc` (Mac/Linux) or the Windows equivalent automatically.

2. Close Claude, re-open it (so the new env vars are loaded).

**Step 4 — Run setup** ([read what this does first](docs/xve-setup.md))**:**

```
/xve-setup
```

That's it. Claude will guide you through the rest.

---

| Doc | What's in it |
|-----|-------------|
| [Plugins & commands](docs/plugins.md) | All slash commands and what they do |
| [Configuration & env vars](docs/configuration.md) | Env var reference, model/advisor strategy |
| [Repository structure](docs/structure.md) | File layout and what each file does |
| [LLM Council](docs/llm-council.md) | Multi-advisor decision framework — when and how to use it |
| [xve-setup guide](docs/xve-setup.md) | What `/xve-setup` does, step by step |
