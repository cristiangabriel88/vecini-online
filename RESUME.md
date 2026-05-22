# RESUME — IntreVecini

A quick-start status summary so work can resume without re-reading the full spec.
Sourced from `DECISIONS.md` and `FEATURES.md` (both live at the repo root, not
under `docs/`, despite references to the contrary). The product ships as
**IntreVecini**; the docs use the earlier working title **BlocHub** but remain
accurate for architecture/data/feature specs.

> Scope note: the spec defines **65 features (F01–F65)**. This codebase is a
> production-shaped *foundation*: buildable, type-safe, lint-clean, unit-tested,
> with features being built end-to-end batch by batch and the rest registered,
> toggleable, and backed by schema so the platform is complete in shape.

---

> **Next work is driven by `BACKLOG.md`** (the ordered task queue) via the
> autonomous `make progress` protocol in `CLAUDE.md`. Trigger it by typing
> `make progress` (one task) or running `scripts/run-overnight.ps1` (continuous,
> unattended). Section 4 below is historical context, not the live queue.

## 0. Current status (updated 2026-05-22)

- **Overall completion: 64 / 65 features built end-to-end (≈98%).**
- **Completed this turn (1): F10 AGA digitală** — the formal General Assembly
  (Legea 196/2018). A comitet convokes an assembly (datetime, location or online)
  and adds agenda items; the lifecycle runs convocată → în desfășurare →
  încheiată via an advance-status button. A live **quorum tracker** shows
  represented apartments vs. the required percent, fed by each resident's **RSVP**
  (prezent / procură / absent — a proxy still represents an apartment). While an
  assembly is in progress, residents **vote per agenda item** (pentru / contra /
  abținere) with live tally bars; each item carries a **majority rule** (simplă /
  absolută / două treimi, reused from the polls engine) that, once quorum is met,
  resolves the item to adoptat / respins / în-așteptare. A concluded assembly
  offers a one-tap **proces-verbal** download (structured Romanian minutes as
  plain text — see `DECISIONS.md` for why text not a rendered PDF). Wired
  end-to-end: `agaLogic` (quorum/present/tally/percent/outcome/sort/lifecycle/PV,
  14 unit tests) + `agaStore` + `AgaPage` + registry toggle flipped + route `aga`
  + `/aga` bot command + RO/EN locales + three demo assemblies (live/upcoming/
  concluded) + additive owner-RLS migration (batch5) for resident RSVP + vote +
  one E2E happy-path (vote on a live item).
