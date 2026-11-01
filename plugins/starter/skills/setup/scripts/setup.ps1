# Opt-in user-scope Claude Code preferences.
# Args: workflows memory recap suggestions idlecompact style survey advisor chat coding writing
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Names)
$ErrorActionPreference = 'Stop'

$list = 'workflows memory recap suggestions idlecompact style survey advisor chat coding writing'
$spec = @{
    workflows   = @('disableWorkflows', $true)
    memory      = @('autoMemoryEnabled', $false)
    recap       = @('awaySummaryEnabled', $false)
    suggestions = @('promptSuggestionEnabled', $false)
    idlecompact = @('idleCompaction', $false)
    style       = @('outputStyle', 'starter:ultra-concise')
    survey      = @('env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY', '1')
}
$rules = @('advisor', 'chat', 'coding', 'writing')
if (-not $Names) { Write-Output "usage: setup.ps1 $list"; exit 2 }
foreach ($n in $Names) {
    if (-not $spec.ContainsKey($n) -and $rules -notcontains $n) { Write-Output "unknown name: $n ($list)"; exit 2 }
}
$hasSettings = [bool]($Names | Where-Object { $spec.ContainsKey($_) })
$hasRules = [bool]($Names | Where-Object { $rules -contains $_ })

$dir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
$file = Join-Path $dir 'settings.json'
$src = Join-Path $PSScriptRoot '..\assets\rules'
$utf8 = New-Object Text.UTF8Encoding $false

$existed = $false
$cfg = [pscustomobject]@{}
if ($hasSettings) {
    $existed = Test-Path -LiteralPath $file
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
}

# Install-Rule NAME: copy asset to $dir\rules as LF; overwrite when content differs.
function Install-Rule([string]$name) {
    $f = "starter-$name.md"
    $s = Join-Path $src $f
    $t = Join-Path $dir "rules\$f"
    if (-not (Test-Path -LiteralPath $s)) { Write-Output "missing asset: $s"; exit 1 }
    New-Item -ItemType Directory -Force -Path (Join-Path $dir 'rules') | Out-Null
    $text = [IO.File]::ReadAllText($s) -replace "`r`n", "`n"
    if (Test-Path -LiteralPath $t) {
        $cur = [IO.File]::ReadAllText($t) -replace "`r`n", "`n"
        if ($cur -ceq $text) { Write-Output "already rule $t"; return }
    }
    [IO.File]::WriteAllText($t, $text, $utf8)
    Write-Output "written rule $t"
}

$skipRules = $false
$claudeMd = Join-Path $dir 'CLAUDE.md'
if ($hasRules -and (Test-Path -LiteralPath $claudeMd) -and (Select-String -LiteralPath $claudeMd -SimpleMatch 'BEGIN core:guidelines' -Quiet)) {
    Write-Output 'skipped rules: CLAUDE.md already has core:guidelines'
    $skipRules = $true
}

$changed = $false
foreach ($n in $Names) {
    if ($rules -contains $n) {
        if (-not $skipRules) { Install-Rule $n }
        continue
    }
    $key, $val = $spec[$n]
    $shown = "$key=$($val | ConvertTo-Json -Compress)"
    # Dotted key names a nested key; missing or non-object parents become objects.
    $parts = $key -split '\.'
    $obj = $cfg
    for ($i = 0; $i -lt $parts.Count - 1; $i++) {
        $p = $obj.PSObject.Properties[$parts[$i]]
        if (-not $p -or $null -eq $p.Value -or $p.Value.GetType().Name -ne 'PSCustomObject') {
            $obj | Add-Member -NotePropertyName $parts[$i] -NotePropertyValue ([pscustomobject]@{}) -Force
        }
        $obj = $obj.PSObject.Properties[$parts[$i]].Value
    }
    $leaf = $parts[-1]
    $cur = $obj.PSObject.Properties[$leaf]
    if ($cur -and $cur.Value -is $val.GetType() -and $cur.Value -ceq $val) { Write-Output "already $shown"; continue }
    $obj | Add-Member -NotePropertyName $leaf -NotePropertyValue $val -Force
    $changed = $true
    Write-Output "written $shown"
}

if ($hasSettings -and ($changed -or -not $existed)) {
    $json = ($cfg | ConvertTo-Json -Depth 100) -replace "`r`n", "`n"
    [IO.File]::WriteAllText("$file.tmp", $json + "`n", $utf8)
    Move-Item -LiteralPath "$file.tmp" -Destination $file -Force
}
