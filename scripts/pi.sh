#!/usr/bin/env bash
#
# Raspberry Pi / self-hosted deployment helper for IntreVecini.
#
# Wraps the systemd services and the local Supabase stack so the npm `pi:*`
# scripts stay short. Designed to run on the Pi itself (Debian/Raspberry Pi OS).
#
#   ./scripts/pi.sh build     Build the Vite frontend and bundle the webhook service.
#   ./scripts/pi.sh start     Start the app + Telegram webhook systemd services.
#   ./scripts/pi.sh stop      Stop those services.
#   ./scripts/pi.sh logs      Follow both services' logs (journalctl).
#   ./scripts/pi.sh migrate   Apply pending Supabase migrations to the local DB.
#
# Service names (see PI_DEPLOYMENT.md): vecini-app (Vite preview) and
# vecini-telegram (Node webhook service). Both are installed as user units or
# system units depending on your setup; this script targets system units via
# sudo and falls back to a clear message when systemd is unavailable.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_SERVICE="${VECINI_APP_SERVICE:-vecini-app}"
TG_SERVICE="${VECINI_TELEGRAM_SERVICE:-vecini-telegram}"

have() { command -v "$1" >/dev/null 2>&1; }

cmd="${1:-}"
case "$cmd" in
  build)
    echo "==> Building frontend (vite build)"
    npm run build
    echo "==> Bundling Telegram webhook service"
    node scripts/build-server.mjs
    echo "==> Done. Frontend in dist/, webhook in dist-server/telegram-server.mjs"
    ;;

  start)
    if have systemctl; then
      sudo systemctl start "$APP_SERVICE" "$TG_SERVICE"
      sudo systemctl --no-pager --lines=0 status "$APP_SERVICE" "$TG_SERVICE" || true
    else
      echo "systemctl not found. Start manually:"
      echo "  npm run preview &                       # frontend on :4173"
      echo "  node dist-server/telegram-server.mjs &  # webhook service"
    fi
    ;;

  stop)
    if have systemctl; then
      sudo systemctl stop "$APP_SERVICE" "$TG_SERVICE"
    else
      echo "systemctl not found. Stop the 'vite preview' and 'telegram-server' processes manually."
    fi
    ;;

  logs)
    if have journalctl; then
      sudo journalctl -u "$APP_SERVICE" -u "$TG_SERVICE" -f --no-pager
    else
      echo "journalctl not found. Tailing repo logs/ instead."
      tail -f logs/*.log 2>/dev/null || echo "No logs/ files found."
    fi
    ;;

  migrate)
    if have supabase; then
      echo "==> Applying pending migrations to the local Supabase database"
      supabase migration up
    else
      echo "Supabase CLI not found. Install it, then run: supabase migration up"
      exit 1
    fi
    ;;

  *)
    echo "Usage: scripts/pi.sh {build|start|stop|logs|migrate}"
    exit 1
    ;;
esac
