# xve-claude-marketplace

Claude Code plugins for time tracking and machine setup.

## Getting started

**Step 1 — Open Claude Code and add this marketplace:**

```
/plugin marketplace add https://github.com/jonasvanderhaegen-xve/xve-claude-marketplace.git
```

**Step 2 — Install the plugins:**

```
/plugin install xve@xve-claude-marketplace
/plugin install kimai@xve-claude-marketplace
/plugin install activitywatch@xve-claude-marketplace
```

**Step 3 — Set your env vars:**

Get the values from Bitwarden: **"xve claude marketplace env vars"** and add them to `~/.zshrc`.

**Step 4 — Run setup:**

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
