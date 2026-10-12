# Opt-in user-scope Claude Code preferences. Args: workflows memory recap suggestions style
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Names)
$ErrorActionPreference = 'Stop'

$spec = @{
    workflows   = @('disableWorkflows', $true)
    memory      = @('autoMemoryEnabled', $false)
    recap       = @('awaySummaryEnabled', $false)
    suggestions = @('promptSuggestionEnabled', $false)
    style       = @('outputStyle', 'starter:ultra-concise')
}
if (-not $Names) { Write-Output 'usage: setup.ps1 workflows memory recap suggestions style'; exit 2 }
foreach ($n in $Names) {
    if (-not $spec.ContainsKey($n)) { Write-Output "unknown name: $n (workflows memory recap suggestions style)"; exit 2 }
}

$dir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
$file = Join-Path $dir 'settings.json'
$existed = Test-Path -LiteralPath $file
$cfg = [pscustomobject]@{}
if ($existed) {
    $text = [IO.File]::ReadAllText($file)
    if ($text.Trim()) {
        try { $cfg = $text | ConvertFrom-Json } catch { $cfg = $null }
        # Windows PowerShell 5.1 answers -is [pscustomobject] true for any value, so test the type name.
        if ($null -eq $cfg -or $cfg.GetType().Name -ne 'PSCustomObject') { Write-Output "invalid JSON object: $file"; exit 1 }
    }
} else {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Output "created $file"
}

$backed = $false
$changed = $false
foreach ($n in $Names) {
    $key, $val = $spec[$n]
    $shown = "$key=$($val | ConvertTo-Json -Compress)"
    $cur = $cfg.PSObject.Properties[$key]
    if ($cur -and $cur.Value -is $val.GetType() -and $cur.Value -ceq $val) { Write-Output "already $shown"; continue }
    if ($existed -and -not $backed) {
        $bak = "$file.bak.$(Get-Date -Format yyyyMMddHHmmss)"
        Copy-Item -LiteralPath $file -Destination $bak
        Write-Output "backup $bak"
        $backed = $true
    }
    $cfg | Add-Member -NotePropertyName $key -NotePropertyValue $val -Force
    $changed = $true
    Write-Output "written $shown"
}

if ($changed -or -not $existed) {
    $json = ($cfg | ConvertTo-Json -Depth 100) -replace "`r`n", "`n"
    [IO.File]::WriteAllText("$file.tmp", $json + "`n", (New-Object Text.UTF8Encoding $false))
    Move-Item -LiteralPath "$file.tmp" -Destination $file -Force
}
