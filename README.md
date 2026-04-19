# xve-claude-marketplace

Claude Code plugins for time tracking and machine setup.

## Getting started

> New to terminals? See [how to open a terminal and paste commands](docs/open-terminal.md).

**Step 1 — Open Claude Code and add this marketplace:**

```
claude plugin marketplace add https://github.com/XVE-BV/claude-marketplace.git
```

**Step 2 — Install the plugins:**

```
claude plugin install xve@xve-claude-marketplace
```

Optionally, install the time tracking plugins:

```
claude plugin install kimai@xve-claude-marketplace
claude plugin install activitywatch@xve-claude-marketplace
```

**Step 3 — Set your env vars:**

Get the values from Bitwarden: **"xve claude marketplace env vars"** and add them to `~/.zshrc`. Ask claude do it for you, after that you edit api key value and have it search in kimai for your desired projects. Then claude will be able to identify things smoother.

**Step 4 — Run setup** ([read what this does first](docs/xve-setup.md))**:**

```
/xve-setup
```

That's it. Claude will guide you through the rest.

---

| Doc | What's in it |
|-----|-------------|
| [Plugins & commands](docs/plugins.md) | All slash commands and what they do |
| [Time tracking guide](docs/time-tracking.md) | How to get your Kimai API token, what ActivityWatch is, troubleshooting |
| [Configuration & env vars](docs/configuration.md) | Env var reference, model/advisor strategy, feature toggles |
| [Repository structure](docs/structure.md) | File layout and what each file does |
| [LLM Council](docs/llm-council.md) | Multi-advisor decision framework — when and how to use it |
| [xve-setup guide](docs/xve-setup.md) | What `/xve-setup` does, step by step |
