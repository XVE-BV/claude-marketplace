#!/usr/bin/env bash
# Uninstall Claude Code: the binary (Homebrew cask, npm package, or the file
# `claude` resolves to), ~/.claude, and shell rc lines that reference Claude.
# The user runs this from a terminal after quitting Claude Code. No prompts.
set -eu

bin=$(command -v claude 2>/dev/null || true)
if command -v brew >/dev/null 2>&1 && brew list --cask claude-code >/dev/null 2>&1; then
    brew uninstall --cask claude-code
    echo "removed Homebrew cask claude-code"
elif command -v npm >/dev/null 2>&1 && npm list -g @anthropic-ai/claude-code 2>/dev/null | grep -q claude-code; then
    npm uninstall -g @anthropic-ai/claude-code
    echo "removed npm package @anthropic-ai/claude-code"
elif [ -n "$bin" ]; then
    rm -f "$bin"
    echo "removed $bin"
else
    echo "claude binary not found in PATH"
fi

if [ -e "$HOME/.claude" ]; then
    rm -rf "$HOME/.claude"
    echo "removed $HOME/.claude"
fi

# Strip the fenced core:env block (pinned by /core:setup) and every line that
# references Claude, in each rc file that exists.
for f in "$HOME/.zshrc" "$HOME/.zprofile" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile" "$HOME/.config/fish/config.fish"; do
    [ -f "$f" ] || continue
    tmp=$(mktemp)
    awk '/# >>> core:env >>>/{s=1} !s{print} /# <<< core:env <<</{s=0; next}' "$f" \
        | { grep -vE '\.claude[/"]|anthropic-ai[/-]claude' || true; } > "$tmp"
    removed=$(( $(wc -l < "$f") - $(wc -l < "$tmp") ))
    if [ "$removed" -gt 0 ]; then
        cat "$tmp" > "$f"
        echo "removed $removed line(s) from $f"
    fi
    rm -f "$tmp"
done
