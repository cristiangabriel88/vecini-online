# Launch checklist -- vecini.online

Manual smoke-test plan to run **before flipping the live switch** on a pilot building.
Run `npm run preflight` first; this checklist assumes the automated gate is green.

No accounts, no deployments, no external secrets are required for the steps marked **(DEMO)**.
Steps marked **(LIVE)** require a provisioned building and real Supabase credentials.

---

## 1. Preflight gate (automated)

- [ ] `npm run preflight` exits 0 (lint + typecheck + tests + all 3 builds + bundle budgets + dep audit green)

---

## 2. Authentication

- [ ] **(DEMO)** Open the app in demo mode; the login screen loads with correct RO strings and no console errors
- [ ] **(DEMO)** Switch language to EN; all login-screen strings flip to English
- [ ] **(LIVE)** Log in with valid admin credentials; redirect to dashboard
- [ ] **(LIVE)** Log in with invalid password; error message shown (non-leaky, no account-exists leak)
- [ ] **(LIVE)** MFA: request OTP, receive code, enter correct code -> session established
- [ ] **(LIVE)** MFA: enter wrong OTP 5 times -> lockout message shown with retry-after time
- [ ] **(LIVE)** Log out; session cleared, redirected to login

---

## 3. Onboard a building (LIVE)

- [ ] Platform admin provisions a new building via the platform console
- [ ] First admin receives invite email; clicks the link, sets password and MFA
- [ ] Admin is redirected to the dashboard; the "get started" checklist is visible
- [ ] Admin adds at least one apartment via the apartment form
- [ ] "Add apartments" checklist item ticks off automatically
- [ ] Admin invites a resident via the invite flow; invite email is sent
- [ ] Resident redeems the invite, sets password, lands in the app
- [ ] "Invite residents" checklist item ticks off automatically
- [ ] Admin dismisses the checklist; dismissal persists across a page refresh

---

## 4. Announcements

- [ ] **(DEMO)** Admin posts a new announcement in RO; it appears in the list immediately
- [ ] **(DEMO)** Switch to EN; announcement title/body remain as entered (user content, not translated)
- [ ] **(LIVE)** Announcement appears in the resident view

---

## 5. Vote / AGA

- [ ] **(DEMO)** Create a new vote with a deadline and two options
- [ ] **(DEMO)** Cast a vote as a resident; confirmation shown
- [ ] **(DEMO)** Attempt to vote again; duplicate vote rejected with a bilingual error
- [ ] **(DEMO)** Vote closes at deadline; results displayed with quorum indicator

---

## 6. GDPR data export

- [ ] **(DEMO)** Open "My data" page; personal data summary loads
- [ ] **(DEMO)** Trigger "Export my data"; CSV/JSON download starts and contains expected fields
- [ ] **(LIVE)** Request erasure; confirmation prompt shown; submission accepted

---

## 7. Language switching

- [ ] Start in RO; every main nav item and page heading is in Romanian with correct diacritics
- [ ] Switch to EN; every main nav item and page heading flips to English
- [ ] Reload the page; chosen language persists
- [ ] Date formats: RO shows DD.MM.YYYY, EN shows locale-appropriate format
- [ ] Currency: amounts display as `1.234,56 lei` in both locales

---

## 8. PWA install

- [ ] Open the app in Chrome/Edge on Android or desktop
- [ ] "Install app" prompt appears (or install icon visible in address bar)
- [ ] Install the PWA; app opens in standalone window
- [ ] Offline: disable network; previously-visited pages load from cache
- [ ] Online: reconnect; app syncs without requiring a manual refresh

---

## 9. Tenant isolation spot-check (LIVE)

- [ ] Log in as admin of building A; navigate to any list (apartments, announcements, votes)
- [ ] Manually craft a request with the building B `asociatie_id`; response contains no building B data

---

## 10. Performance spot-check

- [ ] Open Chrome DevTools -> Network -> throttle to Slow 3G
- [ ] Hard-reload the app; first meaningful paint within ~8 s (target; based on T287 246 kB gzip baseline)
- [ ] On a low-memory device or with DevTools CPU 4x slowdown: lite mode prompt appears or auto-applies

---

## 11. Admin platform console (LIVE -- platform admin)

- [ ] Log into the platform console subdomain
- [ ] Buildings list loads; tenant data is scoped (no cross-tenant leakage)
- [ ] Provision a new building; lifecycle event appears in the audit log
- [ ] Audit log chain verifies as intact (no "tampered" indicators)

---

## Sign-off

| Step | Tester | Date | Result |
|------|--------|------|--------|
| Preflight gate | | | |
| Authentication | | | |
| Onboard a building | | | |
| Announcements | | | |
| Vote / AGA | | | |
| GDPR export | | | |
| Language switching | | | |
| PWA install | | | |
| Tenant isolation | | | |
| Performance | | | |
| Platform console | | | |

**Overall: GO / NO GO**
