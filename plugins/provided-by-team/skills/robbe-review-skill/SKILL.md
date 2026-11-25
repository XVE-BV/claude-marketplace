---
name: robbe-review-skill
description: Review a PR or branch against its Jira ticket - does it make the app behave the way the ticket asks, in every real situation? Business logic first; an optional strict mode also checks how the code is written. Takes previous reviews into account and stays within a strict budget. Always use this skill when the user asks for a code review, PR review, "review my PR", "look at my changes", or invokes /provided-by-team:robbe-review-skill.
argument-hint: "[pr-number] [strict]"
model: opus
effort: high
allowed-tools: Read Grep Glob Bash(gh pr view *) Bash(gh pr diff *) Bash(git grep *) Bash(git diff *) mcp__atlassian__getJiraIssue mcp__atlassian__discover mcp__atlassian__executeRead mcp__atlassian__getAccessibleAtlassianResources mcp__plugin_atlassian_atlassian__getJiraIssue mcp__plugin_atlassian_atlassian__discover mcp__plugin_atlassian_atlassian__executeRead mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources
disallowed-tools: Edit NotebookEdit
hooks:
  PreToolUse:
    - matcher: "Bash|Write"
      hooks:
        - type: command
          command: "/usr/bin/python3 -I \"${CLAUDE_PLUGIN_ROOT}/skills/robbe-review-skill/scripts/guard.py\""
---

Review like a colleague who knows the ticket and the business.

**The question:** does this PR make the app behave the way the ticket asks, correctly, in every
real situation the business will hit? A perfect PR with the wrong behaviour is REQUEST CHANGES.
A slightly messy PR that does exactly the right thing, safely and tested, can be approved. Short
on budget? Cut the code check, never the business check.

Never post comments or submit the review on GitHub unless asked.

## Step 0: Rules
Read `${CLAUDE_PLUGIN_ROOT}/shared/rubrics.md`
and `.claude/client.md` if it exists. Neither counts against the budget.

## Step 1: Context (before judging any code)
1. `gh pr view <n> --json number,title,body,author,headRefName,headRefOid,baseRefName,url,reviews,comments`
   and `gh pr diff <n>` (no PR: `git diff <base>...HEAD`).
2. **Code outside the diff:** read it from GitHub; never `git fetch` or check out. Use exactly
   this form (the guard approves it without a prompt; the `| nl -ba` and `| sed` parts are optional):
   `gh api "repos/{owner}/{repo}/contents/<path>?ref=<ref>" -H "Accept: application/vnd.github.raw" | nl -ba | sed -n '<from>,<to>p'`
   `<ref>` is `headRefOid` for the PR, `baseRefName` for the base.
3. **Jira key:** PR title, then description, then branch and commits. Several? The title wins;
   the others are related. None? Ask and stop.
4. **Ticket:** `getJiraIssue` (cloudId from the rubric), fields
   `["summary","description","status","issuetype","comment","parent","issuelinks","timetracking"]`,
   `responseContentFormat: "markdown"`. Done-when from DONE WHEN in the description. A later decision in a comment overrides the description.
   Parent and links: summary only. Jira unavailable? Review against the PR description and say so.
5. **Previous reviews:** reviews and comments from step 1, plus inline comments:
   `gh api --paginate "repos/{owner}/{repo}/pulls/<n>/comments" --jq '.[] | {user: .user.login, path, line, commit_id, body}'`
   For each review older than `headRefOid`, check every point against the current diff:
   addressed or still open. The diff decides, not the thread status.
6. **Strict mode:** on with the argument `strict`, or when `author.login` is listed in
   `~/.claude/xve-personal.md` (if it exists; not counted in the budget).

