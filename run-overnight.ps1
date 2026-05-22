# run-overnight.ps1 — drive the autonomous build to a fully legal, production-ready app.
# Run from the VSCode terminal (PowerShell) in the repo root.
#
# This loop runs the SAME one-task unit as typing `make progress`: each iteration
# is a fresh `claude` process that completes exactly ONE task from BACKLOG.md
# (the priority-sorted queue), verifies the full pipeline, updates the docs,
# feeds new tasks back into the queue, commits and pushes, then STOPS. A fresh
# process per task wipes context between sessions — that reset is the real token
# saver, more thorough than /compact.
#
# The 65 original features are built. The remaining work is everything needed to
# run for real Romanian residents: live auth + 2FA, GDPR consent and data rights,
# legal/privacy surface, RLS hardening, resilience, E2E/CI, billing. BACKLOG.md is
# the single source of truth for what is left and in what order.

$ErrorActionPreference = "Continue"

$LogDir = ".\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$MaxIterations = 60
$Iteration = 0
$DoneMarker = ".\APP_COMPLETE"          # written by Claude when the queue is fully cleared
$WaitOnLimitSeconds = 1800
$MaxNoProgress = 2                        # consecutive no-commit iterations => nothing left to do

# The per-iteration job: one task, by the book. Mirrors `## The make progress
# protocol` in BACKLOG.md and the non-negotiables in CLAUDE.md.
$Prompt = @'
make progress

Continue the autonomous vecini.online build. Complete exactly ONE task, then stop.

Follow `## The make progress protocol` in BACKLOG.md precisely:
1. Pick the highest-priority unchecked task whose prerequisites are met (the
   topmost unchecked item in the priority-sorted queue). If the verification
   pipeline is red, fixing it IS the task and outranks everything.
2. Re-read RESUME.md, DECISIONS.md, FEATURES.md and the relevant code first.
   Match existing conventions exactly.
3. Implement it fully end to end: migration + RLS (scoped by asociatie_id),
   logic module, Zustand demo store seeded from demoData.ts, page, registry
   toggle/route where it is a feature, Telegram command where relevant, RO/EN
   locales with real diacritics, unit tests, and one E2E happy-path. No TODOs,
   no placeholders, no commented-out code. Keep demo mode working offline.
4. Verify ALL of these are green before committing: `npm run lint`,
   `npm run typecheck`, `npm test`, `npm run build`. Never weaken or delete a
   test to make it pass — if a test reveals a real bug, fix the code.
5. Update the docs: mark the task done in BACKLOG.md, update FEATURES.md when it
   is a feature, and bump RESUME.md (counts, what was done, what remains, date).
6. Feed the loop: turn every problem found (bug, security gap, fragile code,
   missing test, a11y/UX/perf issue, tech debt) and every worthwhile improvement
   into a NEW task inserted at its priority position in BACKLOG.md (P0 critical/
   security/privacy/legal -> P1 stability/auth/features -> P2 polish/SaaS ->
   P3 later), with the next free T## id.
7. Commit (conventional message + Co-Authored-By trailer) and `git push origin main`.
8. STOP after this one task. Do not start another — the next iteration begins
   with a clean context window.

The goal the loop drives toward: a secure, stable, polished, fully GDPR-compliant
multi-tenant SaaS that is legal to run for Romanian asociatii de proprietari —
real auth + 2FA, data-subject rights, privacy/terms/cookie surface honoured by
the app, RLS-isolated tenants, accessible and resilient. When (and only when) the
ENTIRE BACKLOG.md queue is checked off AND lint/typecheck/test/build are all
green, create an empty file named APP_COMPLETE at the repo root, commit and push
it. Otherwise just finish the one task and stop.

Rules: do not ask questions — decide and record the choice in DECISIONS.md. Work
directly on main; never use the em dash character in code or docs.
'@

Write-Host "Starting overnight build at $(Get-Date)" -ForegroundColor Cyan

$NoProgress = 0

while ($Iteration -lt $MaxIterations) {
    $Iteration++
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $LogFile = "$LogDir\iter_${Iteration}_${Timestamp}.log"

    Write-Host ""
    Write-Host "=== Iteration $Iteration at $(Get-Date) ===" -ForegroundColor Green

    if (Test-Path $DoneMarker) {
        Write-Host "APP_COMPLETE found. The backlog is cleared. Done!" -ForegroundColor Green
        break
    }

    $HeadBefore = (git rev-parse HEAD 2>$null)

    try {
        $Prompt | claude --dangerously-skip-permissions --max-turns 100 2>&1 | Tee-Object -FilePath $LogFile
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        $_ | Out-File -Append $LogFile
    }

    if (Test-Path $LogFile) {
        $logContent = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "(?i)rate limit|usage limit|quota exceeded|too many requests|429") {
            Write-Host "Usage limit hit. Waiting $WaitOnLimitSeconds seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $WaitOnLimitSeconds
            $Iteration--
            continue
        }
        if ($logContent -match "(?i)authentication failed|unauthorized|not logged in") {
            Write-Host "Auth error. Run 'claude' to re-authenticate, then re-run this script." -ForegroundColor Red
            exit 1
        }
    }

    # A task completes with a commit + push. No new commit means the queue is
    # likely exhausted (or the session stalled) — stop after a couple of these.
    $HeadAfter = (git rev-parse HEAD 2>$null)
    if ($HeadAfter -eq $HeadBefore) {
        $NoProgress++
        Write-Host "No new commit this iteration ($NoProgress/$MaxNoProgress)." -ForegroundColor Yellow
        if ($NoProgress -ge $MaxNoProgress) {
            Write-Host "No progress for $MaxNoProgress iterations. Stopping — check RESUME.md / BACKLOG.md." -ForegroundColor Yellow
            break
        }
    } else {
        $NoProgress = 0
    }

    Write-Host "Pausing 30 seconds..."
    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "=== Done at $(Get-Date) ===" -ForegroundColor Cyan
if (Test-Path $DoneMarker) {
    Write-Host "APP COMPLETE — backlog cleared, pipeline green." -ForegroundColor Green
} else {
    Write-Host "Stopped after $Iteration iterations. Check BACKLOG.md for the next task." -ForegroundColor Yellow
}
