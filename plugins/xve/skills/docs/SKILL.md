---
name: docs-skill
description: Open the XVE docs in the browser — Getting Started, Setup, and LLM Council in one page.
disable-model-invocation: true
---

Open `docs/index.html` from this marketplace repo in the default browser.

## Step 1 — Find the repo

```bash
REPO_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]:-$0}")" rev-parse --show-toplevel 2>/dev/null)"
```

If empty, check common locations or ask the user.

## Step 2 — Open the docs

**Windows:**
```bash
start "" "$REPO_DIR/docs/index.html"
```

**macOS:**
```bash
open "$REPO_DIR/docs/index.html"
```

**Linux:**
```bash
xdg-open "$REPO_DIR/docs/index.html"
```

Detect OS from `$OSTYPE` or `uname` and run the correct command. No output on success.
