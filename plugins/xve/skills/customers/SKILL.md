---
name: xve-customers
description: Customer config loaded from XVE_CUSTOMER_N env vars. Reference for kimai and activitywatch plugins.
---

# Customer Configuration

All customer data lives in env vars — never in committed files.

## Env var format

```bash
# In ~/.zshrc — see .env.example for full template
export XVE_CUSTOMER_1="path_hint|kimai_project_id|display_label|aw_pattern"
export XVE_CUSTOMER_2="..."
# Order matters: more specific path hints before broader ones
```

## Reading customers at runtime

```bash
for i in $(seq 1 20); do
    VAR="XVE_CUSTOMER_$i"
    ENTRY="${!VAR}"
    [ -z "$ENTRY" ] && break
    PATH_HINT=$(echo "$ENTRY" | cut -d'|' -f1)
    PROJ_ID=$(echo "$ENTRY"   | cut -d'|' -f2)
    LABEL=$(echo "$ENTRY"     | cut -d'|' -f3)
    AW_PAT=$(echo "$ENTRY"    | cut -d'|' -f4)
    echo "$LABEL: path=$PATH_HINT project=$PROJ_ID aw=$AW_PAT"
done
```

## ActivityWatch exclusions

```bash
echo "${AW_EXCLUDE:-(not set)}"
```

Patterns matching `$AW_EXCLUDE` are never counted or billed.

## Internal project fallback

```bash
echo "${KIMAI_INTERNAL_ID:-(not set)}"
```
