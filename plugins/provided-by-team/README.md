# provided-by-team

Skills written by XVE team members, shipped through this marketplace so everyone runs the same version.

```
claude plugin install provided-by-team@xve-claude-marketplace
```

## Layout

```
provided-by-team/
├── shared/                    rules every skill in this plugin can read
│   ├── rubrics.md             team rubric: Jira site, what makes a ticket complete
│   └── code.md                team code rules, used by strict reviews
└── skills/
    ├── daily-standup-skill/
    │   └── SKILL.md
    └── robbe-review-skill/
        ├── SKILL.md
        └── scripts/
            ├── guard.py       permission hook
            └── comments.py    builds the comments page
```

Skills reach the shared files through `${CLAUDE_PLUGIN_ROOT}/shared/`, so a new skill here can reuse them.

## robbe-review-skill

Written by Robbe. Run `/provided-by-team:robbe-review-skill <pr-number>`, or add `strict` to also review how the code is written. Without a PR number it reviews the current branch against its base.

It reviews a PR against its Jira ticket: does the app now do what the ticket asks, in every real case? It works out the scenarios from the ticket's DONE WHEN lines, traces each one through the code, then checks for bugs, security problems and risks. It reads the PR, the code and the ticket and changes nothing in the repo, on GitHub or in Jira. It writes the comments to `/tmp/robbe-review-skill/<pr>.md` and opens a page with a Copy button per comment, so you decide what to post.

Once the skill has run, its hook stays on until the session ends. It lets two read-only `gh api` calls, the comments file and the comments page through without a prompt, and it blocks any `gh api` call that writes. To post a review afterwards, use `gh pr review` or `gh pr comment`.

Needs macOS or Linux, `python3`, `gh` signed in to GitHub, and the Atlassian MCP server for Jira. Without Jira it reviews against the PR description and says so.

Optional per-user and per-repo context:

- `~/.claude/xve-personal.md`: authors listed there always get a strict review.
- `.claude/client.md` in the reviewed repo: client-specific rules, read at the start.

## daily-standup-skill

Run `/provided-by-team:daily-standup-skill`, or ask Claude for your standup. It opens Kimai (`clockit.xve-web.eu`) in a new Chrome tab, goes to Calendar, switches to the day view and steps back to yesterday, or to Friday on a Monday. It turns that day's entries into the team's standup format: one line per Jira key with a short Dutch summary, `Review` in front when an entry says review, then empty `Today`, `Blockers` and `PR` headings for you to fill in. It prints the message in a code block to paste into the Teams channel. It changes nothing in Kimai and posts nothing.

Needs the Claude in Chrome extension, with Chrome signed in to Kimai. Kimai's calendar doesn't show an entry's activity, so a review only gets `Review` when its description says so.

## Rubrics status

`shared/rubrics.md` and `shared/code.md` are stand-ins. Robbe's originals were not part of the handover, so they were written from what the skill asks of them: the Jira site, the "The request" check of the ticket itself, and the code rules for strict mode. Robbe will provide the real files. To swap them in, replace both files and bump the patch version in `.claude-plugin/plugin.json` and in this plugin's entry in the marketplace's `.claude-plugin/marketplace.json`.
