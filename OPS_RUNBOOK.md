# Operations Runbook — vecini.online

Quick reference for on-call and platform operators.

---

## Health endpoint

| Item | Value |
|------|-------|
| Public URL | `https://vecini.online/.netlify/functions/health` |
| Method | GET |
| Expected response | `200 OK` — `{"status":"ok","stage":"prod"}` |
| No auth required | Yes — safe for external monitors |

---

## External uptime monitoring (recommended: UptimeRobot or BetterUptime)

Configure a monitor pointed at the health URL above.

**UptimeRobot free tier:**
1. Account > Add New Monitor
2. Monitor Type: HTTP(s)
3. URL: `https://vecini.online/.netlify/functions/health`
4. Monitoring Interval: 5 minutes
5. Alert contacts: ops email + optional Telegram

**BetterUptime:**
1. Monitors > Create Monitor > URL
2. URL: `https://vecini.online/.netlify/functions/health`
3. Check frequency: 3 minutes
4. Expected status: 200
5. Notify on recovery as well

Both services send an incident email within one check interval of a failure.

---

## Internal scheduled probe (T261)

A Netlify scheduled function (`health-probe`, `*/5 * * * *`) probes:
- The public health endpoint (5 s timeout)
- A lightweight Supabase round-trip (`asociatii` row count, no data returned)

On anomaly it:
1. Inserts a `HealthProbeFailure` row into `platform_error_reports`
2. Sends an email to `PLATFORM_ALERT_EMAIL` (falls back to `RESEND_FROM_EMAIL`) via Resend
3. De-duplicates alerts with a 30-minute window (per Lambda instance)

The probe is a no-op when `SUPABASE_SERVICE_ROLE_KEY` is absent (demo / preview builds).

### Required env vars

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS) |
| `RESEND_API_KEY` | Transactional email via Resend |
| `RESEND_FROM_EMAIL` | Sender address |
| `PLATFORM_ALERT_EMAIL` | Alert recipient (falls back to `RESEND_FROM_EMAIL`) |
| `URL` | Injected by Netlify — the site's canonical URL, used to probe the health endpoint |
| `COMMIT_REF` | Injected by Netlify — the deployed git SHA, tagged in error reports |

---

## Alert thresholds

| Signal | Condition | Action |
|--------|-----------|--------|
| Health probe failure | Scheduled probe reports `health-timeout`, `health-error`, `network-error`, or `db-error` | Email to `PLATFORM_ALERT_EMAIL`; visible in `/consola/erori` as `HealthProbeFailure` group |
| Error spike | 10+ client errors from one group in 1 hour | Email via `error-report` function (T258c) |
| New error group | First time a client error group is seen | Email via `error-report` function (T258c) |
| External monitor | Health URL returns non-200 or no response within check interval | UptimeRobot/BetterUptime incident email + status page |

---

## Escalation / on-call

1. **First responder** — check `/consola/erori` in the platform console for error groups and `HealthProbeFailure` entries. Check Netlify function logs (Functions tab) for the `health-probe` invocation.
2. **Supabase down** — check `status.supabase.com`; if the project is paused (free-tier inactivity), resume it from the Supabase dashboard.
3. **Netlify deploy broken** — check Netlify deploy logs; revert to last known-good deploy from the Deploys tab.
4. **DNS / TLS issue** — check Netlify custom domain settings and DNS TTL propagation.
5. **Sustained outage (> 30 min)** — post a platform broadcast via `/consola/anunturi-platforma` to notify residents (T253).

---

## Runbook links

- Platform console: `https://platform.vecini.online/consola`
- Error feed: `https://platform.vecini.online/consola/erori`
- Netlify dashboard: `https://app.netlify.com`
- Supabase dashboard: `https://app.supabase.com`