## Step 2: Business check (most of the budget)
**2.0 The ticket itself.** Before the PR, check the ticket against the request (rubric "The
request"): does it fit the business, and is it sluitend? A gap or conflict in the ticket goes
on the "Ticket" line for whoever wrote the ticket. It is never a PR finding and never blocks
the PR: the developer built what was agreed.

**2a. Scenarios. Write them down before reading the code.**
- The done-when lines are the scenarios, literally, same number (done-when 1 = S1). Only add
  values where a line has none.
- No done-when? Derive them from summary, description and comments, mark `(derived)`, and ask
  the PO to confirm.
- Add 2–4 realistic cases the ticket misses (checklist 2d), marked `(implied)`.
- Ambiguous ticket? Do not choose; note what the PR does and ask. Only a finding when it
  contradicts an explicit decision.
- One line "before → after": behaviour on the base vs with this PR, and who notices.

**2b. Trace each scenario with its concrete values:** entry (route, controller, command, job,
listener) → validation → authorization → logic → what is saved → what the user or other system
sees (screen, export, PDF, mail, API, Exact/VIES/payment). Calculate the actual result. "There is
code for it" is not "it gives the right result". Right on screen but not in the export is partial.

**2c. Status per scenario:** ✅ traced and right · ⚠️ right in some paths or outputs only ·
❌ wrong or missing · ❓ depends on data or config you cannot see (say what confirms it).
Name the test that would fail if the rule broke. A test that only checks "no exception" or a 200
is no test.

**2d. Checklist**, only what applies to this change:
- Money: rounding per line vs total, VAT rates and exemptions, discounts, credit notes, decimal vs float.
- Dates: Europe/Brussels, DST, end of day/month/year, overlapping periods, invalid dates.
- Statuses: allowed transitions, records already in an old or final status, the same action twice (double click, queue retry).
- Access: each role; one customer seeing or changing another's data (a new query or route without the existing scope).
- Existing data: NULL or old values in new fields, missing migration or backfill.
- External systems (Exact, payment, VIES): slow, down or error; local state still right; retry safe.
- Side effects: mails, exports, reports, invoices and totals that use the changed rule.

**2e. Callers.** Per changed rule (method, accessor, scope, condition, validation, route): one
`git grep -n '<name>' -- app resources routes tests`, then read the callers that could break
from `ref=<baseRefName>`. Does each still get what the business expects there? Local checkout
clearly behind? Say so.

**2f. Scope and conventions** (no extra calls):
- **Straight to the point.** 🟡 "scope" only for:
  - tooling or local config: `.vscode/`, `.junie/`, `.idea/`, `mcp.json`, `.env*`, editor settings;
  - behaviour or data that changes but is not in the ticket;
  - refactors big enough to hide the fix: whole files reformatted or rewritten, or changes in
    files the ticket does not need.
  One comment per kind, listing the files and why. Removes or breaks a teammate's setup? Say so
  plainly. Worth keeping? Add a follow-up ticket under "Follow-up": `[Component] <title> — <type>`.
- Small cleanups without behaviour change in files the PR touches anyway (e.g. `app()` →
  `resolve()`, `::dispatch()` → `event()`): fine. No comment, not even a nit.
- A ticket item left out without a note in the PR or a Jira comment: ❌.
- A data-repair done-when without a migration or command in the diff: ❌.
- No Jira key in the PR title, or `CHANGELOG_ENTRY.md` missing or `none` for a user-visible change: 🔵.
- Diff far beyond the estimate (30m ticket, 400 lines): one line in the summary, not a finding.

## Step 3: Code check
**Every author:**
- What breaks or leaks: bugs not found in Step 2, security (input, auth, injection, secrets),
  performance users notice (N+1 on a list, unbounded query).
- **Risk: works today, but will cause issues.** The business is right, but a realistic next
  change, retry or situation makes it break or behave differently. Always 🟡, also when nothing
  goes wrong yet. The comment says what goes wrong and when. Typical:
  - one business rule, value or user-facing text in two or more places, also across repos
    (core and portal), even if identical today;
  - a fix in one path while another path that does the same thing is not fixed;
  - writes that must happen together without a transaction; an action that runs twice on a
    retry or double click;
  - a new query or route without the scope or policy the others use.
- Outside strict mode: no remarks on style, naming, comments or structure.

**Strict mode, in addition:** read the diff against `${CLAUDE_PLUGIN_ROOT}/shared/code.md`. A
clearly simpler, clearer or more maintainable version without risk is a 🔵
with the better code and one sentence why. Friendly and factual. Max 4 of these. Up to 5 extra
tool calls.

**Blocking vs optional:** risk, scope and tests block (🟡). Only cosmetic remarks are optional
(🔵): naming, comments, simpler syntax, structure that carries no risk.

Never report what a linter catches, personal taste, or points already raised and resolved.
Raised before and still open: report again, referring to the earlier comment.

## Severity and verdict
- 🔴 Wrong amount, VAT or invoice/order data; data loss; a customer sees or changes another's
  data; a role can do what it should not; existing records break; the core done-when is ❌.
- 🟡 Another done-when ❌ or ⚠️; a done-when ✅ without a test that catches a regression; a
  realistic implied case with a wrong result; contradicts a Jira decision; user-visible scope
  creep; a changelog line that promises what the PR does not deliver (confirmed).
- 🟡 Scope, per 2f.
- 🟡 Tests: a scenario without a test, an existing test changed so it no longer checks the same
  thing, a removed or weakened assertion. Tests are never a nit. A layer without any test setup
  (e.g. portal JS) is not a finding; a risky untested flow there gets one sentence in the
  general comment asking for a manual check.
- 🟡 Risk: works today but will cause issues (Step 3), e.g. one business rule in two places.
- 🔵 Optional only: cosmetic remarks, a rare implied case. The PR can merge without it.
- A ⚠️ or ❌ scenario is never 🔵. Anything that must happen before merge is never 🔵.
- Not a finding: a gap in the ticket ("Ticket" line), an ambiguity or ❓ (question).

Any 🔴 or 🟡: "🔴 Changes requested → REQUEST CHANGES". Only 🔵: "🟡 Approved with comments →
APPROVE". Nothing: "✅ Approved → APPROVE". A 🟡 is never "fine as a follow-up"; if it can wait,
it is 🔵. "Partly" or "No" never goes with APPROVE. "Yes" with REQUEST CHANGES only for a data,
security, risk, scope, test or changelog finding. With REQUEST CHANGES, "First" says why in one
line, e.g. "Too much changed: a teammate's MCP config and a test refactor are not part of GDW-1849."

## Report
The whole review is in English: it goes to the developers. Leave out empty sections.

**1. Comments page.** Write the comments with the Write tool to `/tmp/robbe-review-skill/<pr number>.md`
(no PR: the branch name; letters, digits, `.`, `_`, `-` only). Exists already? Read it first,
then overwrite. Exactly this format:

````
==== 1 · 🟡 · app/Services/DocumentStateService.php:188 ====
<comment>

```php
<the fix>
```

==== 2 · 🔵 · path/to/File.php:42 ====
<comment>

==== General comment ====
<general comment>
````

Then run exactly:
`python3 "${CLAUDE_SKILL_DIR}/scripts/comments.py" /tmp/robbe-review-skill/<pr number>.md "<PR url>"`
It opens a page in the browser with a Copy button per comment and a link to the line in the PR.

**A comment** is for the developer. One or two sentences: what goes wrong (the concrete case),
then what to change. Then the fix as code, ready to paste:
- Every 🔴/🟡 whose fix is code includes it. ```` ```suggestion ```` when it replaces exactly the
  commented line(s); otherwise ```` ```php ```` (or the file's language) with the complete
  changed method(s), and one line saying where each call goes.
- The fix keeps all current behaviour unless the comment says what it changes (e.g. a log line
  that one path writes stays), and follows code.md: no comments in the code.
- Never in a comment: scenario or done-when numbers, what the review did or could not check,
  how you traced it, budget, "Nit:", "Optional:", "Before merge:" (the header has the severity).
- Only about the commented line. Not about a line (a manual check, the PR as a whole)? One
  sentence in the general comment.
- "Keep both in sync" or "add a comment that they must match" is not a fix: one source is.
- Test: would the developer understand it and fix it without reading this review?

Good: `This text duplicates WebshopAvailabilityService::NO_PARCEL_DELIVERY_MESSAGE in core, so the next wording change shows guests a different message. Use the text from core here instead of a second copy.`

**The general comment:** max 2 sentences: what must change before merge, or that it is good to
go. Optional (🔵) points are not repeated there.

**2. Terminal summary** (max ~30 lines), then nothing:

```
## Review: <PR title> (<KEY>)

Verdict: <verdict>
Does it do what the ticket asks? <Yes | Partly | No> — <one sentence>
Ticket: <gap or conflict in the ticket itself — proposal>
Before → after: <one sentence, who notices>
First: <why this verdict, one sentence | No blockers>

Scenarios
S1 ✅ <short> — File.php:12 — test: FooTest::test_x
S2 ❌ <short> (implied) — File.php:40 — test: none

Previous reviews
<who>: <point> — fixed | still open

Comments (opened in the browser: /tmp/robbe-review-skill/<pr>.html)
1 🟡 DocumentStateService.php:188 (S2) — <short>
2 🔵 File.php:42 — <short>

Questions
- <question>? Proposal: <answer> — <why>.

Follow-up
- [Component] <title> — <type>
```

- "Ticket" only when the ticket itself has a gap.
- Every ⚠️/❌ scenario, and every one missing a needed test, has a comment. The summary line
  names the S#; the comment itself never does. Max 10 comments, business first.
- `File:line` is the line in the new file; confirm it with `nl -ba` via gh api. Cannot confirm?
  `~123` and quote the code in the comment.
- Something that could not be checked and affects the verdict (no Jira, budget reached, files
  skipped): one line under "First" saying what is unchecked. Never mention strict mode.

## Budget
- Max ~25 tool calls (+5 in strict mode), most on Step 2. At the limit: stop and report;
  untraced scenarios get ❓, never ✅.
- Each changed file read once; max 5 other files (callers, tests, confirming a finding).
- No tests, builds, linters, subagents, `git fetch`, checkout, or history beyond the PR.
- Diff over ~600 lines or 20 files: ask which part has priority and wait. Cannot ask? Business
  logic first (services, models, controllers, validation, migrations) and list what was skipped.
- Unsure about a finding? A question, not more digging.
