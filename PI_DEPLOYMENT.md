# PI_DEPLOYMENT.md — self-hosting vecini.online on a Raspberry Pi

This guide describes the first-class self-hosted deployment path for vecini.online
on a Raspberry Pi (or any Debian-based single board / mini PC). It runs the same
codebase as the Netlify + Supabase cloud deployment; nothing here breaks cloud
compatibility, and demo/offline mode keeps working.

> Three-stage context: this guide covers the **DEV** stage (`VITE_APP_STAGE=dev`). For the cloud PROD stage see `RUNBOOK-MVP.md`. For the browser-only DEMO stage run `npm run dev:demo` (no backend needed). The rationale for three stages is in `DECISIONS.md` under "Three-stage deployment model".

> Conventions used below (match your Pi): the app lives at
> `/home/cristi/vecini.online`, run by the `cristi` user; the systemd units are
> `vecini-online.service` (frontend) and `vecini-online-telegram.service`
> (webhook); a redeploy is automated by `/home/cristi/bin/deploy-vecini-online`.

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
# Clone into the preferred local path used by the systemd units below.
git clone https://github.com/cristiangabriel88/vecini-online.git /home/cristi/vecini.online
cd /home/cristi/vecini.online
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

Seed one auth user per role so every role is reachable without invite emails:

```bash
npm run pi:seed             # == node scripts/pi-seed.mjs
npm run pi:seed -- --password mySecret   # custom password
```

The script creates (or skips if already present) seven Supabase auth users, all
sharing the same dev password. See [DEV users (pi:seed)](#dev-users-piseed) for
the full role / email / password table.

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

`/etc/systemd/system/vecini-online.service`:

```ini
[Unit]
Description=vecini.online frontend (vite preview)
After=network.target

[Service]
Type=simple
User=cristi
WorkingDirectory=/home/cristi/vecini.online
EnvironmentFile=/home/cristi/vecini.online/.env
ExecStart=/usr/bin/npm run preview -- --host --port 4173
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/vecini-online-telegram.service`:

```ini
[Unit]
Description=vecini.online Telegram webhook service
After=network.target

[Service]
Type=simple
User=cristi
WorkingDirectory=/home/cristi/vecini.online
EnvironmentFile=/home/cristi/vecini.online/.env
ExecStart=/usr/bin/node dist-server/telegram-server.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vecini-online vecini-online-telegram
npm run pi:start            # convenience wrapper around systemctl start
npm run pi:logs             # journalctl -f for both services
npm run pi:stop             # stop both
```

> The service names default to `vecini-online` and `vecini-online-telegram`.
> Override with `VECINI_APP_SERVICE` / `VECINI_TELEGRAM_SERVICE` env vars if you
> rename them.

### One-command redeploy

`/home/cristi/bin/deploy-vecini-online` automates a pull + build + restart on the
Pi. A minimal version:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/cristi/vecini.online
git pull --ff-only
npm ci
npm run pi:build
sudo systemctl restart vecini-online vecini-online-telegram
```

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

## DEV users (pi:seed)

`npm run pi:seed` (or `node scripts/pi-seed.mjs [--password <pwd>]`) creates one
Supabase auth user per role in the local stack. All users share the same dev
password (default `dev-password`; overridable via `--password` or
`VITE_DEV_PASSWORD` in `.env`).

| Role | Email | Membership |
| --- | --- | --- |
| `admin` | `admin@dev.local` | tenant `admin` in the seeded asociatie |
| `presedinte` | `presedinte@dev.local` | tenant `presedinte` |
| `comitet` | `comitet@dev.local` | tenant `comitet` |
| `cenzor` | `cenzor@dev.local` | tenant `cenzor` |
| `proprietar` | `proprietar@dev.local` | tenant `proprietar` |
| `chirias` | `chirias@dev.local` | tenant `chirias` |
| `super_admin` | `super.admin@dev.local` | `platform_admins` grant (no tenant membership) |

The script is **idempotent**: re-running it on an existing database skips
creation and re-applies any missing membership / platform grant.

**Guards** (both must pass or the script aborts):
- `VITE_APP_STAGE` must equal `dev`
- `VITE_SUPABASE_URL` must not match `*.supabase.co` (prevents cloud seeding)

After seeding, use `npm run dev:pi` and log in with any of the emails above, or
click the floating role switcher -- it calls `signInAsDevUser(role)` which signs
in as `{role}@dev.local` using the same `VITE_DEV_PASSWORD`.

---

## DEV email workflow (MAIL_MODE=log)

The Pi uses `MAIL_MODE=log` (set in `.env`) so invite emails are never sent via Resend during local development. Instead, `invite-email.ts` inserts a row into the `email_outbox` table and writes the template to the function console.

1. **Trigger an invite** -- import a CSV on the Apartamente page or click "Trimite invitatie" on the Invitații page.
2. **Read the outbox** -- log in as `admin@dev.local` or `presedinte@dev.local` and open the Invitații page. The collapsible "Outbox (DEV)" panel shows the last 20 outbound emails (hidden in PROD).
3. **Follow the invite link** -- each outbox row carries the full HTML body. Extract the `?token=` URL and open it in a browser, or navigate to `/configurare-cont?token=<token>` directly. The complete invite/onboarding flow then runs exactly as in PROD.
4. **Switch to real delivery** -- set `MAIL_MODE=resend` in `.env` and fill in `RESEND_API_KEY` + `RESEND_FROM_EMAIL` once a Resend account and a verified sender domain are ready.

`MAIL_MODE=disabled` suppresses both delivery and logging -- useful when email is not part of the test assertion.

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

The local admin account (e.g. `admin@vecini.online`, whose generated password is
stored on the Pi at `~/.config/vecini.online/local-admin-credentials.txt`) is a
normal Supabase user; the relaxed setting above is what lets it browse the app
after login without first completing MFA. The admin email is configuration, not
code — it is never hardcoded in the app.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Local Supabase API gateway URL (kong, :54321). Use the Pi's LAN address. |
| `VITE_SUPABASE_ANON_KEY` | Local anon key from `supabase start`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local service-role key (server-side only). |
| `SUPABASE_DB_URL` | Direct Postgres URL (:54322) for backups/migrations. |
| `VITE_APP_STAGE` | `dev` for the Pi. Controls stage-specific UI (role switcher, stage banner, DEV outbox panel). Must be `dev` for `pi:seed` to run. |
| `VITE_STORAGE_MODE` | `supabase` \| `local` \| `none` -- object storage behaviour. |
| `VITE_SECURITY_ENFORCEMENT` | `strict` (default/production) \| `relaxed` (self-hosted) -- see [Security enforcement](#security-enforcement). |
| `MAIL_MODE` | `log` (Pi default) captures invite emails in `email_outbox` + console instead of sending; `resend` sends via Resend; `disabled` suppresses all email. See [DEV email workflow](#dev-email-workflow-mail_modelog). |
| `RESEND_API_KEY` | Resend API key. Required only when `MAIL_MODE=resend`. |
| `RESEND_FROM_EMAIL` | Verified Resend sender address. Required only when `MAIL_MODE=resend`. |
| `VITE_DEV_PASSWORD` | Shared password for all `{role}@dev.local` accounts (default `dev-password`). Used by `pi:seed` and the floating role switcher. |
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
- Stop `vecini-online`/`vecini-online-telegram` during a restore to avoid writes mid-restore.
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
