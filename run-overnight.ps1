# run-overnight.ps1 — continue the BlocHub build until features are done
# Run from VSCode terminal (PowerShell) in the repo root.

$ErrorActionPreference = "Continue"

$LogDir = ".\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$MaxIterations = 50
$Iteration = 0
$DoneMarker = ".\BUILD_COMPLETE"
$WaitOnLimitSeconds = 1800

# Token strategy: each iteration is a fresh `claude` process, so context is wiped
# clean between sessions — that reset (no carried-over summary) is the real
# token saver, more thorough than /compact. The job per session is a SMALL batch
# of 2-3 RELATED features so the cold-start orientation cost (reading the docs +
# learning the codebase conventions) is amortised across them, while the session
# still ends before context bloats. Do not balloon a session to 5-10 features:
# late-batch context bloat costs more tokens than the cold start it avoids.
$Prompt = @'
Continue the autonomous BlocHub build.

Read RESUME.md, DECISIONS.md, and FEATURES.md (all at the repo root) for state.

This session, implement a SMALL BATCH of 2-3 features, chosen to minimise tokens
and maximise quality:
- Take the next unimplemented features in FEATURES.md (those without the check mark).
- Prefer features that share a database table or domain so codebase understanding
  carries over (e.g. booking-based features together; project-based together).
- If the next feature is large or complex (e.g. AGA digitală), implement ONLY that
  one this session and stop — do not pad the batch.

For EACH feature in the batch, in order:
1. Implement it fully: database migration, RLS policies, React components,
   Telegram bot integration, unit tests, one E2E happy-path test.
2. Fast gate: run `npm run lint` and `npm run typecheck`. Fix before continuing.
3. Mark it complete in FEATURES.md with a one-line implementation note.
4. Commit with message "feat(F##): <name>", then push (`git push`).

After the whole batch (run the slow checks ONCE, not per feature):
5. Run `npm test` and `npm run build`. If anything broke, fix it and add a
   follow-up commit "fix: <what>" (do not amend already-pushed commits), then push.
6. Update RESUME.md with: features completed this turn, features remaining,
   overall completion %, any blockers.
7. If ALL 65 features are complete AND lint/typecheck/tests/build all pass, create
   an empty file named BUILD_COMPLETE at the repo root, commit and push it.
8. STOP. Do not start another batch — the session ends here so the next iteration
   begins with a clean context window.

Rules:
- Do not ask questions. Make decisions and document them in DECISIONS.md.
- Do not skip features. If one is hard, simplify it but ship something working.
- Do not leave TODOs or commented-out code.
- Match the conventions of features already built (look at a similar finished one).

Begin.
'@

Write-Host "Starting overnight build at $(Get-Date)" -ForegroundColor Cyan

while ($Iteration -lt $MaxIterations) {
    $Iteration++
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $LogFile = "$LogDir\iter_${Iteration}_${Timestamp}.log"

    Write-Host ""
    Write-Host "=== Iteration $Iteration at $(Get-Date) ===" -ForegroundColor Green

    if (Test-Path $DoneMarker) {
        Write-Host "BUILD_COMPLETE found. Done!" -ForegroundColor Green
        break
    }

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

    Write-Host "Pausing 30 seconds..."
    Start-Sleep -Seconds 30
}

Write-Host ""
Write-Host "=== Done at $(Get-Date) ===" -ForegroundColor Cyan
if (Test-Path $DoneMarker) {
    Write-Host "BUILD COMPLETE" -ForegroundColor Green
} else {
    Write-Host "Stopped after $Iteration iterations. Check RESUME.md." -ForegroundColor Yellow
}
