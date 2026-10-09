#Requires -Version 5.1
# Delete ~/.claude (the Claude Code user scope). Keeps the claude binary.
# The user runs this from a terminal after quitting Claude Code. No prompts.
$ErrorActionPreference = 'Stop'

# Windows locks files a running Claude Code holds open, so a partial delete is
# the likely result if one is still running.
if (Get-Process -Name claude -ErrorAction SilentlyContinue) {
    'Claude Code is still running. Close every Claude Code window, then run this again.'
    exit 1
}

$target = Join-Path $env:USERPROFILE '.claude'
if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
    "removed $target"
} else {
    "not found: $target"
}
