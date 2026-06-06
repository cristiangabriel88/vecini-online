# DR_RUNBOOK — vecini.online

Disaster-recovery and secret-rotation procedures. Keep this document current: update the "Last tested" dates after every drill.

---

## 1. Recovery targets

| Target | Value | Notes |
|--------|-------|-------|
| RPO (Recovery Point Objective) | 24 h | Supabase Pro takes one physical backup per day; PITR (point-in-time recovery) narrows this to ~1 min on Pro + PITR add-on |
| RTO (Recovery Time Objective) | 4 h | From confirmed incident to service accepting traffic; measured from the restore kick-off, not incident detection |

If PITR is enabled, the effective RPO drops to the WAL shipping lag (typically under 1 minute) at the cost of slightly longer restore time.

---

## 2. Supabase backup and restore

### 2.1 Backup schedule

Supabase Pro takes a full physical snapshot daily at ~00:00 UTC. Backups are retained for **7 days** by default (extendable on Pro+). Point-in-time recovery (PITR) must be explicitly enabled in **Project Settings > Add-ons**.

### 2.2 Quarterly restore drill checklist

Run on the **1st day of each quarter** (1 Jan, 1 Apr, 1 Jul, 1 Oct). Log the outcome at the bottom of this section.

**Preparation (day before)**

- [ ] Confirm the most recent backup completed successfully: Supabase dashboard > **Backups** > verify "Successful" status and timestamp.
- [ ] Note the backup restore point to use (latest, or a specific date for PITR).

**Restore steps**

1. **Create a restore-target project** in the same Supabase org — name it `vecini-restore-YYYY-QQ` (e.g. `vecini-restore-2026-Q3`). Use the same region as production.
2. From the production project dashboard, go to **Settings > Backups**, select the target backup, and click **Restore to a new project** — choose the project created in step 1.
3. Wait for restore to complete (typically 10–30 min). Monitor the restore-target project's **Settings > Backups** or the restore progress indicator.
4. In the restore-target project, navigate to **Table Editor** and spot-check at least three tables: `asociatii`, `memberships`, `audit_log`. Verify row counts are plausible.
5. Note the restore-target project URL and create a temporary service-role key (**Settings > API > Service role key**).
6. Run the restore smoke script against the restore-target:

   ```bash
   SUPABASE_URL=https://<restore-project-ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<temp-service-role-key> \
   bash scripts/restore-smoke.sh
   ```

7. Confirm all checks print `PASS`. If any `FAIL`, investigate before clearing the drill.
8. **Delete** the restore-target project when the drill is complete — it holds real production data.

**Post-drill**

- [ ] Log the date, backup restore point used, and pass/fail below.
- [ ] Revoke the temporary service-role key used during the drill (Supabase > Settings > API > revoke).

### 2.3 Drill log

| Date | Backup restore point | Outcome | Operator |
|------|---------------------|---------|----------|
| _(next: 2026-07-01)_ | | | |

---

## 3. Key rotation procedures

All secrets live in **Netlify > Site configuration > Environment variables**. Each procedure below updates them there. After updating, trigger a **new Netlify deploy** (the functions pick up env vars at deploy time, not at request time).

Production Netlify site: **vecini-online** (main branch auto-deploys).

### 3.1 `SUPABASE_SERVICE_ROLE_KEY`

This key grants full database access. Rotate quarterly or immediately on suspected exposure.

**Steps**

1. Open Supabase dashboard > **Settings > API**.
2. Under **Project API keys**, click **Reveal** next to `service_role`.
3. Supabase does not provide a one-click rotate for the service-role key; it shares the JWT secret with the anon key. To invalidate the current key, you must **rotate the JWT secret** (see step 4) — this also invalidates all user sessions (see §4 for emergency revocation instead).
4. Go to **Settings > API > JWT Settings**. Click **Generate a new secret**. Confirm the rotation. This generates a new JWT secret; all keys derived from it (anon, service_role) update automatically. **Copy the new `service_role` value immediately.**
5. In Netlify, update `SUPABASE_SERVICE_ROLE_KEY` with the new value.
6. Also update `VITE_PUBLIC_SUPABASE_ANON_KEY` with the new anon key shown in the same Supabase settings page.
7. Trigger a Netlify deploy. Verify the health endpoint returns `{"status":"ok"}` after deploy.
8. Verify a quick service-role query works (e.g. the restore-smoke DB checks against PROD).

> **Note:** JWT secret rotation invalidates all active user sessions. Users will be signed out and must log in again. Announce planned maintenance if possible, or follow §4 for targeted revocation.

### 3.2 `AUDIT_HMAC_SECRET`

The HMAC secret is used by `netlify/functions/audit-hmac.ts` to sign the tail of each tenant's audit chain (T87). Rotation breaks the ability to verify HMACs computed with the old secret.

