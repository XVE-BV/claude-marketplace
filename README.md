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

1. Open Claude in a terminal and say:
   > _"Set the following environment variables in the correct shell config file"_
   then paste the contents of the **"xve claude marketplace env vars"** note from Bitwarden.
   Claude adds them to `~/.zshrc` (Mac/Linux) or the Windows equivalent automatically.

2. Ask Claude to open that file for you, then **edit the API key value manually** and save.

3. Close Claude, re-open it (so the new env vars are loaded).

4. Ask Claude to **map your Kimai projects as env variables** — either:
   - _"Search the Kimai API and list my projects"_ — pick the ones you want, Claude sets the vars, or
   - _"Check my time entry hotspots and map those projects as env variables"_ — Claude figures out your most-used projects automatically.

   With projects mapped, time tracking works without looking up IDs each time.

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
