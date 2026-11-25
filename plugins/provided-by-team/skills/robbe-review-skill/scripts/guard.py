"""PreToolUse guard for robbe-review-skill.

- Auto-approves the two read-only `gh api` calls the skill uses, so a review runs without
  permission prompts.
- Denies every `gh api` call that can write (-X, --method, -f, -F, --field, --raw-field,
  --input). Skill hooks stay registered for the rest of the session, so to post a review
  afterwards use `gh pr review` or `gh pr comment` yourself.
- Auto-approves writing the comments file /tmp/robbe-review-skill/<name>.md and running the comments.py
  that sits next to this file on it.
- Everything else goes through the normal permission rules.
"""

import json
import os
import re
import sys

GH_API = re.compile(r"(?:^|[\s;&|(])gh\s+api\b")

WRITE_FLAG = re.compile(
    r"(?:^|\s)(?:-[XfF]\S*|--(?:method|field|raw-field|input)(?:=\S*)?)(?=\s|$)"
)

READS = [
    re.compile(
        r'gh api "repos/\{owner\}/\{repo\}/contents/[A-Za-z0-9._/@+-]+\?ref=[A-Za-z0-9._/-]+"'
        r' -H "Accept: application/vnd\.github\.raw"'
        r"(?: \| nl -ba)?(?: \| sed -n '\d+,\d+p')?"
    ),
    re.compile(
        r'gh api --paginate "?repos/\{owner\}/\{repo\}/pulls/\d+/comments"?'
        r"(?: --jq '[^']*')?"
    ),
]


def decide(decision, reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": "robbe-review-skill guard: " + reason,
        }
    }))
    sys.exit(0)


COMMENTS_FILE = re.compile(r"(?:/private)?/tmp/robbe-review-skill/[A-Za-z0-9._-]+\.md")

_SCRIPT_DIRS = {os.path.dirname(os.path.abspath(__file__)), os.path.dirname(os.path.realpath(__file__))}
_SCRIPT = "|".join(re.escape(os.path.join(d, "comments.py")) for d in sorted(_SCRIPT_DIRS))

COMMENTS_PAGE = re.compile(
    rf'python3 (?:"(?:{_SCRIPT})"|(?:{_SCRIPT}))'
    r" (?:/private)?/tmp/robbe-review-skill/[A-Za-z0-9._-]+\.md"
    r'(?: "https://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/pull/\d+")?'
)


def main():
    event = json.load(sys.stdin)
    tool = event.get("tool_name")
    if tool == "Write":
        path = (event.get("tool_input") or {}).get("file_path", "")
        if COMMENTS_FILE.fullmatch(path) and ".." not in path:
            decide("allow", "review comments file.")
        sys.exit(0)
    if tool != "Bash":
        sys.exit(0)

    command = (event.get("tool_input") or {}).get("command", "").strip()
    if COMMENTS_PAGE.fullmatch(command):
        decide("allow", "opens the review comments page.")
    if not GH_API.search(command):
        sys.exit(0)

    if WRITE_FLAG.search(command):
        decide("deny", "gh api may only read (no -X, -f, -F, --field or --input).")

    if any(p.fullmatch(command) for p in READS):
        decide("allow", "read-only gh api call.")

    sys.exit(0)


main()
