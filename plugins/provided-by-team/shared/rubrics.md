<!-- Stand-in for the team rubric, written from what robbe-review-skill asks of it (Jira cloudId, "The request"). Robbe replaces this whole file with the real one. -->
Jira: site `https://xve.atlassian.net`; pass `xve.atlassian.net` as `cloudId` to `getJiraIssue`, `discover` and `executeRead`; rejected -> call `getAccessibleAtlassianResources` once and use the `cloudId` of the resource whose `url` is `https://xve.atlassian.net`.
The request: each line below that the ticket fails is one "Ticket" line in the summary, addressed to whoever wrote the ticket, never a PR finding and never a blocker.
The request: summary or description names who needs the change and what the app does differently for them afterwards.
The request: every DONE WHEN line is checkable from app behaviour alone (input, action, visible result, concrete values); a line like "works correctly" or "is improved" fails.
The request: ticket is sluitend: roles, existing records, empty or NULL values, and every output that shows the changed data (screen, export, PDF, mail, API) are covered or explicitly excluded.
The request: no DONE WHEN line contradicts another line, the description, a later decision in a Jira comment, the parent ticket or a linked ticket.
The request: asked behaviour fits how the business already works (existing statuses, VAT and invoicing rules, customer and role boundaries); conflict -> name the existing rule it breaks and propose the fix.
