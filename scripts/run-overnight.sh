#!/usr/bin/env bash
#
# Self-improving autonomous development loop for vecini.online (Git Bash / POSIX).
#
# Drives the project toward a polished, final, premium deliverable with no human
# input. Each pass is one of two phases, chosen automatically:
#
#   BUILD     - while BACKLOG.md still has open tasks ("### <white-square>"), run
#               "make progress" to complete exactly one task (commit + push).
#
#   REPLENISH - when the backlog is exhausted (no open tasks) OR a build pass
#               stalls, run the audit/replenish prompt instead. That pass does NOT
#               build a feature; it measures how much of the original product
#               vision (CLAUDE.md) is delivered, audits the app for what could be
#               safer / more stable / more polished, writes the next wave of
#               priority-ranked T## tasks into BACKLOG.md, and makes RESUME.md +
#               the docs bigger, better, and more polished.
#
# So the loop never simply "ends" while the app can still be improved: an empty
# queue refills itself and work continues. It stops only when:
#   * the stall tripwire fires (--stuck-limit consecutive passes with no build
#     commit, even after a replenish attempt) - genuinely nothing actionable,
#   * a task/time budget is reached (--max-tasks / --max-hours), or
#   * the post-commit pipeline goes red (halt so a break is never built upon),
#   * an auth error needs the human, or you press Ctrl+C.
#
# Usage/rate limits are handled gracefully: the pass waits and retries instead of
# being counted as a stall.
#
# Usage:
#   ./scripts/run-overnight.sh                 # unbounded: build, then keep improving
#   ./scripts/run-overnight.sh --max-hours 8   # stop by morning
#   ./scripts/run-overnight.sh --max-tasks 5
#
# Options:
#   --max-tasks N      Cap on total passes (build + replenish). 0 = unbounded (default).
#   --max-hours N      Wall-clock budget in hours (fractional ok). 0 = unbounded (default).
#   --stuck-limit N    Consecutive non-build passes before stopping. Default 3.
#   --wait-on-limit N  Seconds to wait before retrying on a usage/rate limit. Default 1800.
#   --prompt TEXT      The build trigger. Default "make progress".
#
# NOTE: passes --dangerously-skip-permissions so Claude can edit, run the pipeline,
# commit, and push unattended. Only launch this when you intend autonomous progress.

set -uo pipefail

# --- defaults -----------------------------------------------------------------
MAX_TASKS=0
MAX_HOURS=0
STUCK_LIMIT=3
WAIT_ON_LIMIT=1800
PROMPT="make progress"

# --- arg parsing --------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-tasks)     MAX_TASKS="$2"; shift 2 ;;
        --max-hours)     MAX_HOURS="$2"; shift 2 ;;
        --stuck-limit)   STUCK_LIMIT="$2"; shift 2 ;;
        --wait-on-limit) WAIT_ON_LIMIT="$2"; shift 2 ;;
        --prompt)        PROMPT="$2"; shift 2 ;;
        -h|--help)       sed -n '2,45p' "$0"; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

# The audit/replenish trigger used when the backlog is empty or a build stalls.
read -r -d '' REPLENISH_PROMPT <<'EOF' || true
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
EOF

# --- repo root = parent of this script's folder -------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# --- preconditions ------------------------------------------------------------
[[ -d "$REPO_ROOT/.git" ]]   || { echo "Not a git repository: $REPO_ROOT" >&2; exit 1; }
command -v claude >/dev/null || { echo "The 'claude' CLI was not found on PATH." >&2; exit 1; }
BACKLOG="$REPO_ROOT/BACKLOG.md"
[[ -f "$BACKLOG" ]]          || { echo "BACKLOG.md not found at: $BACKLOG" >&2; exit 1; }

# --- logging ------------------------------------------------------------------
LOG_DIR="$REPO_ROOT/.overnight-logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
LOG="$LOG_DIR/overnight-$STAMP.log"

write_both() { printf '%s\n' "$1"; printf '%s\n' "$1" >> "$LOG"; }

# Open-task count. An open task heading is "### " followed by U+2B1C (white square).
# The marker is built from its bytes via printf, not written as a literal, so the
# script stays pure-ASCII and free of any source-encoding surprises.
SQUARE="$(printf '\xe2\xac\x9c')"
get_open_task_count() {
    local count
    count="$(grep -c "^### ${SQUARE}" "$BACKLOG" 2>/dev/null)" || true
    printf '%s' "${count:-0}"
}

# Independent post-commit tripwire: re-run the full pipeline after each commit so a
# broken commit halts the loop instead of stacking more work on top of it.
test_pipeline() {
    local step rc
    for step in lint typecheck test build; do
        write_both "  gate: npm run $step"
        npm run "$step" 2>&1 | tee -a "$LOG"
        rc=${PIPESTATUS[0]}
        if [[ $rc -ne 0 ]]; then
            write_both "  gate FAILED at: npm run $step (exit $rc)"
            return 1
        fi
    done
    return 0
}

# Run one Claude pass. Sets globals PASS_COMMITTED (0/1) and PASS_OUTPUT (text).
PASS_COMMITTED=0
PASS_OUTPUT=""
invoke_pass() {
    local phase="$1" pass_prompt="$2" before after subject
    before="$(git rev-parse HEAD)"
    PASS_OUTPUT="$(claude -p "$pass_prompt" --dangerously-skip-permissions --verbose 2>&1 | tee -a "$LOG")"
    after="$(git rev-parse HEAD)"
    if [[ "$before" != "$after" ]]; then
        PASS_COMMITTED=1
        subject="$(git log -1 --pretty=%s)"
        write_both ""
        write_both "[$phase] committed: ${after:0:7}  $subject"
    else
        PASS_COMMITTED=0
    fi
}

