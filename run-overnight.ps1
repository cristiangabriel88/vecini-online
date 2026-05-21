# run-overnight.ps1 — continue the BlocHub build until features are done
# Run from VSCode terminal (PowerShell) in the repo root.

$ErrorActionPreference = "Continue"

$LogDir = ".\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$MaxIterations = 50
$Iteration = 0
$DoneMarker = ".\BUILD_COMPLETE"
$WaitOnLimitSeconds = 1800

$Prompt = @'
Continue the autonomous BlocHub build.

Read RESUME.md, docs/DECISIONS.md, and docs/FEATURES.md to see current state.

Then:
1. Pick the next 5-10 unimplemented features from docs/FEATURES.md (features without the check mark).
2. Implement each one fully: database migration, RLS policies, React components, Telegram bot integration, unit tests, one E2E happy-path test.
3. After each feature: mark it complete in docs/FEATURES.md with a one-line implementation note, then commit with message "feat(F##): <name>".
4. After the batch: run npm run lint, npm run typecheck, npm test, npm run build. Fix anything broken before stopping.
5. Update RESUME.md at the end with: features completed this turn, features remaining, current overall completion %, any blockers.
6. If ALL 65 features are complete AND lint/typecheck/tests/build all pass, create an empty file named BUILD_COMPLETE at the repo root.

Rules:
- Do not ask questions. Make decisions and document them in docs/DECISIONS.md.
- Do not skip features. If one is hard, simplify it but ship something working.
- Do not leave TODOs or commented-out code.
- Commit after each feature, not at the end.

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
