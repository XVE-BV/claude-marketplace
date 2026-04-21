---
description: Open the XVE Claude Code guide — session flow, whiteboard zones, and command reference for new users.
---

Open `docs/index.html#/help` from this marketplace repo in the default browser.

## Step 1 — Find the repo

```bash
REPO_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]:-$0}")" rev-parse --show-toplevel 2>/dev/null)"
```

If that returns empty, look for the marketplace in common locations (`~/Code`, `~/Work`, `~/Projects`). If still not found, ask the user where it's checked out.

## Step 2 — Open the file

Run the correct command for the OS:

**Windows:**
```bash
start "" "$REPO_DIR/docs/index.html#/help"
```

**macOS:**
```bash
open "$REPO_DIR/docs/index.html#/help"
```

**Linux:**
```bash
xdg-open "$REPO_DIR/docs/index.html#/help"
```

Detect the OS from `$OSTYPE` or `uname` and run the matching command. No output on success.
