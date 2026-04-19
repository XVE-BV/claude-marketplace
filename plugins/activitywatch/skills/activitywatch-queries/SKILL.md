---
name: activitywatch-queries
description: AW query language patterns — customer attribution, multi-bucket aggregation, gap analysis, debug queries
---

# ActivityWatch Query Patterns

## When to Use This Skill

- Building queries to attribute time to a customer or project
- Combining multiple watcher buckets for accurate totals
- Debugging why a pattern isn't matching expected data
- Generating Kimai gap reports from AW data

## Pattern Files

| Pattern | File | Use Case |
|---------|------|----------|
| Customer time sum | [customer-sum.md](customer-sum.md) | Total seconds per customer, today or date range |
| Multi-bucket aggregation | [multi-bucket.md](multi-bucket.md) | Combine window + web + vscode + terminal |
| Debug titles | [debug-titles.md](debug-titles.md) | See raw matched titles to verify patterns |
| Gap analysis | [gap-analysis.md](gap-analysis.md) | Find AW time with no Kimai entry |

## Quick Start

```python
# Time for one customer today (window + AFk only)
q = (
    'events = query_bucket("aw-watcher-window_HOST"); '
    'afk = query_bucket("aw-watcher-afk_HOST"); '
    'afk = filter_keyvals(afk, "status", ["not-afk"]); '
    'events = filter_period_intersect(events, afk); '
    'matched = filter_keyvals_regex(events, "title", "(?i)dwb"); '
    'RETURN = sum_durations(matched)'
)
```

## Core Concepts

- Always filter by AFk to exclude idle time
- Use `filter_period_intersect` to intersect window events with non-AFK periods
- Query each bucket separately — don't mix bucket types in one query
- `sum_durations` returns total seconds as a float
- `sort_by_duration` returns the event array sorted by duration desc — useful for debugging
