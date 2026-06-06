#!/usr/bin/env bash
# Restore smoke test: verifies the health endpoint and basic DB table reachability.
# Run after restoring a Supabase backup to a test project to confirm the restore succeeded.
#
# Required env vars (at least one group must be set):
#   HEALTH_URL                -- e.g. https://<site>.netlify.app/.netlify/functions/health
#   SUPABASE_URL              -- restore-target project URL, e.g. https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY -- service-role key for the restore-target project
#
# Exit 0 = all configured checks passed. Exit 1 = at least one check failed.
#
# Usage:
#   HEALTH_URL=https://vecini.online/.netlify/functions/health \
#   SUPABASE_URL=https://<restore-ref>.supabase.co \
#   SUPABASE_SERVICE_ROLE_KEY=<temp-key> \
#   bash scripts/restore-smoke.sh

set -euo pipefail

FAIL=0

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }
skip() { echo "SKIP  $1"; }

echo "=== vecini.online restore smoke ==="
echo ""

# 1. Health endpoint
if [ -n "${HEALTH_URL:-}" ]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo "000")
  if [ "$HTTP_STATUS" = "200" ]; then
    pass "Health endpoint returned HTTP 200 ($HEALTH_URL)"
  else
    fail "Health endpoint returned HTTP $HTTP_STATUS (expected 200)"
  fi
else
  skip "Health endpoint (HEALTH_URL not set)"
fi

# 2. Core DB tables reachable via Supabase REST API
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then

  check_table() {
    local table="$1"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "$SUPABASE_URL/rest/v1/$table?select=id&limit=1" || echo "000")
    if [ "$status" = "200" ]; then
      pass "Table '$table' reachable (HTTP 200)"
    else
      fail "Table '$table' returned HTTP $status (expected 200)"
    fi
  }

  check_table "asociatii"
  check_table "memberships"
  check_table "audit_log"
  check_table "platform_admins"
  check_table "platform_error_reports"

else
  skip "DB reachability checks (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set)"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "=== Restore smoke: PASSED ==="
  exit 0
else
  echo "=== Restore smoke: FAILED ==="
  exit 1
fi
