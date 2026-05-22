<#
.SYNOPSIS
    Self-improving autonomous development loop for vecini.online.

.DESCRIPTION
    Drives the project toward a polished, final, premium deliverable with no
    human input. Each pass is one of two phases, chosen automatically:

      BUILD     - while BACKLOG.md still has open tasks (`### ⬜`), run
                  "make progress" to complete exactly one task (commit + push).

      REPLENISH - when the backlog is exhausted (no open tasks) OR a build pass
                  stalls, run the audit/replenish prompt instead. That pass does
                  NOT build a feature; it measures how much of the original
                  product vision (CLAUDE.md) is delivered, audits the app for
                  what could be safer / more stable / more polished, writes the
                  next wave of priority-ranked T## tasks into BACKLOG.md, and
                  makes RESUME.md + the docs bigger, better, and more polished.

    So the loop never simply "ends" while the app can still be improved: an
    empty queue refills itself and work continues. It stops only when:
      * the stall tripwire fires (StuckLimit consecutive passes with no build
        commit, even after a replenish attempt) - genuinely nothing actionable,
      * a task/time budget is reached (MaxTasks / MaxHours), or
      * the post-commit pipeline goes red (halt so a break is never built upon),
      * you press Ctrl+C.

    Every pass that makes progress ends in a commit + push, so "a new commit
    appeared" remains the signal that real work happened.

.PARAMETER MaxTasks
    Safety cap on total passes (build + replenish). 0 = unbounded (default),
    matching the "run until everything is done, then keep improving" intent.

.PARAMETER MaxHours
    Optional wall-clock budget in hours. 0 = unbounded (default). Set e.g. 8 for
    an overnight run that naturally stops by morning.

.PARAMETER StuckLimit
    Consecutive passes with no BUILD commit before the loop concludes there is
    nothing actionable left and stops. Default 3. Replenish commits do not reset
    this; only a completed build task does, so a doc-churn-only loop still ends.

.PARAMETER Prompt
    The build trigger sent to Claude. Default "make progress" (see BACKLOG.md).

.PARAMETER ReplenishPrompt
    The audit/replenish trigger used when the backlog is empty or a build stalls.
    A strong default is provided; override only to experiment.

.EXAMPLE
    .\scripts\run-overnight.ps1
    .\scripts\run-overnight.ps1 -MaxHours 8
    .\scripts\run-overnight.ps1 -MaxTasks 5

.NOTES
    Uses --dangerously-skip-permissions so Claude can edit files, run the
    pipeline, commit, and push without prompting. That is the whole point of an
    unattended run; only launch this when you intend fully autonomous progress.
#>

