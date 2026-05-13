---
name: automode-env
description: Configure trusted infrastructure entries for the auto mode classifier — GitHub orgs, internal domains, and hosting providers.
disable-model-invocation: true
---

Configure which GitHub orgs, internal domains, and hosting providers the auto mode classifier should treat as trusted.

## Why this matters

In auto mode, the classifier doesn't know which infrastructure is yours. Without trusted entries it may pause on:
- Pushes to your GitHub orgs (flags as potential "push to default branch" or data exfiltration)
- API calls to your own domains (flags as potential exfil target)
- SSH/rsync deployments to your hosting provider (flags as "remote shell write to production")

Adding entries tells the classifier these are safe for your workflow and lets them pass through silently.

## Step 1 — Show current state

```bash
claude auto-mode config
```

Show the user their current effective `environment` block so they know what's already set.

## Step 2 — GitHub orgs

Ask:
> "GitHub orgs to trust? Enter one per line, e.g. `github.com/your-org` — or Enter to skip."

For each org provided:
```bash
jq --arg e "Source control: github.com/ORG and all repos under it" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

## Step 3 — Internal domains

Ask:
> "Internal domains to trust? Enter one per line, e.g. `*.example.com` — or Enter to skip."

For each domain:
```bash
jq --arg e "Trusted internal domains: DOMAIN" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

## Step 4 — Hosting / deployment targets

Ask:
> "Hosting providers or deployment targets? Describe in plain language, e.g. `Combell (combell.com) — PHP/WordPress deployments via SSH and rsync` — or Enter to skip."

For each entry:
```bash
jq --arg e "Trusted hosting provider: DESCRIPTION" \
  '.autoMode.environment += [$e]' ~/.claude/settings.json > /tmp/s.json && mv /tmp/s.json ~/.claude/settings.json
```

## Step 5 — Confirm

```bash
claude auto-mode config
```

Show the updated `environment` block so the user can verify the entries look correct.
