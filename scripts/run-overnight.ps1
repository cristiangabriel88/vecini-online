<#
.SYNOPSIS
    Autonomous continuous-development loop for vecini.online.

.DESCRIPTION
    Repeatedly runs Claude Code headless ("make progress"), each pass completing
    exactly one task from BACKLOG.md and pushing a commit. The loop stops when a
    pass produces no new commit (nothing left to do, or it got stuck), when the
    max-task budget is reached, or when you press Ctrl+C.

    Every task ends in a commit + push, so "a new commit appeared" is the signal
    that real progress was made. No human input is required while it runs.

.PARAMETER MaxTasks
    Safety cap on how many tasks to attempt in one run. Default 25.

.PARAMETER Prompt
    The trigger sent to Claude each pass. Default "make progress" (see BACKLOG.md).

.EXAMPLE
    .\scripts\run-overnight.ps1
    .\scripts\run-overnight.ps1 -MaxTasks 5

.NOTES
    Uses --dangerously-skip-permissions so Claude can edit files, run the
    pipeline, commit, and push without prompting. That is the whole point of an
    unattended run; only launch this when you intend fully autonomous progress.
#>

[CmdletBinding()]
param(
    [int]$MaxTasks = 25,
    [string]$Prompt = "make progress"
)

$ErrorActionPreference = "Stop"

# Repo root = parent of this script's folder.
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

# Preconditions.
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Error "Not a git repository: $RepoRoot"
    exit 1
}
$claude = (Get-Command claude -ErrorAction SilentlyContinue)
if ($null -eq $claude) {
    Write-Error "The 'claude' CLI was not found on PATH."
    exit 1
}

# Log file.
$LogDir = Join-Path $RepoRoot ".overnight-logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$Log = Join-Path $LogDir "overnight-$stamp.log"

function Write-Both([string]$msg) {
    Write-Host $msg
    Add-Content -Path $Log -Value $msg -Encoding utf8
}

Write-Both "=== Overnight run started $stamp ==="
Write-Both "Repo:     $RepoRoot"
Write-Both "MaxTasks: $MaxTasks"
Write-Both "Prompt:   $Prompt"
Write-Both ""

$completed = 0

for ($i = 1; $i -le $MaxTasks; $i++) {
    $before = (git rev-parse HEAD).Trim()
    Write-Both "--- Pass $i/$MaxTasks  (HEAD $($before.Substring(0,7))) @ $(Get-Date -Format HH:mm:ss) ---"

    # Run one task. Stream Claude's output to console and log.
    & claude -p $Prompt --dangerously-skip-permissions --verbose | Tee-Object -FilePath $Log -Append

    $after = (git rev-parse HEAD).Trim()

    if ($before -eq $after) {
        Write-Both ""
        Write-Both "No new commit this pass => nothing left to do or stuck. Stopping."
        break
    }

    $completed++
    $subject = (git log -1 --pretty=%s).Trim()
    Write-Both ""
    Write-Both "Pass $i done. New commit: $($after.Substring(0,7))  $subject"
    Write-Both ""
}

Write-Both "=== Overnight run finished: $completed task(s) completed. Log: $Log ==="
