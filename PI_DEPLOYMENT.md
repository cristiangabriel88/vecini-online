# PI_DEPLOYMENT.md — self-hosting IntreVecini on a Raspberry Pi

This guide describes the first-class self-hosted deployment path for IntreVecini
on a Raspberry Pi (or any Debian-based single board / mini PC). It runs the same
codebase as the Netlify + Supabase cloud deployment; nothing here breaks cloud
compatibility, and demo/offline mode keeps working.

The Pi deployment is built from three long-lived pieces:

1. A minimal local Supabase stack (Postgres + Auth + REST + Kong) in Docker.
2. The Vite frontend served by `vite preview` on port 4173, managed by systemd.
3. The standalone Telegram webhook service (Node, `node:http`) on its own port,
   managed by a second systemd unit, because the Netlify-function webhook does
   not run under `vite preview`.

> Storage note: Supabase Storage, Studio, Analytics and Vector are intentionally
> excluded from the Pi stack because they fail health checks on the Pi. File
> uploads are handled gracefully (see [File storage](#file-storage)).

---

## 1. Install Docker

On Raspberry Pi OS (64-bit) / Debian:

```bash
# Docker Engine + compose plugin via the convenience script
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"      # log out/in so the group takes effect
docker --version
docker compose version
```

Install Node.js 20+ (the webhook bundle targets node20) and the Supabase CLI:

```bash
# Node via nodesource (arm64)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Supabase CLI (arm64 .deb from the releases page; check for the latest)
curl -fsSLo supabase.deb https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.deb
sudo dpkg -i supabase.deb
supabase --version
```

---

## 2. Get the code and configure env

```bash
git clone https://github.com/cristiangabriel88/IntreVecini.git
cd IntreVecini
npm ci
cp .env.pi.example .env
# edit .env: paste the local Supabase keys, bot token, webhook secret, URLs
```

See [Environment variables](#environment-variables) for what each value means.

---

## 3. Start the minimal Supabase stack

The Pi runs only the services that pass health checks. Exclude Storage, Studio,
Analytics and Vector:

```bash
supabase start \
  -x storage-api \
  -x studio \
  -x imgproxy \
  -x edge-runtime \
  -x logflare \
  -x vector
```

`supabase start` prints the local API URL (`http://127.0.0.1:54321`), the
Postgres URL (`...:54322`), and the `anon` / `service_role` keys. Copy the anon +
service-role keys into `.env`, and set `VITE_SUPABASE_URL` to the Pi's LAN
address (e.g. `http://raspberrypi.local:54321`) so other devices can reach it.

Apply the database schema (migrations live in `supabase/migrations/`):

```bash
npm run pi:migrate          # == supabase migration up
```

A fresh `supabase db reset` also works end to end: the migrations are ordered so
the older `audit_log` table from `init_core.sql` is upgraded in place, and
`is_super_admin()` is defined before any policy references it.

---

## 4. Build the app and the webhook service

```bash
npm run pi:build
```

This runs `vite build` (frontend into `dist/`) and bundles the Telegram webhook
service into `dist-server/telegram-server.mjs` via esbuild. No extra runtime
dependencies are needed on the Pi beyond Node.

---

## 5. systemd services

Create two unit files. Adjust `User`, `WorkingDirectory` and paths to your
install. The app is served by `vite preview` on 4173; the webhook runs the
bundled Node service.

`/etc/systemd/system/vecini-app.service`:

```ini
[Unit]
Description=IntreVecini frontend (vite preview)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/IntreVecini
EnvironmentFile=/home/pi/IntreVecini/.env
ExecStart=/usr/bin/npm run preview -- --host --port 4173
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/vecini-telegram.service`:

```ini
[Unit]
Description=IntreVecini Telegram webhook service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/IntreVecini
EnvironmentFile=/home/pi/IntreVecini/.env
ExecStart=/usr/bin/node dist-server/telegram-server.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vecini-app vecini-telegram
npm run pi:start            # convenience wrapper around systemctl start
npm run pi:logs             # journalctl -f for both services
npm run pi:stop             # stop both
```

> The service names default to `vecini-app` and `vecini-telegram`. Override with
> `VECINI_APP_SERVICE` / `VECINI_TELEGRAM_SERVICE` env vars if you rename them.

### Reverse proxy + Telegram webhook registration

Telegram requires HTTPS for `setWebhook`. Put Caddy, nginx or a Cloudflare
Tunnel in front; the webhook service binds to `127.0.0.1:8787` by default.
Proxy your public HTTPS host's `TELEGRAM_WEBHOOK_PATH` to it, then register:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://your-pi-domain.example/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

### Health endpoint

The webhook service exposes `GET /health` returning
`{"status":"ok","service":"telegram-webhook","time":...}`. Use it for systemd
watchdogs, uptime monitors or the reverse proxy health check:

```bash
curl -s http://127.0.0.1:8787/health
```

---

## File storage

Supabase Storage is excluded on the Pi, so object/file uploads are controlled by
`VITE_STORAGE_MODE`:

- `none` (default for the Pi): file uploads are disabled and storage-backed
  surfaces (e.g. document attachments) show a clear notice instead of a broken
  control. Text-only data (titles, descriptions) keeps working.
- `local`: a local filesystem adapter serves objects (suitable once you add a
  storage volume to the Pi).
- `supabase`: the cloud/Netlify default; uses Supabase Storage when configured.

The capability is resolved in `src/shared/lib/storage.ts`; the UI reads
`isStorageAvailable` to decide whether to offer uploads.

---

## Security enforcement

Privileged roles (admin, comitet, cenzor, president, super_admin) are normally
required to set up and pass a second factor (2FA) before reaching any in-app
route. On a fresh local Supabase stack the admin has no second factor yet, so in
the default `strict` mode every navigation is steered to `/app/securitate` and
the admin cannot explore the app until MFA is fully set up.

For a trusted self-hosted LAN deployment you can relax this:

```bash
# in .env on the Pi
VITE_SECURITY_ENFORCEMENT=relaxed
```

In `relaxed` mode the gate never forces the security page, so the local admin
navigates the app normally; the Security page stays reachable so MFA can still
be enrolled voluntarily. Anything other than an explicit `relaxed` resolves to
`strict`, so production behaviour is unchanged unless you opt in. Use `relaxed`
only on a trusted network, since it removes the mandatory-MFA guarantee.

> Demo/offline mode is never gated regardless of this setting (it has no real
> backend role).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Local Supabase API gateway URL (kong, :54321). Use the Pi's LAN address. |
| `VITE_SUPABASE_ANON_KEY` | Local anon key from `supabase start`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local service-role key (server-side only). |
| `SUPABASE_DB_URL` | Direct Postgres URL (:54322) for backups/migrations. |
| `VITE_STORAGE_MODE` | `supabase` \| `local` \| `none` — object storage behaviour. |
| `VITE_SECURITY_ENFORCEMENT` | `strict` (default/production) \| `relaxed` (self-hosted) — see [Security enforcement](#security-enforcement). |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather. |
| `TELEGRAM_BOT_USERNAME` | Bot username (for deep links). |
| `TELEGRAM_WEBHOOK_SECRET` | Secret matched against the Telegram secret header. |
| `TELEGRAM_WEBHOOK_HOST` | Bind host for the webhook service (default 127.0.0.1). |
| `TELEGRAM_WEBHOOK_PORT` | Bind port for the webhook service (default 8787). |
| `TELEGRAM_WEBHOOK_PATH` | Route for the webhook (default `/telegram/webhook`). |
| `APP_URL` / `VITE_APP_URL` | Public app URL (reverse proxy / tunnel host). |
| `VITE_DEFAULT_LOCALE` | `ro` or `en`. |

When `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are absent the app falls back
to demo/offline mode, so it always runs even before the stack is up.

---

## Backup and restore

The data that matters lives in Postgres. Back it up with `pg_dump` over the
local connection (`SUPABASE_DB_URL`).

Backup (nightly cron recommended):

```bash
# whole database, compressed
pg_dump "$SUPABASE_DB_URL" -Fc -f "backup-$(date +%F).dump"

# or plain SQL
pg_dump "$SUPABASE_DB_URL" -f "backup-$(date +%F).sql"
```

Restore into a fresh local stack:

```bash
# custom-format dump
pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backup-2026-05-25.dump

# plain SQL dump
psql "$SUPABASE_DB_URL" -f backup-2026-05-25.sql
```

Notes:
- Stop `vecini-app`/`vecini-telegram` during a restore to avoid writes mid-restore.
- If `VITE_STORAGE_MODE=local`, also back up the filesystem directory that holds
  uploaded objects.
- Keep at least one off-Pi copy (rsync/scp to another machine or cloud bucket).
- Test a restore periodically on a spare stack; an untested backup is a guess.

---

## Cloud compatibility

Nothing here is Pi-only at the code level:
- The Telegram logic is framework-independent (`src/shared/server/telegramWebhook.ts`);
  the Netlify function (`netlify/functions/telegram-webhook.ts`) and the Pi Node
  service are thin adapters over the same code.
- `VITE_STORAGE_MODE` defaults to `supabase`, so the cloud build is unchanged.
- Demo/offline mode is preserved (no Supabase creds → seeded Romanian data).