[CmdletBinding()]
param(
    [int]$MaxTasks = 0,
    [double]$MaxHours = 0,
    [int]$StuckLimit = 3,
    [string]$Prompt = "make progress",
    [string]$ReplenishPrompt = @"
The BACKLOG.md task queue is empty (or the last build pass stalled). Do NOT build a
feature this pass. Instead, run a replenish/audit pass that grows the next wave of
work and raises the quality bar, following the `make progress` protocol's "feed the
loop" step as the whole job:

1. Re-read CLAUDE.md (the original product vision), BACKLOG.md, RESUME.md,
   FEATURES.md, and DECISIONS.md, then sweep the codebase.
2. Estimate, as a percentage, how much of the ORIGINAL product vision in CLAUDE.md
   is actually delivered end-to-end (security, GDPR/privacy, stability, the full
   feature set, Telegram bot, premium feel, SaaS readiness). Record this percentage
   with a short justification in RESUME.md `## 0. Current status`, dated.
3. Audit for everything still short of a polished, final, premium deliverable:
   security and tenant-isolation gaps, privacy/GDPR obligations, fragile or
   duplicated code, missing or weak tests, accessibility and UX rough edges,
   performance, documentation gaps, and SaaS/operational readiness. Be demanding.
4. Turn every finding and every worthwhile improvement into a NEW task inserted at
   its correct priority position in BACKLOG.md `## Task queue` (P0 -> P1 -> P2 -> P3),
   each with the next free T## id, a one-line goal, and a [P#] tag. Keep the queue
   sorted with the highest priority on top. Add real, specific work - not filler.
5. Improve the way of working itself where you can: make BACKLOG.md, RESUME.md, and
   the project docs clearer, better organised, and more polished than you found them.
6. Keep lint/typecheck/test/build green if you touch any code. Then make ONE
   conventional commit (docs(...) or chore(...)) ending with the Co-Authored-By
   trailer and `git push origin main`. Do not start a build task in this pass.
"@
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
$Backlog = Join-Path $RepoRoot "BACKLOG.md"
if (-not (Test-Path $Backlog)) {
    Write-Error "BACKLOG.md not found at: $Backlog"
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

# How many open tasks remain in the queue. An open task is a "### ⬜" heading.
function Get-OpenTaskCount {
    try {
        return @(Select-String -Path $Backlog -Pattern '^### ⬜' -Encoding utf8).Count
    } catch {
        # If the count can't be read, assume work remains so we never wrongly
        # short-circuit into replenish-forever.
        return 1
    }
}

# Independent post-commit tripwire: re-run the full pipeline after each commit so a
# broken commit halts the loop instead of stacking more work on top of it. The
# protocol already requires Claude to verify before committing; this is the
# belt-and-suspenders check that makes the guarantee real for unattended runs.
function Test-Pipeline {
    foreach ($step in @("lint", "typecheck", "test", "build")) {
        Write-Both "  gate: npm run $step"
        & npm run $step 2>&1 | Tee-Object -FilePath $Log -Append
        if ($LASTEXITCODE -ne 0) {
            Write-Both "  gate FAILED at: npm run $step (exit $LASTEXITCODE)"
            return $false
        }
    }
    return $true
}

# Run one Claude pass for the given phase; return $true if it produced a commit.
function Invoke-Pass([string]$phase, [string]$passPrompt) {
    $before = (git rev-parse HEAD).Trim()
    & claude -p $passPrompt --dangerously-skip-permissions --verbose | Tee-Object -FilePath $Log -Append
    $after = (git rev-parse HEAD).Trim()
    if ($before -eq $after) { return $false }
    $subject = (git log -1 --pretty=%s).Trim()
    Write-Both ""
    Write-Both "[$phase] committed: $($after.Substring(0,7))  $subject"
    return $true
}

Write-Both "=== Self-improving overnight run started $stamp ==="
Write-Both "Repo:       $RepoRoot"
Write-Both ("MaxTasks:   {0}" -f ($(if ($MaxTasks -le 0) { "unbounded" } else { $MaxTasks })))
Write-Both ("MaxHours:   {0}" -f ($(if ($MaxHours -le 0) { "unbounded" } else { $MaxHours })))
Write-Both "StuckLimit: $StuckLimit consecutive non-build passes"
Write-Both "Build:      $Prompt"
Write-Both ""

$startTime       = Get-Date
$buildsCompleted = 0   # build-phase tasks finished
$replenishRuns   = 0   # audit/replenish passes that committed
$noBuildStreak   = 0   # consecutive passes without a build commit (stall detector)
$pass            = 0

while ($true) {
    if ($MaxTasks -gt 0 -and $pass -ge $MaxTasks) {
        Write-Both ""
        Write-Both "Reached MaxTasks=$MaxTasks. Stopping."
        break
    }
    if ($MaxHours -gt 0) {
        $elapsedHours = ((Get-Date) - $startTime).TotalHours
        if ($elapsedHours -ge $MaxHours) {
            Write-Both ""
            Write-Both ("Reached MaxHours={0} (elapsed {1:N2}h). Stopping." -f $MaxHours, $elapsedHours)
            break
        }
    }

    $pass++
    $head    = (git rev-parse HEAD).Trim()
    $open    = Get-OpenTaskCount
    $isBuild = ($open -gt 0)
    $phase   = if ($isBuild) { "BUILD" } else { "REPLENISH" }

    Write-Both "--- Pass $pass  [$phase]  open tasks: $open  (HEAD $($head.Substring(0,7))) @ $(Get-Date -Format HH:mm:ss) ---"
    if (-not $isBuild) {
        Write-Both "Backlog exhausted => measuring vision coverage and generating the next wave of work."
    }

    $passPrompt = if ($isBuild) { $Prompt } else { $ReplenishPrompt }
    $committed  = Invoke-Pass $phase $passPrompt

    # If a build pass stalls (no commit), try one replenish to re-plan / unblock
    # before counting it as a stall. This is how "run until done" recovers when a
    # single task is blocked: it re-plans rather than giving up.
    if ($isBuild -and -not $committed) {
        Write-Both "Build pass produced no commit. Running a replenish pass to re-plan / unblock."
        $committed = Invoke-Pass "REPLENISH" $ReplenishPrompt
        $phase = "REPLENISH"
        $isBuild = $false
    }

    if (-not $committed) {
        $noBuildStreak++
        Write-Both ""
        Write-Both "No progress this pass (no-build streak $noBuildStreak/$StuckLimit)."
        if ($noBuildStreak -ge $StuckLimit) {
            Write-Both "Stall tripwire reached: nothing actionable left, or the loop is stuck. Stopping."
            break
        }
        continue
    }

    # A commit was made. Re-verify the committed state independently.
    Write-Both "Re-verifying committed state..."
    if (-not (Test-Pipeline)) {
        $halt = (git rev-parse HEAD).Trim()
        Write-Both ""
        Write-Both "Pipeline RED on commit $($halt.Substring(0,7)). Halting so the failure is not compounded. Inspect the log, fix, then re-run."
        break
    }
    Write-Both "Pipeline green."
    Write-Both ""

    if ($isBuild) {
        $buildsCompleted++
        $noBuildStreak = 0   # real task progress resets the stall detector
    } else {
        $replenishRuns++
        $noBuildStreak++     # replenish is progress, but not a build; keep counting
        Write-Both "Replenish committed (no-build streak $noBuildStreak/$StuckLimit). New work should now be queued."
        if ($noBuildStreak -ge $StuckLimit) {
            Write-Both "Stall tripwire reached after replenish-only passes. Stopping."
            break
        }
    }
}

$elapsed = ((Get-Date) - $startTime).TotalHours
Write-Both "=== Run finished: $buildsCompleted build task(s), $replenishRuns replenish pass(es) over $pass pass(es) in $("{0:N2}" -f $elapsed)h. Log: $Log ==="