# --- banner -------------------------------------------------------------------
write_both "=== Self-improving overnight run started $STAMP ==="
write_both "Repo:       $REPO_ROOT"
if [[ "$MAX_TASKS" -le 0 ]]; then write_both "MaxTasks:   unbounded"; else write_both "MaxTasks:   $MAX_TASKS"; fi
if (( $(awk "BEGIN{print ($MAX_HOURS>0)}") )); then write_both "MaxHours:   $MAX_HOURS"; else write_both "MaxHours:   unbounded"; fi
write_both "StuckLimit: $STUCK_LIMIT consecutive non-build passes"
write_both "Build:      $PROMPT"
write_both ""

START_EPOCH="$(date +%s)"
builds_completed=0   # build-phase tasks finished
replenish_runs=0     # audit/replenish passes that committed
no_build_streak=0    # consecutive passes without a build commit (stall detector)
pass=0

while true; do
    if (( MAX_TASKS > 0 )) && (( pass >= MAX_TASKS )); then
        write_both ""
        write_both "Reached MaxTasks=$MAX_TASKS. Stopping."
        break
    fi
    if (( $(awk "BEGIN{print ($MAX_HOURS>0)}") )); then
        now="$(date +%s)"
        elapsed=$(( now - START_EPOCH ))
        max_sec="$(awk "BEGIN{printf \"%d\", $MAX_HOURS*3600}")"
        if (( elapsed >= max_sec )); then
            write_both ""
            write_both "Reached MaxHours=$MAX_HOURS (elapsed $(awk "BEGIN{printf \"%.2f\", $elapsed/3600}")h). Stopping."
            break
        fi
    fi

    pass=$(( pass + 1 ))
    head="$(git rev-parse HEAD)"
    open="$(get_open_task_count)"
    if (( open > 0 )); then is_build=1; phase="BUILD"; else is_build=0; phase="REPLENISH"; fi

    write_both "--- Pass $pass  [$phase]  open tasks: $open  (HEAD ${head:0:7}) @ $(date +%H:%M:%S) ---"
    if (( is_build == 0 )); then
        write_both "Backlog exhausted => measuring vision coverage and generating the next wave of work."
    fi

    if (( is_build == 1 )); then pass_prompt="$PROMPT"; else pass_prompt="$REPLENISH_PROMPT"; fi
    invoke_pass "$phase" "$pass_prompt"

    # Usage/rate limit: don't burn a pass on it. Wait, then retry the same pass.
    if printf '%s' "$PASS_OUTPUT" | grep -qiE 'rate limit|usage limit|quota exceeded|too many requests|\b429\b'; then
        write_both ""
        write_both "Usage/rate limit detected. Waiting ${WAIT_ON_LIMIT}s, then retrying this pass."
        pass=$(( pass - 1 ))
        sleep "$WAIT_ON_LIMIT"
        continue
    fi
    # Auth failure needs a human; nothing autonomous can recover it.
    if (( PASS_COMMITTED == 0 )) && printf '%s' "$PASS_OUTPUT" | grep -qiE 'authentication failed|unauthorized|not logged in|please run .?claude.? to (re)?authenticate'; then
        write_both ""
        write_both "Auth error detected. Run 'claude' to re-authenticate, then re-run this script. Stopping."
        break
    fi

    committed=$PASS_COMMITTED

    # If a build pass stalls (no commit), try one replenish to re-plan / unblock
    # before counting it as a stall.
    if (( is_build == 1 )) && (( committed == 0 )); then
        write_both "Build pass produced no commit. Running a replenish pass to re-plan / unblock."
        invoke_pass "REPLENISH" "$REPLENISH_PROMPT"
        committed=$PASS_COMMITTED
        phase="REPLENISH"; is_build=0
    fi

    if (( committed == 0 )); then
        no_build_streak=$(( no_build_streak + 1 ))
        write_both ""
        write_both "No progress this pass (no-build streak $no_build_streak/$STUCK_LIMIT)."
        if (( no_build_streak >= STUCK_LIMIT )); then
            write_both "Stall tripwire reached: nothing actionable left, or the loop is stuck. Stopping."
            break
        fi
        continue
    fi

    # A commit was made. Re-verify the committed state independently.
    write_both "Re-verifying committed state..."
    if ! test_pipeline; then
        halt="$(git rev-parse HEAD)"
        write_both ""
        write_both "Pipeline RED on commit ${halt:0:7}. Halting so the failure is not compounded. Inspect the log, fix, then re-run."
        break
    fi
    write_both "Pipeline green."
    write_both ""

    if (( is_build == 1 )); then
        builds_completed=$(( builds_completed + 1 ))
        no_build_streak=0   # real task progress resets the stall detector
    else
        replenish_runs=$(( replenish_runs + 1 ))
        no_build_streak=$(( no_build_streak + 1 ))   # replenish is progress, but not a build
        write_both "Replenish committed (no-build streak $no_build_streak/$STUCK_LIMIT). New work should now be queued."
        if (( no_build_streak >= STUCK_LIMIT )); then
            write_both "Stall tripwire reached after replenish-only passes. Stopping."
            break
        fi
    fi
done

elapsed_h="$(awk "BEGIN{printf \"%.2f\", ($(date +%s) - $START_EPOCH)/3600}")"
write_both "=== Run finished: $builds_completed build task(s), $replenish_runs replenish pass(es) over $pass pass(es) in ${elapsed_h}h. Log: $LOG ==="
