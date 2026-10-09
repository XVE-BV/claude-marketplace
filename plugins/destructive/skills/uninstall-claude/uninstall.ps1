#Requires -Version 5.1
# Uninstall Claude Code: the binary (npm package, or the file `claude` resolves
# to), ~/.local/share/claude (native install versions), ~/.claude,
# ~/.claude.json, and lines that reference Claude in PowerShell profiles and in
# the Git Bash / zsh rc files under the user profile.
# The user runs this from a terminal after quitting Claude Code. No prompts.
$ErrorActionPreference = 'Stop'

# Windows cannot delete a running claude.exe and locks files it holds open.
if (Get-Process -Name claude -ErrorAction SilentlyContinue) {
    'Claude Code is still running. Close every Claude Code window, then run this again.'
    exit 1
}

$npmInstalled = $false
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $ErrorActionPreference = 'Continue'
    $npmInstalled = [bool]((npm list -g @anthropic-ai/claude-code 2>$null) -match 'claude-code')
    $ErrorActionPreference = 'Stop'
}
$bin = (Get-Command claude -ErrorAction SilentlyContinue).Source
if ($npmInstalled) {
    npm uninstall -g @anthropic-ai/claude-code
    'removed npm package @anthropic-ai/claude-code'
} elseif ($bin) {
    Remove-Item -LiteralPath $bin -Force
    "removed $bin"
} else {
    'claude binary not found in PATH'
}

foreach ($name in '.local\share\claude', '.claude', '.claude.json') {
    $target = Join-Path $env:USERPROFILE $name
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
        "removed $target"
    }
}

# Strip the fenced core:env block (pinned by /core:setup) and every line that
# references Claude. Line endings are kept, so bash rc files stay LF.
$docs = [Environment]::GetFolderPath('MyDocuments')
$files = @(
    "$docs\PowerShell\Microsoft.PowerShell_profile.ps1",
    "$docs\WindowsPowerShell\Microsoft.PowerShell_profile.ps1",
    "$env:USERPROFILE\.zshrc",
    "$env:USERPROFILE\.zprofile",
    "$env:USERPROFILE\.bashrc",
    "$env:USERPROFILE\.bash_profile",
    "$env:USERPROFILE\.profile"
)
foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $text = [IO.File]::ReadAllText($f)
    $nl = if ($text -match "`r`n") { "`r`n" } else { "`n" }
    $lines = $text -split "`r?`n"
    $inBlock = $false
    $kept = foreach ($line in $lines) {
        if ($line -match '# >>> core:env >>>') { $inBlock = $true; continue }
        if ($line -match '# <<< core:env <<<') { $inBlock = $false; continue }
        if ($inBlock -or $line -match '\.claude[/\\"]|anthropic-ai[/-]claude') { continue }
        $line
    }
    $removed = $lines.Count - @($kept).Count
    if ($removed -gt 0) {
        [IO.File]::WriteAllText($f, (@($kept) -join $nl), (New-Object Text.UTF8Encoding $false))
        "removed $removed line(s) from $f"
    }
}
