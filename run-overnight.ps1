# Thin forwarder so `.\run-overnight.ps1` from the repo root keeps working.
#
# The canonical self-improving overnight loop lives in scripts\run-overnight.ps1
# (referenced by CLAUDE.md and BACKLOG.md). This wrapper just forwards every
# argument to it, so both invocation styles run the exact same logic:
#
#   .\run-overnight.ps1 -MaxHours 8
#   .\scripts\run-overnight.ps1 -MaxHours 8
#
# Keeping a single source of truth avoids the two scripts drifting out of sync.

& (Join-Path $PSScriptRoot 'scripts\run-overnight.ps1') @args
