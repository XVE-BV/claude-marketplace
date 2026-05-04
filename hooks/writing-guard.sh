#!/bin/bash
# writing-guard.sh — Stop hook that flags AI writing tells in Claude's last response.
# Posts a follow-up turn asking Claude to revise. Does NOT rewrite the original message
# the user already sees. The CLAUDE.md ## Writing Guidelines layer is the primary
# prevention; this hook is a safety net for what slips through.

set -euo pipefail

INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

[ -z "$TRANSCRIPT_PATH" ] && exit 0
[ ! -f "$TRANSCRIPT_PATH" ] && exit 0

# Loop guard: only flag once per session per stop boundary.
# After flagging, Claude's revised response will be a new stop event with a new
# message count, so the marker comparison resets naturally on real progress.
LINE_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
MARKER="/tmp/writing-guard-${SESSION_ID}"
[ -f "$MARKER" ] && [ "$(cat "$MARKER" 2>/dev/null)" = "$LINE_COUNT" ] && exit 0

# Pull last assistant message text (skip thinking + tool_use blocks).
LAST_TEXT=$(jq -rs '
  [.[] | select(.type == "assistant")] | last |
  .message.content[]? | select(.type == "text") | .text
' "$TRANSCRIPT_PATH" 2>/dev/null || true)

[ -z "$LAST_TEXT" ] && exit 0

# Strip code blocks and inline code so quoted code doesn't trip the regex.
STRIPPED=$(echo "$LAST_TEXT" | awk '
  /^```/ { in_code = !in_code; next }
  !in_code { print }
' | sed 's/`[^`]*`//g')

WORD_COUNT=$(echo "$STRIPPED" | wc -w | tr -d ' ')
[ "$WORD_COUNT" -lt 150 ] && exit 0

VIOLATIONS=""

# Tier 1 banned vocabulary (word-boundaried, case-insensitive).
BANNED='delve|tapestry|pivotal|testament|meticulous|nuanced|multifaceted|embark|spearhead|bolster|garner|interplay|nestled|bustling|vibrant|comprehensive|invaluable|reimagine|empower|groundbreaking|transformative|paramount|myriad|cornerstone|catalyst|seamless|seamlessly'
FOUND=$(echo "$STRIPPED" | grep -oiE "\b(${BANNED})\b" 2>/dev/null | sort -fu | tr '\n' ',' | sed 's/,$//' || true)
[ -n "$FOUND" ] && VIOLATIONS="${VIOLATIONS}- Banned AI vocabulary: ${FOUND}\n"

# Em dash overuse: more than 1 per 500 words.
EM_COUNT=$(echo "$STRIPPED" | grep -o '—' | wc -l | tr -d ' ')
ALLOWED=$(( WORD_COUNT / 500 + 1 ))
if [ "$EM_COUNT" -gt "$ALLOWED" ]; then
  VIOLATIONS="${VIOLATIONS}- Em dash overuse: ${EM_COUNT} dashes in ${WORD_COUNT} words (max 1 per 500)\n"
fi

# AI phrase tells.
PHRASES='great question!|certainly!|absolutely!|i hope this helps|let'\''s dive in|without further ado|it'\''s worth noting that|in conclusion,|in summary,'
FOUND_PH=$(echo "$STRIPPED" | grep -oiE "(${PHRASES})" 2>/dev/null | sort -fu | tr '\n' ' / ' | sed 's, / $,,' || true)
[ -n "$FOUND_PH" ] && VIOLATIONS="${VIOLATIONS}- AI phrases: ${FOUND_PH}\n"

[ -z "$VIOLATIONS" ] && exit 0

# Mark this stop as flagged so we don't double-fire.
echo "$LINE_COUNT" > "$MARKER"

REASON=$(printf "Your last response violated ## Writing Guidelines (see ~/.claude/CLAUDE.md):\n\n%b\nRevise the response above to remove these tells. Reply with the corrected version. Do not acknowledge or apologize — just produce the cleaned text." "$VIOLATIONS")

jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
