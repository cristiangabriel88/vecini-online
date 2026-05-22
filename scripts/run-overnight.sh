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
#   --heartbeat N      Seconds between "still alive" heartbeat lines. 0 = off. Default 300.
#   --model NAME       Pass --model to Claude (e.g. "sonnet", "haiku", "opus"). A
#                      cheaper model spends fewer tokens per pass. Default: your
#                      configured default model.
#   --claude-arg ARG   Append one extra raw argument to every Claude invocation.
#                      Repeatable. Use for cost controls, e.g.:
#                        --claude-arg --max-budget-usd --claude-arg 2
#                      (caps per-pass API spend), or --claude-arg --bare for the
#                      biggest token saving -- but --bare needs ANTHROPIC_API_KEY,
#                      it does NOT read your OAuth login, so only use it with a key.
#   --prompt TEXT      The build trigger. Default "make progress".
#
# TOKEN EFFICIENCY: there is no /clear to add. Each pass is a separate `claude -p`
# process, which already starts with a FRESH, empty context window -- strictly
# better than /clear (an interactive-only command that would still reload CLAUDE.md
# and memory). Spawning one process per task is the most token-efficient pattern;
# context never accumulates across passes. --verbose is display-only and costs no
# tokens, so it is kept for liveness. To spend less per pass, use --model and/or
# --claude-arg --max-budget-usd as above.
#
# NOTE: passes --dangerously-skip-permissions so Claude can edit, run the pipeline,
# commit, and push unattended. Only launch this when you intend autonomous progress.

set -uo pipefail

# --- defaults -----------------------------------------------------------------
MAX_TASKS=0
MAX_HOURS=0
STUCK_LIMIT=3
WAIT_ON_LIMIT=1800
HEARTBEAT=300
MODEL=""
PROMPT="make progress"
EXTRA_CLAUDE_ARGS=()

# --- arg parsing --------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-tasks)     MAX_TASKS="$2"; shift 2 ;;
        --max-hours)     MAX_HOURS="$2"; shift 2 ;;
        --stuck-limit)   STUCK_LIMIT="$2"; shift 2 ;;
        --wait-on-limit) WAIT_ON_LIMIT="$2"; shift 2 ;;
        --heartbeat)     HEARTBEAT="$2"; shift 2 ;;
        --model)         MODEL="$2"; shift 2 ;;
        --claude-arg)    EXTRA_CLAUDE_ARGS+=("$2"); shift 2 ;;
        --prompt)        PROMPT="$2"; shift 2 ;;
        -h|--help)       sed -n '2,62p' "$0"; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

# Assemble the Claude flags once. Each pass is a fresh `claude -p` process (a full
# context reset, so no /clear is needed); these flags only tune per-pass cost.
CLAUDE_FLAGS=(--dangerously-skip-permissions --verbose)
[[ -n "$MODEL" ]] && CLAUDE_FLAGS+=(--model "$MODEL")
(( ${#EXTRA_CLAUDE_ARGS[@]} > 0 )) && CLAUDE_FLAGS+=("${EXTRA_CLAUDE_ARGS[@]}")

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

# --- liveness: stage banners + background heartbeat ---------------------------
# The script announces what it is doing ("analyzing", "working", "testing", ...)
# so you can see it is alive, and a background heartbeat reprints the current
# stage every $HEARTBEAT seconds during the long quiet stretches while Claude
# thinks. The current stage is published to a tiny file so the heartbeat (a
# separate process) can read it; the file is written atomically via mv.
STATUS_FILE="$LOG_DIR/.status"
PASS_FILE="$LOG_DIR/.current-pass.log"
HB_PID=""

# set_stage <emoji-ish-tag> <message> : record + print the current stage.
set_stage() {
    {
        echo "HB_PASS=${pass:-0}"
        echo "HB_PHASE=\"${phase:-START}\""
        echo "HB_STAGE=\"$1\""
        echo "HB_SINCE=$(date +%s)"
    } > "$STATUS_FILE.tmp" && mv -f "$STATUS_FILE.tmp" "$STATUS_FILE"
    write_both ">> [$(date +%H:%M:%S)] $1"
}

heartbeat_loop() {
    while true; do
        sleep "$HEARTBEAT"
        [[ -f "$STATUS_FILE" ]] || continue
        (
            # shellcheck disable=SC1090
            source "$STATUS_FILE" 2>/dev/null || exit 0
            secs=$(( $(date +%s) - ${HB_SINCE:-0} ))
            write_both "   .. [alive @ $(date +%H:%M:%S)] pass ${HB_PASS} [${HB_PHASE}] :: ${HB_STAGE} :: ${secs}s in this step"
        )
    done
}

cleanup() {
    [[ -n "$HB_PID" ]] && kill "$HB_PID" 2>/dev/null
    rm -f "$STATUS_FILE" "$STATUS_FILE.tmp" "$PASS_FILE" 2>/dev/null
}
trap cleanup EXIT INT TERM

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
        set_stage "Testing: npm run $step"
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
    # Stream Claude's --verbose output live to the terminal AND the main log, and
    # keep a per-pass copy so we can scan it afterwards for rate-limit/auth signals.
    # (The old code captured with $(...) which hid all live output until the pass
    # finished, making the run look frozen.)
    : > "$PASS_FILE"
    claude -p "$pass_prompt" "${CLAUDE_FLAGS[@]}" 2>&1 \
        | tee -a "$LOG" | tee "$PASS_FILE"
    PASS_OUTPUT="$(cat "$PASS_FILE" 2>/dev/null || true)"
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
if (( HEARTBEAT > 0 )); then write_both "Heartbeat:  every ${HEARTBEAT}s"; else write_both "Heartbeat:  off"; fi
write_both "Model:      ${MODEL:-<your default>}"
write_both "Context:    fresh per pass (no /clear needed; each pass is a clean claude -p)"
if (( ${#EXTRA_CLAUDE_ARGS[@]} > 0 )); then write_both "ClaudeArgs: ${EXTRA_CLAUDE_ARGS[*]}"; fi
write_both "Build:      $PROMPT"
write_both ""

# Launch the background heartbeat so quiet stretches still show signs of life.
if (( HEARTBEAT > 0 )); then
    heartbeat_loop &
    HB_PID=$!
fi

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
    if (( is_build == 1 )); then
        set_stage "Analyzing: selecting the next task ($open open in the queue)"
        pass_prompt="$PROMPT"
        set_stage "Working: Claude is thinking and implementing the task (live output follows)"
    else
        write_both "Backlog exhausted => measuring vision coverage and generating the next wave of work."
        pass_prompt="$REPLENISH_PROMPT"
        set_stage "Working: Claude is auditing the app and replenishing the backlog (live output follows)"
    fi
    invoke_pass "$phase" "$pass_prompt"

    # Usage/rate limit: don't burn a pass on it. Wait, then retry the same pass.
    if printf '%s' "$PASS_OUTPUT" | grep -qiE 'rate limit|usage limit|quota exceeded|too many requests|\b429\b'; then
        write_both ""
        set_stage "Waiting: usage/rate limit hit, sleeping ${WAIT_ON_LIMIT}s before retrying this pass"
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
        phase="REPLENISH"; is_build=0
        set_stage "Re-planning: build stalled, Claude is re-planning and unblocking (live output follows)"
        invoke_pass "REPLENISH" "$REPLENISH_PROMPT"
        committed=$PASS_COMMITTED
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
    set_stage "Verifying: re-running lint / typecheck / test / build on the new commit"
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
