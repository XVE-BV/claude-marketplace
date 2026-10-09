#!/usr/bin/env bash
# Delete ~/.claude (the Claude Code user scope). Keeps the claude binary.
# The user runs this from a terminal after quitting Claude Code. No prompts.
set -eu

target="$HOME/.claude"
if [ -e "$target" ]; then
    rm -rf "$target"
    echo "removed $target"
else
    echo "not found: $target"
fi
