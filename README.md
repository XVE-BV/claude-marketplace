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

- [Plugins & commands](docs/plugins.md)
- [Configuration & env vars](docs/configuration.md)
- [Time tracking guide — Kimai token, ActivityWatch setup, troubleshooting](docs/time-tracking.md)
- [Repository structure](docs/structure.md)
