---
name: chrome-dev-skill
description: Use PROACTIVELY when the user wants to test, verify, or interact with a local or remote web app in the browser. Triggers: 'check in browser', 'test this locally', 'what does it look like', 'verify in chrome', 'debug in browser', 'browser automation', 'screenshot the site', 'fill the form', 'check the network requests', 'log in to the local site', 'open in chrome'. Launch with `claude --chrome` or `/chrome` mid-session. Chrome/Edge only (not Brave/Arc). Skip for headless API or backend-only debugging.
---

# Chrome Dev

Browser automation and testing for local web development via Claude Code's Chrome integration.

## Setup

Run `claude --chrome` to start a session with Chrome connected (installs native messaging host on first use, no extra MCP config needed). Or enable mid-session with `/chrome`. Requires Claude Pro/Max/Team/Enterprise and Google Chrome or Microsoft Edge.

## Which tool for which job

| Task | Tool |
|---|---|
| Navigate, click, fill forms, extract text | `mcp__claude-in-chrome__*` tools |
| Performance profiling, memory leaks, Lighthouse | `/chrome-devtools` skill |
| Native desktop apps (Finder, Mail, etc.) | Computer use |
| Headless API or server-side testing | Bash + curl |

## Workflow for local site checks

1. `tabs_context_mcp` to see what is open (do this first, always)
2. `navigate` to the local URL (e.g. `https://site.test/wp/wp-login.php`)
3. `read_page` or `get_page_text` for content inspection
4. `find` + `form_input` for form filling; `left_click` for interaction
5. `gif_creator` to record multi-step flows for review or sharing

## Debugging console and network

- `read_console_messages(pattern: "Error")` to filter rather than dump all output
- `read_network_requests` to check XHR responses, 404s, or CORS failures

## Authenticated local sessions

Chrome uses your real browser profile, so existing sessions and cookies are live. Useful for testing admin-gated pages. Be careful: actions taken are real (form submissions, admin changes).

## Limitations

Beta as of May 2026. Chrome/Edge only. Context usage increases when Chrome is connected by default. For sessions where Chrome is rarely needed, start without `--chrome` and enable via `/chrome` only when required.

## After logging in locally

If you just reset credentials with `xve:local-admin-reset`, use this skill to navigate to the login page and verify the new credentials work.