**Impact of rotation:** existing HMAC signatures stored by tenants (e.g. exported as part of an audit report) will no longer be verifiable with the new secret. The tamper-evidence of the chain itself (cyrb53 links) and the append-only RLS are unaffected.

**Steps**

1. Generate a new 32-byte random hex secret:

   ```bash
   openssl rand -hex 32
   ```

2. In Netlify, update `AUDIT_HMAC_SECRET` with the new value.
3. Trigger a Netlify deploy.
4. Verify the endpoint responds correctly: send a valid POST to `/.netlify/functions/audit-hmac` and confirm `{ hmac: "<hex>", algorithm: "hmac-sha256" }` is returned.
5. Notify affected tenants (via platform broadcast T253) that previously exported audit HMACs were signed with the old key and should be re-fetched if they need external verification.

**Optional external anchoring:** before rotating, publish the current chain tail HMAC for each active tenant to a trusted out-of-band store (email digest, Supabase `audit_anchors` table with a timestamp) so the old signatures remain verifiable against a published reference.

### 3.3 `TELEGRAM_BOT_TOKEN` and webhook secret

**Steps**

1. Open a chat with `@BotFather` on Telegram.
2. Send `/revoke` and select the bot (`vecini_online_bot` or similar). BotFather issues a new token and invalidates the old one immediately.
3. Copy the new token.
4. In Netlify, update `TELEGRAM_BOT_TOKEN` with the new value.
5. The Telegram webhook URL is registered via the Bot API. Re-register the webhook with the new token (the webhook secret is a separate string you supply — generate a new one if desired):

   ```bash
   curl -X POST "https://api.telegram.org/bot<NEW_TOKEN>/setWebhook" \
     -d "url=https://vecini.online/.netlify/functions/telegram-webhook" \
     -d "secret_token=<NEW_WEBHOOK_SECRET>"
   ```

6. If you generated a new webhook secret, update it in Netlify env vars (the variable name used by the function is `TELEGRAM_WEBHOOK_SECRET`).
7. Trigger a Netlify deploy.
8. Send `/start` to the bot and confirm it responds normally.

### 3.4 `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET`

**Steps**

1. Open **Resend dashboard > API Keys**.
2. Create a new API key with the same permissions as the current one.
3. In Netlify, update `RESEND_API_KEY` with the new key.
4. If rotating the webhook secret too: open **Resend dashboard > Webhooks**, delete the existing webhook endpoint, and re-create it pointing to `https://vecini.online/.netlify/functions/resend-webhook` with a new signing secret. Update `RESEND_WEBHOOK_SECRET` in Netlify.
5. Trigger a Netlify deploy.
6. Send a test invite (e.g. re-send a pending invite from the platform console) and verify the email arrives and the Resend dashboard shows a successful delivery.
7. Revoke the old API key in the Resend dashboard once the new key is confirmed working.

---

## 4. JWT / session emergency revocation

Use when a user account is compromised or a token is suspected stolen.

### 4.1 Revoke a single user's sessions

Via the Supabase Admin API (service-role required):

```bash
curl -X DELETE "https://<project-ref>.supabase.co/auth/v1/admin/users/<user-id>/sessions" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

This invalidates all refresh tokens for that user. Their existing access tokens remain valid until they expire (default 1 hour), so if a stolen token is being actively used, also use 4.2.

### 4.2 Revoke ALL sessions (nuclear option)

Rotate the JWT secret as described in §3.1. This invalidates all access and refresh tokens for every user immediately. Reserve for: confirmed breach of the JWT secret itself, or a systemic compromise where individual revocation is impractical.

### 4.3 Revoke a platform admin's access

1. From the Supabase dashboard, sign in as a super admin.
2. Go to **Authentication > Users**, locate the user, and click **Delete user** (or use **Revoke access** if you want to preserve the account).
3. Remove the corresponding row from `platform_admins` (the last-admin guard in `platform-team-revoke.ts` enforces this server-side; do it directly in the DB for emergencies).
4. Audit the `platform_auth_audit` table for recent sign-ins from that account to assess exposure.

---

## 5. Escalation contacts

| Role | Contact |
|------|---------|
| Primary operator | cristiconstantinescu88@gmail.com |
| Supabase support | https://supabase.com/dashboard/support |
| Netlify support | https://www.netlify.com/support/ |
| Resend support | https://resend.com/support |

---

## 6. External uptime monitoring

Point an external uptime monitor (UptimeRobot, BetterUptime, or similar) at:

```
https://vecini.online/.netlify/functions/health
```

- **Check interval:** 5 minutes
- **Alert on:** HTTP status != 200 for 2 consecutive checks
- **Alert target:** primary operator email (see §5)
- **Expected response:** `{"status":"ok","stage":"prod"}`

The `health-probe.ts` scheduled function (T261) also performs an internal liveness check and reports anomalies to the platform error stream.

---

*Last updated: 2026-06-06 (T276)*
