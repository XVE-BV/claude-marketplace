---
description: Open all XVE HTML guides in the browser — session flow, setup walkthrough, and LLM council reference.
---

Open all three XVE HTML guides in the default browser.

## Step 1 — Find the repo

```bash
REPO_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]:-$0}")" rev-parse --show-toplevel 2>/dev/null)"
```

If empty, check common locations or ask the user.

## Step 2 — Open all guides

**Windows:**
```bash
start "" "$REPO_DIR/docs/xve-help.html"
start "" "$REPO_DIR/docs/xve-setup.html"
start "" "$REPO_DIR/docs/xve-llm-council.html"
```

**macOS:**
```bash
open "$REPO_DIR/docs/xve-help.html"
open "$REPO_DIR/docs/xve-setup.html"
open "$REPO_DIR/docs/xve-llm-council.html"
```

**Linux:**
```bash
xdg-open "$REPO_DIR/docs/xve-help.html"
xdg-open "$REPO_DIR/docs/xve-setup.html"
xdg-open "$REPO_DIR/docs/xve-llm-council.html"
```

Detect OS from `$OSTYPE` or `uname` and run the correct set. No output on success.