- **Previously:** Help assistant (cross-cutting, not a numbered
  feature) — a floating corner chat widget that answers "what is X / how do I X /
  where is X" using a **local, rule-based grounded matcher (no LLM, no network)**.
  It returns only pre-written, role-filtered answers from a knowledge base derived
  from the feature registry (+ a few how-to/concept entries), so it cannot
  hallucinate or leak; "no admin access" is enforced by filtering entries to the
  viewer's role (demo/unknown → resident) and only describing enabled features,
  and it is info-only. It also answers **concrete data lookups** (e.g. "numărul
  de telefon al președintelui") from user-visible sources only — emergency
  contacts (F56) and the opt-in directory (F36) through the existing
  `visibleEntry` consent mask — with prefix matching for Romanian inflections.
  Bilingual RO/EN. Files under `src/features/assistant/*` (`knowledge`/`match`/
  `visibility`/`engine`/`dataSources` + `AssistantWidget`) + `assistantStore` +
  `assistant.css`, mounted in `AppLayout`, with match + visibility + data-lookup
  unit tests (incl. a consent-masking privacy test). A **human-feel layer** (also
  fully non-generative, so still jailbreak-proof) adds small talk (`smalltalk.ts`:
  greetings/thanks/identity/capabilities), turn-seeded varied phrasing of social/
  clarify/fallback lines, typo tolerance (bounded one-edit incl. transposition),
  "la care te referi?" clarification on near-ties, and a brief typing indicator;
  factual answers stay concise. **Phase 2 (planned):** broaden live data answers
  and swap `dataSources` to Supabase under RLS.
- **Previously (F21):** Sesizări recurente — a comitet/admin view
  computed entirely over `tickets` (no table of its own). The detector groups
  recent tickets by category+location (accent/case-insensitive), surfaces any
  group that repeats ≥3 times within a 90-day window, takes the max severity,
  and suggests a course of action (severity≥high or ≥4 occurrences → structural
  fix; otherwise routine maintenance). The page shows an attention banner with
  the active-pattern count, per-pattern cards (count badge, severity, first/last
  date range, colour-coded recommendation), and a mark-known/reactivate toggle
  that floats acknowledged patterns faded to the bottom. Wired end-to-end (logic
  module + small acknowledgement Zustand store + page + registry toggle + route
  `sesizari-recurente` + `/sesizari_recurente` bot command + RO/EN locales with
  plural forms + recurring demo tickets + 11 unit tests + one E2E). Seeded
  `DEMO_TICKETS` with a recurring lift breakdown (structural) and a recurring
  stairwell light fault (maintenance) so the demo shows live patterns.
- **Previously (F49+F50):** Cod de siguranță + Plan de evacuare — the safety
  pair (`safety` + `evacuation` slices).
- **Previously (F41+F42):** Urmărire proiecte + Jurnal foto lucrări — `projects`
  + `photojournal` slices sharing the `projects` domain.
- **Previously (F64):** Activități copii și adolescenți — `kids` slice
  (privacy-preserving children registry + coordinated activities).
- **Previously (F62):** Kit de bun-venit — `welcomekit` slice (new-resident
  onboarding checklist with progress bar + comitet add/delete steps).
- **Previously (F04):** Mesagerie privată cu administratorul — `adminchat` slice
  (private resident↔admin channel, chat timeline, SLA hint, resolve/reopen).
- **Previously (F27):** Rezervare sală comună / terasă — `venue` slice on the
  F25/F26 booking pattern. Note: the working tree is clean — F21, the help
  assistant, and all earlier slices are committed (latest: `bfabf0e` help
  assistant; `83119ed` F21 + polish).
- **Pipeline:** `npm run lint`, `npm run typecheck`, `npm test` (69 files / 329
  unit tests), and `npm run build` all pass.
- **Remaining (1):** F35 (Apartament info — a read-only aggregation over
  apartments/readings/tickets/votes, no new table).
- **Planned for the future (2, not yet specced into schema):** F66 Profil complet
  (rich full-page profile editor — photo + structured standard fields + user-added
  typed custom fields via a `+ Adaugă câmp` button) and F67 Acasă personalizabil
  (pencil-icon edit mode on the home screen to show/hide, reorder and size the
  feature cards each resident wants). These are new Category 9 entries in
  `FEATURES.md`, marked ⬜ planned.
- **Source of truth:** the **FEATURES.md** tracking table (legend: ✅ UI done ·
  🟦 schema-only) is authoritative for per-feature status — sections 2–3 below are
  historical and undercount what's shipped. Trust the table.
- **Blockers:** none. Playwright browser binaries still can't be downloaded in
  the build sandbox, so E2E specs are written/wired but executed only locally/CI.

---

## 1. Scaffolding — done

- **Build & tooling:** Vite 6 + React + TypeScript, Tailwind, ESLint (clean),
  Vitest 3 (passing). `tsc -p tsconfig.app.json` + `tsconfig.node.json --noEmit`
  type checks (deliberately avoids `tsc -b` project references).
- **App structure:** feature-sliced `src/` — `src/app`, `src/features/*`
  (admin, alerts, announcements, auth, emergency, events, home, onboarding,
  polls, profile, tickets), `src/shared/*` (components, demo, features, lib,
  locales, store, types, styles).
- **Database:** complete schema with RLS for **all 65 features' tables** in
  `supabase/migrations/` (`..._init_core`, `..._features`, `..._storage`),
  plus `supabase/seed.sql`. Full-text (GIN) search where relevant.
- **State management:** React Query for server/async state; per-feature Zustand
  stores seeded from `src/shared/demo/demoData.ts`; persisted `featureStore`
  feature-flag store (hydrated from `asociatie_features` when a backend exists).
- **Demo mode:** app detects missing Supabase creds (`isSupabaseConfigured`) and
  runs fully offline on seeded Romanian sample data — no backend needed to demo
  or E2E-test. No mock data ships in the Supabase path.
- **Telegram:** Netlify function `netlify/functions/telegram-webhook.ts` with
  secret verification + Mini App `initData` validation (both unit-tested via
  shared `telegramAuth` helpers); command/callback routing skeleton.
- **i18n:** single `translation` namespace per locale (`ro.json`, `en.json`);
  Romanian is source of truth, English covers the admin surface.
- **Security:** stored HTML routed through `sanitizeHtml` (DOMPurify, strict
  allowlist) before `dangerouslySetInnerHTML`.
- **Bundle:** `manualChunks` vendor splitting, lazy-loaded feature pages,
  tree-shaken `Icon` component. Initial route ~190 KB gzipped (< 250 KB budget).
- **Tests:** unit suite under `tests/unit/` (csv, format, inviteCode, pollLogic,
  telegramAuth, ticketLogic) runs and passes. E2E (`tests/e2e/smoke.spec.ts`)
  + `playwright.config.ts` are complete but **not executed** in the build
  sandbox (Playwright browser binaries couldn't be downloaded).
- **Cross-cutting UI:** auth/login, home feed, hubs, profile, 5-step onboarding
  wizard, apartment registry, and the admin feature-flag panel.

## 2. Features — implemented (UI end-to-end)

6 of 65 are fully interactive:

| Key | Title | What works |
|-----|-------|-----------|
| F01 | Anunțuri oficiale | Compose/publish, categories, read receipts, DOMPurify-sanitized HTML |
| F03 | Alertă de bloc (urgență) | Send flow with double-confirm bypassing quiet hours; recipient count |
| F08 | Calendar de evenimente | Upcoming list, RSVP toggle, counts |
| F09 | Vot rapid pe propuneri | Vote with confirm, live bars; quorum/majority tally logic unit-tested |
| F17 | Sesizări cu foto | Create with severity/category/location; SLA logic unit-tested; status badges |
| F56 | Numere de urgență localizate | Tap-to-call list, seeded contacts |

## 3. Features — remaining (schema + RLS + toggle only, no UI)

The other **59 features (F02, F04–F07, F10–F16, F18–F55, F57–F65)** each have
their database table(s) with RLS and appear in the admin toggles and navigation,
but opening one shows a clear "registered, page not in this build" state (no fake
data). See the tracking table in `FEATURES.md` (legend: ✅ UI done · 🟦 schema-only).

Notable clusters still to build:
- **Communication:** F02 discuții moderate, F04 mesagerie privată admin, F05
  mesaj anonim, F06 anunțuri vecini, F07 FAQ
- **Governance/voting:** F10 AGA digitală (Legea 196/2018 compliance, PV PDF),
  F11 procese verbale, F12 buget participativ, F13–F16
- **Maintenance:** F18 istoric reparații, F19 service programat, F20 citire
  contoare, F21 recurente, F22 RFP, F23 gardă, F24 împrumut
- **Shared spaces:** F25–F32 (rezervări, parcare, biciclete, boxe, curier)
- **Records:** F33–F40 (documente, furnizori, wiki, glosar, directories)
- **Projects:** F41–F48 (tracker, foto, contractori, crowdfunding, plan multianual)
- **Safety/compliance:** F49–F55 (coduri siguranță, evacuare, PSI, asigurare, chei)
- **Community:** F57–F65 (marketplace, carpool, sitting, barter, group buys,
  welcome kit, aniversări, copii, feedback)
- **Computed (no UI yet):** F46 fond reparații calculator helper

## 4. What to do next

1. **Run E2E once locally/in CI** — install Playwright browsers (blocked in the
   build sandbox) and execute `tests/e2e/` against demo mode to lock the baseline.
2. **Provision Supabase** — apply the three migrations + `seed.sql`, set creds so
   `isSupabaseConfigured` flips the app off demo mode, and smoke-test that the 6
   live features read/write against real tables and RLS.
3. **Wire the Telegram webhook** — deploy the Netlify function, register the bot
   webhook + Mini App, and verify `initData`/secret validation end-to-end.
4. **Build out the remaining feature**, reusing the established pattern
   (logic module → Zustand demo store seeded from `demoData.ts` → feature page →
   `registry.ts` toggle flipped to `implemented` → route → `/command` bot help →
   RO/EN locales → unit test → one E2E happy-path).
   - **F10 AGA digitală** — carries Legea 196/2018 compliance + PV PDF
     generation weight; implement it alone in its own session.
   - *(Done: F41 Project tracker + F42 Project photo journal — `projects` +
     `photojournal` slices. F49 Cod de siguranță + F50 Plan de evacuare —
     `safety` + `evacuation` slices. F21 Sesizări recurente — `recurring`
     slice, computed over `tickets`.)*
5. **Fill the last computed view** (F35 apartament info over
   apartments/readings/tickets/votes) — a read-only aggregation, no new table.
   *(Done: F21 recurring-ticket detection over `tickets`.)*

---
*Generated 2026-05-21 from `DECISIONS.md` and `FEATURES.md`.*
