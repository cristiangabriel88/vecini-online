#!/usr/bin/env bash
# Autonomous continuous-development loop for vecini.online (bash variant).
#
# Repeatedly runs Claude Code headless ("make progress"); each pass completes one
# task from BACKLOG.md and pushes a commit. Stops when a pass makes no new commit
# (nothing left / stuck), the max-task budget is hit, or you Ctrl+C.
#
# Uses --dangerously-skip-permissions so Claude can edit, verify, commit and push
# unattended. Only run it when you want fully autonomous progress.
#
# Usage: scripts/run-overnight.sh [MAX_TASKS] [PROMPT]
set -euo pipefail

MAX_TASKS="${1:-25}"
PROMPT="${2:-make progress}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

[ -d .git ] || { echo "Not a git repository: $REPO_ROOT" >&2; exit 1; }
command -v claude >/dev/null 2>&1 || { echo "'claude' CLI not found on PATH." >&2; exit 1; }

LOG_DIR="$REPO_ROOT/.overnight-logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
LOG="$LOG_DIR/overnight-$STAMP.log"

log() { echo "$*" | tee -a "$LOG"; }

log "=== Overnight run started $STAMP ==="
log "Repo:     $REPO_ROOT"
log "MaxTasks: $MAX_TASKS"
log "Prompt:   $PROMPT"
log ""

completed=0
for ((i=1; i<=MAX_TASKS; i++)); do
  before="$(git rev-parse HEAD)"
  log "--- Pass $i/$MAX_TASKS  (HEAD ${before:0:7}) @ $(date +%H:%M:%S) ---"

  claude -p "$PROMPT" --dangerously-skip-permissions --verbose 2>&1 | tee -a "$LOG"

  after="$(git rev-parse HEAD)"
  if [ "$before" = "$after" ]; then
    log ""
    log "No new commit this pass => nothing left to do or stuck. Stopping."
    break
  fi

  completed=$((completed+1))
  log ""
  log "Pass $i done. New commit: ${after:0:7}  $(git log -1 --pretty=%s)"
  log ""
done

log "=== Overnight run finished: $completed task(s) completed. Log: $LOG ==="
