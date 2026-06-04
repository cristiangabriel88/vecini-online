# Features — vecini.online

Every feature below has a unique key (F01-F67). The admin can toggle each one on or off during onboarding and at any time afterwards.

> **Canonical status lives in the "Implementation tracking" table near the bottom of this file**, not on the spec headings below. The headings in this catalog are the original product spec (what the feature should do); the table records what is actually built and how far it is wired live.

Each feature follows this structure:
- **Key:** F##
- **Title:** short name
- **Audience:** who sees it (admin / comitet / proprietar / chiriaș)
- **Description:** what it does
- **Acceptance:** what "done" looks like
- **Telegram:** how it works in the bot
- **Data:** main tables touched

---

## Category 1 — Communication (F01-F08)

### F01 — Anunțuri oficiale
- **Implementation:** compose/publish + read receipts + category badges, scoped per active asociație (T47): `announcementsLogic` (pure, unit-tested) + per-asociație `announcementsStore` (`byAsociatie`, seeded for demo) + `useAsociatieAnnouncements()` selector. Demo store is the offline source of truth; live read/write against `announcements` under RLS is T57. Scheduled publish + PDF/image attachments shipped in T188 (scheduled rows held back until due, "Programat" to the comitet; attachments offline as data URLs, live via the `attachments` Storage bucket + table with signed-URL download). Targeted broadcast remains a later refinement.
- **Audience:** admin/comitet write; everyone reads
- **Description:** Official building-wide announcements with read receipts. Supports rich text, attachments (PDF/images), and targeted broadcast (all / specific scara / specific floors / specific apartments). Each announcement has a category: `urgent`, `important`, `informativ`, `eveniment`.
- **Acceptance:** Admin can compose, preview, schedule, and publish. Residents see them in-app with unread badge and receive Telegram + email per their preferences. Read receipts show "X din Y locatari au citit". Urgent announcements bypass quiet hours.
- **Telegram:** Bot posts the announcement to each linked user. Inline "Marchează ca citit" button. `/anunturi` shows recent.
- **Data:** `announcements`, `announcement_reads`, `attachments`

### F02 — Canal de discuții moderat
- **Audience:** all residents
- **Description:** A general chat channel where residents can discuss informally. Moderated by comitet — they can pin messages, delete inappropriate ones, mute users temporarily. Optional: topic threads (`#parcare`, `#curățenie`, `#vecini`).
- **Acceptance:** Threaded discussions with reactions. Moderator tools work. Anti-spam: rate limiting per user (max 10 messages/hour for new users, raised after vetting).
- **Telegram:** Mirrored as a Telegram group with the bot as admin; or in-app only — admin choice per asociație.
- **Data:** `discussion_threads`, `discussion_messages`, `moderation_actions`

### F03 — Alertă de bloc (urgență)
- **Audience:** everyone receives; comitet/admin sends
- **Description:** Emergency broadcast (gaz, apă spartă, foc, evacuare). Bypasses quiet hours and notification preferences. Reaches every channel simultaneously (in-app push, Telegram with sound, email, optional SMS via Twilio if configured).
- **Acceptance:** Confirmation modal before sending (because it overrides preferences). Counter shows "Alertă trimisă la X persoane". Acknowledgment buttons let people confirm they're safe / aware.
- **Telegram:** Special formatting (🚨), pinned in chat, force-notification.
- **Implementation:** `alertsLogic` (pure, unit-tested: `seedAlerts`/`alertsForAsociatie`/`newAlert`/`addAlertIn`/`migrateAlertsState`, `isSendableAlert`, `recipientCount(apartments)` summing residents across active apartments, `shouldDeliverAlert` quiet-hours bypass over the urgent-priority path) + per-asociație seeded + persisted `alertsStore` (`byAsociatie`, `useAsociatieAlerts`) + dual-mode `alertsApi` (`hydrateAlerts`/`sendAlert`, mirrors to `alerts` under standard RLS when Supabase is configured, offline store as fallback). The page hydrates on mount, derives the recipient count from `useAsociatieApartments()`, and surfaces a live-fetch `ErrorState` with retry. (T184)
- **Data:** `alerts`, `alert_acknowledgments`

### F04 — Mesagerie privată cu administratorul
- **Audience:** proprietar/chiriaș ↔ admin/președinte
- **Description:** Direct private channel between a resident and the administrator (not the comitet). For personal financial questions, sensitive complaints, etc.
- **Acceptance:** Threaded conversation, read receipts. Role-aware inbox: the administrator (and președinte) sees every resident's thread (per apartment) with unread and "awaiting reply" hints and can open any one or start a new thread toward a chosen apartment; a resident sees only their own threads. Opening a message shows that conversation (master/detail) and marks the other side's messages read.
- **Implementation:** `adminChatLogic` (pure, unit-tested: `unreadFor`, `awaitingReply`/`waitingHours`, `sortThreads`, `threadParticipantLabel`) + per-asociație `adminChatStore` (`byAsociatie`, seeded for demo, persisted) + `useAsociatieThreads()` selector. The page branches on `activeRole`. Dual-mode `adminChatApi` mirrors writes to `private_threads`/`private_messages` and hydrates reads when Supabase is configured; private content is never written to the audit log. Custom RLS (migration `20260525000002`) keeps a resident's threads private to them and the administrator. Superadmin→association messaging is deferred (T99).
- **Telegram:** `/contact_admin` opens a thread; replies routed both ways.
- **Data:** `private_threads`, `private_messages`

### F05 — Mesaj anonim către comitet
- **Audience:** any resident → comitet
- **Description:** A resident can submit a message visible to comitet members but with their identity hidden from comitet. The system knows the sender (for abuse prevention) but only platform super_admin can de-anonymize, and only with an audit log entry.
- **Acceptance:** Submission form, comitet sees a queue of anonymous messages, can mark resolved.
- **Telegram:** `/anonim` opens guided composition.
- **Data:** `anonymous_messages`

### F06 — Anunțuri vecini (locator)
- **Audience:** all residents
- **Description:** Neighbor-to-neighbor announcements that aren't official. "Vând bicicletă", "Caut o pisică pierdută", "Vine bunica săptămâna viitoare, eventuale geamuri trântite". Has categories and 14-day expiry.
- **Acceptance:** Compose, photo upload, category select. Auto-archive after 14 days. Resident can edit/delete their own.
- **Telegram:** `/locator_new` to post, `/locator` to browse.
- **Data:** `resident_posts`

### F07 — Întrebări frecvente (FAQ)
- **Audience:** all residents
- **Description:** Searchable FAQ maintained by admin. Reduces repetitive questions to administrator ("când vine apa caldă", "cum se citește contorul").
- **Acceptance:** Categorized, search, helpful/not-helpful voting to highlight quality.
- **Telegram:** `/faq` shows top categories, inline navigation.
- **Data:** `faq_entries`, `faq_votes`

### F08 — Calendar de evenimente
- **Audience:** all residents
- **Description:** Asociație events (AGA, curățenie generală, foc de tabără în curte, vizita firmei de deratizare). Residents see upcoming events, RSVP, get reminders.
- **Acceptance:** Month/week/agenda view, ICS export, RSVP counts visible to organizer.
- **Telegram:** `/evenimente`, daily morning digest of today's events.
- **Data:** `events`, `event_rsvps`

---

## Category 2 — Governance & Voting (F09-F16)

### F09 — Vot rapid pe propuneri
- **Audience:** proprietari vote; admin/comitet create
- **Description:** Quick polls for proposals not requiring formal AGA. Options: simple Yes/No/Abstain, multiple-choice, ranked-choice. Configurable quorum and majority rules. One vote per apartament (weighted by cota_parte if enabled).
- **Acceptance:** Vote anonymous to other voters but auditable by cenzor. Live progress bar (counts only, not individual votes). Auto-close on deadline. Results published with breakdown by scara/etaj.
- **Telegram:** Inline keyboard with options. Confirmation step. `/voturi_active`.
- **Data:** `polls`, `poll_options`, `votes`

### F10 — AGA digitală (Adunarea Generală)
- **Audience:** all proprietari
- **Description:** Formal General Assembly with convocator (notice), agenda, document attachments, RSVPs, proxy votes (procură), live voting on each agenda item, quorum tracking per Legea 196/2018.
- **Acceptance:** Compliant with Romanian law for valid AGA. Procură upload with admin verification. Generates legally-valid process verbal as PDF after the meeting.
- **Telegram:** Reminders, RSVP buttons, live vote prompts during meeting.
- **Data:** `agas`, `aga_agenda_items`, `aga_attendees`, `aga_proxies`, `aga_votes`

### F11 — Procese verbale (arhivă)
- **Audience:** all proprietari read; comitet uploads
- **Description:** Searchable archive of all signed procese verbale (AGA, comitet meetings, decisions). PDF storage with full-text search.
- **Acceptance:** Upload, OCR (if scanned), search by content, sort by date, download.
- **Telegram:** `/procese_verbale` lists recent, links to web view.
- **Data:** `pv_documents`, with full-text index

### F12 — Buget participativ
- **Audience:** proprietari vote; admin sets pool
- **Description:** Admin allocates a discretionary annual fund (e.g., 5000 lei). Residents submit proposals (plant trees, buy benches, holiday decorations). Two-phase: idea submission (2 weeks) → voting (2 weeks). Top-voted within budget are funded.
- **Acceptance:** Submission form with cost estimate, voting phase with budget tracker showing "rămân 2400 lei".
- **Telegram:** `/buget_propune`, `/buget_voteaza`.
- **Data:** `budget_cycles`, `budget_proposals`, `budget_votes`

### F13 — Prioritizare proiecte mari
- **Audience:** proprietari
- **Description:** Drag-and-drop ranking of major renovation projects (acoperiș, fațadă, lift, parcare). Used by comitet for decision-making before formal AGA proposal.
- **Acceptance:** Ranked-choice voting, aggregated ranking shown after deadline.
- **Telegram:** Inline keyboard with up/down arrows per project.
- **Data:** `project_priorities`, `priority_rankings`

### F14 — Cutie de idei
- **Audience:** all residents
- **Description:** Open submission of any idea/suggestion. Other residents upvote. Top 10 each quarter automatically promoted to comitet agenda for review.
- **Acceptance:** Submission, voting (one vote per apartament), comments, status (`în discuție`, `aprobat`, `implementat`, `respins`).
- **Telegram:** `/idei`, `/idei_propune`.
- **Data:** `ideas`, `idea_votes`, `idea_comments`

### F15 — Sondaje de opinie (non-binding)
- **Audience:** all residents
- **Description:** Casual non-binding surveys ("ce culoare să aibă noua fațadă?"). Lower friction than formal polls. Anonymous by default.
- **Acceptance:** Quick create, results visible during/after, no quorum requirement.
- **Telegram:** `/sondaje`.
- **Data:** `surveys`, `survey_responses`

### F16 — Petiții interne
- **Audience:** residents collect signatures
- **Description:** A resident can start a petition ("cerem schimbarea firmei de curățenie"). Other residents sign. At a threshold (configurable, default 25% of apartments), it's automatically forwarded to the comitet for response.
- **Acceptance:** Create, sign, share. Threshold reached → notification to comitet with response deadline. Public response published.
- **Telegram:** `/petitii`, sign inline.
- **Data:** `petitions`, `petition_signatures`

---

## Category 3 — Maintenance & Issues (F17-F24)

### F17 — Sesizări cu foto
- **Audience:** any resident submits; comitet/admin handles
- **Description:** Report a problem (bec ars, lift stricat, geam spart, infiltrație) with photos, location (scara, etaj, descriere), category, severity. Auto-routes to administrator with status tracking: `primit` → `asignat` → `în lucru` → `rezolvat` → `verificat`.
- **Acceptance:** Photo upload (max 5), location picker, SLA timer based on severity, history log per ticket. Resident gets notified at each status change. Optional rating after resolution.
- **Telegram:** `/sesizare` guides through photo + form. Status updates pushed to original reporter.
- **Data:** `tickets`, `ticket_attachments`, `ticket_status_history`, `ticket_ratings`

### F18 — Istoric reparații (cunoaștere instituțională)
- **Audience:** comitet, proprietari (read), admin (write)
- **Description:** Searchable log of all major repairs ever made. When something breaks again ("când a fost ultima dată schimbată pompa de la hidrofor?"), the answer is there. Includes contractor, cost, warranty info, photos.
- **Acceptance:** Search, filter by system (apă, electric, lift, încălzire), warranty alerts ("garanția expiră în 30 de zile").
- **Telegram:** `/istoric_reparatii` with search.
- **Data:** `repair_records`

### F19 — Calendar service-uri programate
- **Audience:** all residents (see), admin (manage)
- **Description:** Scheduled maintenance: revizie centrală termică, verificare ISCIR la lift, curățare jgheaburi, deratizare, verificare PSI. Automatic reminders to admin (30/7/1 days before) and to residents the day before.
- **Acceptance:** Recurring schedule, vendor info, last/next dates, auto-notify residents to clear access on the day.
- **Telegram:** Daily morning digest mentions today's scheduled services.
- **Data:** `scheduled_maintenance`, `maintenance_log`

### F20 — Citire contoare
- **Audience:** proprietari submit; admin reviews
- **Description:** Monthly submission of utility meter readings (apă rece, apă caldă, gaz, încălzire) with photo for verification. Auto-reminder window (e.g., 1-5 of each month).
- **Acceptance:** Photo + value, validation (must be ≥ previous reading), admin review queue, export to CSV for the contabil. Anomaly detection flags suspicious jumps.
- **Telegram:** Monthly reminder DMs, `/contor` opens submission form.
- **Data:** `meters`, `meter_readings`

### F21 — Sesizări recurente (auto-detection)
- **Audience:** comitet, admin
- **Description:** System auto-detects patterns: same type of ticket in same location > 3 times in 3 months. Surfaces as "recurring issue" with suggested action: structural fix vs ongoing maintenance.
- **Acceptance:** Dashboard showing patterns. Admin can mark as known/resolved.
- **Telegram:** Weekly digest to comitet mentions recurring issues.
- **Data:** Uses `tickets` with computed view

### F22 — Solicitare oferte (contractor RFP)
- **Audience:** comitet, admin
- **Description:** When planning a repair, post an RFP. Residents can recommend contractors. Admin collects 3+ quotes, attaches them, comitet votes on selection. Audit trail for transparency.
- **Acceptance:** Post RFP, collect quotes (PDF attach), structured comparison, vote, decision record.
- **Telegram:** `/oferte` (comitet only) to view active RFPs.
- **Data:** `rfps`, `rfp_quotes`, `contractor_recommendations`

### F23 — Vecin de gardă (weekend rotation)
- **Audience:** volunteers
- **Description:** Rotating volunteer who handles small emergencies on weekends (let in emergency plumber, signs for collective deliveries). Bot manages rotation, residents see who's on duty this weekend, can DM them.
- **Acceptance:** Sign-up, schedule view, swap requests, no-show feedback.
- **Telegram:** `/garda` shows current and next person on duty.
- **Data:** `duty_volunteers`, `duty_schedule`

### F24 — Listă obiecte împrumutabile (sharing economy)
- **Audience:** all residents
- **Description:** Neighbors register tools/items they'll lend (bormașină, scară, aspirator de frunze, set de cabluri pentru pornit mașina). Searchable by category. Borrower DMs owner directly.
- **Acceptance:** Add item with photo, mark as borrowed/available, return reminder.
- **Telegram:** `/imprumut` search, `/imprumut_adauga` to list an item.
- **Data:** `lending_items`, `lending_records`

---

## Category 4 — Shared Spaces & Resources (F25-F32)

### F25 — Rezervare spălătorie / uscătorie
- **Audience:** all residents
- **Description:** For buildings with shared laundry: book time slots. Calendar view, max simultaneous bookings per apartament, no-show tracking.
- **Acceptance:** Pick day + slot, see availability, cancel with grace period. Reminders before slot.
- **Telegram:** `/spalatorie` shows availability, inline booking.
- **Data:** `bookable_resources`, `bookings`

### F26 — Rezervare lift pentru mutare
- **Audience:** all residents
- **Description:** Book elevator for moving furniture, so two families don't show up Saturday with trucks. Slot duration configurable (default 3h). Comitet must approve high-traffic times.
- **Acceptance:** Calendar, approval workflow if enabled, neighbor visibility ("mutare la et. 4 sâmbătă 10:00-13:00").
- **Telegram:** `/lift_mutare`.
- **Data:** `bookings` (with resource_type='elevator')

### F27 — Rezervare sală comună / terasă
- **Audience:** all residents
- **Description:** Book community room or rooftop terrace for events. Configurable rules (max duration, deposit, allowed activities).
- **Acceptance:** Calendar, terms acceptance, deposit tracking (manual flag, not payment), post-event inspection record.
- **Telegram:** `/sala`.
- **Data:** `bookings`, `bookable_resources`, `booking_inspections`

### F28 — Parcare
- **Audience:** all residents
- **Description:** Registry of who owns/uses which parking spot. If someone parks badly, others can DM the registered user anonymously via the bot (no phone numbers exposed). Optionally: assign visitor spots for booking.
- **Acceptance:** Parking spot map (admin-configured layout), license plate registration (private to admin + reporter), anonymous DM flow.
- **Telegram:** `/parcare` to look up by spot or plate number, opens DM bridge.
- **Data:** `parking_spots`, `parking_assignments`, `parking_reports`

### F29 — Bicicletăria
- **Audience:** all residents
- **Description:** Registry of bikes stored in the shared bike room. Each bike has an owner, photo, description, serial number. Helps recover stolen bikes and identify abandoned ones.
- **Acceptance:** Register bike, mark abandoned, comitet can request removal after grace period.
- **Telegram:** `/biciclete`.
- **Data:** `bikes`

### F30 — Boxa / dependinți
- **Audience:** all residents
- **Description:** Registry of storage rooms (boxe) — who owns which one, location, contents (optional declaration for insurance/dispute resolution).
- **Acceptance:** Map, ownership records, conflict resolution log.
- **Telegram:** `/boxe`.
- **Data:** `storage_units`

### F31 — Plante / spații verzi
- **Audience:** all residents
- **Description:** Volunteer schedule for watering shared plants, mowing the small lawn, tending the curtea blocului. Residents sign up for weeks/tasks.
- **Acceptance:** Calendar, task list, photos before/after.
- **Telegram:** `/plante` shows this week's volunteer.
- **Data:** `green_space_tasks`, `task_signups`

### F32 — Acces curierat (cod temporar interfon)
- **Audience:** resident generates; admin configures
- **Description:** If the interphone supports it, generate one-time code for couriers. Code expires in 30 min. Audit log of generated codes (so if abused, you can trace).
- **Acceptance:** Generate, display QR/code, share to courier via WhatsApp etc. Integration with interphone systems (Akuvox, BPT, Comelit) where possible; manual operator-validated for others.
- **Telegram:** `/curier`.
- **Data:** `access_codes`

---

## Category 5 — Information & Records (F33-F40)

### F33 — Document arhivă (regulamente, statut)
- **Audience:** comitet/admin upload + manage; all residents read + download
- **Description:** Repository of official documents: statutul asociației, regulamentul de ordine interioară, contracte cu furnizorii (apa, gaz, salubritate), documente cadastrale. Searchable. Role-gated real file upload: admin/presedinte/comitet can upload PDF/image/Word/Excel files (max 10 MB); all members see a download button on cards that have a file; delete with confirmation is also gated; upload/delete recorded in the audit trail. Offline (demo): files stored as base64 data URLs in the persisted `vecini.documents` Zustand store. Live (T89): files stored in the `documents` Supabase Storage bucket at `<asociatie_id>/<doc_id>/<filename>`; downloads served via 1-hour signed URLs; Storage + DB row cleaned up on delete; `DocumentsPage` hydrates from DB on mount.
- **Acceptance:** Upload (role-gated), categorize, search, version history, download, delete.
- **Telegram:** `/documente` shows categories.
- **Data:** `documents` (+ `file_name/file_size/file_type/file_data_url`; `storage_path` in Supabase Storage bucket `documents`, provisioned by `supabase/migrations/20260121000003_storage.sql`)

### F34 — Furnizori / contracte
- **Audience:** comitet, admin write; all read
- **Description:** Catalog of suppliers (electricitate, gaz, apă, salubritate, internet, telecabină, întreținere lift). Each has contract dates, contact, account number, last invoice date, complaint history.
- **Acceptance:** Search, contract expiry alerts, complaint tracking.
- **Telegram:** `/furnizori`.
- **Data:** `suppliers`, `supplier_complaints`

### F35 — Apartament info (per locator)
- **Audience:** owner of apartament
- **Description:** Each apartament has its own info page: history of meter readings, payments status (without amounts if F-finance off), tickets submitted, votes cast, documents specific to this apartment (e.g., certificat energetic).
- **Acceptance:** Owner sees only their apartment. Co-owners see shared view.
- **Telegram:** `/apartament_meu`.
- **Data:** views across `apartments`, `meter_readings`, `tickets`, `votes`
- **Admin registry (T114) ✅:** the admin side is now a full CRUD registry, not a
  read-only list. `/app/admin/apartamente` lists units with per-row edit (pencil to
  `/app/admin/apartamente/:id`) and delete; a first-login empty state leads to a
  bulk-add grid (`/app/admin/apartamente/adauga`) where the admin picks a count and
  fills entrance / floor / number / owner / area / cota-parte / people. Each
  apartment carries a named-occupant list (`persons`) plus the editable
  `numar_persoane` count. The building/association profile is editable at
  `/app/admin/cladire`. Works offline (persisted demo store) with a live Supabase
  path active when configured (T115).

### F36 — Locator directory
- **Audience:** all residents (opt-in)
- **Description:** Phone book of residents who opt-in to be listed. Useful for emergency contact between neighbors. Privacy-first: opt-in only, configurable what's visible (name, apartment, phone, email).
- **Acceptance:** Opt-in toggle per field, search by name or apartament.
- **Telegram:** `/vecini` shows opted-in list.
- **Data:** `resident_directory_consent`

### F37 — Pet directory (opțional)
- **Audience:** all residents (opt-in)
- **Description:** Owners register pets. Useful for finding pet sitters within the building, identifying whose cat is wandering, planning collective vet visits.
- **Acceptance:** Pet profile (name, species, photo, contact for emergencies). Lost & found channel.
- **Telegram:** `/animale`.
- **Data:** `pets`

### F38 — Carte de aur (mulțumiri)
- **Audience:** all
- **Description:** Public thank-you wall. "Mulțumesc lui Andrei de la 24 care a urcat sacii cu pământ ai bunicii". Builds community spirit.
- **Acceptance:** Post a thank-you tagging another resident, who can opt to receive notification.
- **Telegram:** `/multumeste`.
- **Data:** `thank_yous`

### F39 — Wiki bloc (cunoștințe locale)
- **Audience:** all read; comitet/admin edit; residents suggest edits
- **Description:** Collaborative wiki: "cum se închide apa pe toată scara", "unde e cheia de la pivniță", "ce trebuie să știi despre lift", "ce face dacă se ia curentul".
- **Acceptance:** Markdown editor, version history, suggested edits queue.
- **Telegram:** `/wiki` searches and shows top results.
- **Data:** `wiki_pages`, `wiki_revisions`, `wiki_suggested_edits`

### F40 — Glosar de termeni
- **Audience:** all
- **Description:** Definitions for jargon residents encounter (cota parte indiviză, fond de rulment, fond de reparații, cenzor, comitet). Helps newer residents understand bills and AGAs.
- **Acceptance:** Searchable, also tooltip in other features that use the term.
- **Telegram:** `/glosar termen`.
- **Data:** `glossary_entries`

---

## Category 6 — Projects & Major Works (F41-F48)

### F41 — Project tracker
- **Audience:** all residents read; comitet manages
- **Description:** For each major project (anvelopare, schimbare instalație electrică, reabilitare acoperiș): timeline, contractor, current phase, budget allocated vs spent, photos, document attachments.
- **Acceptance:** Gantt or phase view, percentage complete, residents can comment per phase.
- **Telegram:** `/proiecte`.
- **Data:** `projects`, `project_phases`, `project_updates`

### F42 — Project photo journal
- **Audience:** all
- **Description:** Time-lapse style photo journal of works in progress. Reduces gossip and builds transparency.
- **Acceptance:** Photo with date + caption + linked phase. Gallery view.
- **Telegram:** Photo posts from comitet auto-archived to project journal.
- **Data:** `project_photos`

### F43 — Contractor library
- **Audience:** comitet, admin
- **Description:** Database of vetted contractors from past projects. Quality rating (0-5), specialty, price tier, contact, last used, current availability. Comitet members rate after each job.
- **Acceptance:** Search by specialty, filter by rating, export.
- **Telegram:** `/contractori` (comitet only).
- **Data:** `contractors`, `contractor_ratings`

### F44 — Crowdfunding proiecte mici
- **Audience:** all
- **Description:** For projects that aren't legally required of all owners (a community vegetable garden, a children's playground accessory), residents can voluntarily contribute. Pledge tracking, public progress bar.
- **Acceptance:** Pledge (not payment — just commitment), tracker, post-project receipts.
- **Telegram:** `/crowdfund`.
- **Data:** `crowdfunds`, `pledges`

### F45 — Plan multianual de mentenanță
- **Audience:** all read; admin/comitet plan
- **Description:** 5-10 year plan for major works: when to repaint, replace pipes, refresh roof. Helps the asociație plan fond de reparații accumulation.
- **Acceptance:** Year-by-year roadmap, dependencies, estimated costs, residents can comment.
- **Telegram:** `/plan_multianual`.
- **Data:** `multiyear_plan_items`

### F46 — Recomandări fond de reparații
- **Audience:** all
- **Description:** Based on multi-year plan and building specs, suggests an appropriate fond de reparații monthly accumulation rate, with rationale.
- **Acceptance:** Calculator with inputs (m², year built, last major works), output recommendation, comparison to current rate.
- **Telegram:** Surfaced inline when discussing budget.
- **Data:** computed; no separate table

### F47 — Energy efficiency tracker
- **Audience:** all
- **Description:** Track building-wide energy consumption (heating, common-area lighting, lift). Shows year-over-year trends. Useful for evaluating anvelopare ROI.
- **Acceptance:** Monthly entry of bills, chart, comparison.
- **Telegram:** `/energie` shows last 12 months.
- **Data:** `energy_records`

### F48 — Garanție tracker
- **Audience:** comitet, admin
- **Description:** Tracks warranties on all installed equipment (lift, hidrofor, centrală termică comună, instalație de gaz). Alerts before warranty expiry so issues can be claimed in time.
- **Acceptance:** Add asset with purchase date + warranty length, scheduled alerts.
- **Telegram:** Weekly digest mentions warranties expiring soon.
- **Data:** `warranties`

---

## Category 7 — Safety & Compliance (F49-F56)

### F49 — Cod portari / vecini de încredere
- **Audience:** all
- **Description:** Trusted neighbor list for each apartament: "dacă sun, întreabă numele lui Andrei și uite parola X". Helps elderly residents avoid phone scams. Stored encrypted, only owner sees.
- **Acceptance:** Private to each owner, optional sharing to one trusted relative.
- **Telegram:** `/cod_siguranta` (private DM, never in group).
- **Data:** `safety_codes` (encrypted)

### F50 — Plan de evacuare
- **Audience:** all
- **Description:** Floor plan with evacuation routes, location of stingătoare, hidranți, ieșiri de urgență. Pet location markers so firefighters know where animals are.
- **Acceptance:** Uploadable per scara/etaj, interactive viewer, pet markers per apartament.
- **Telegram:** `/evacuare` sends the relevant plan as image.
- **Data:** `evacuation_plans`, `pet_markers`

### F51 — Verificări PSI (PSI compliance)
- **Audience:** comitet, admin
- **Description:** Track legally required fire safety checks: stingătoare (annual), hidranți (annual), instalație electrică (5 years). Alerts before due dates.
- **Acceptance:** Per-asset due dates, vendor records, compliance dashboard.
- **Telegram:** Monthly digest to comitet about upcoming PSI deadlines.
- **Data:** `psi_assets`, `psi_checks`

### F52 — Asigurare bloc
- **Audience:** comitet, admin
- **Description:** Track building insurance: insurer, policy number, expiry, claims history. Reminder before renewal.
- **Acceptance:** Document storage, renewal alerts, claims log.
- **Telegram:** Alert before expiry.
- **Data:** `insurance_policies`, `insurance_claims`

### F53 — Registru de chei
- **Audience:** comitet, admin
- **Description:** Who has keys to what shared space (pivniță, terasă, sala centralei termice, magazia administrației). Important when someone leaves the comitet.
- **Acceptance:** Key holder list, handover log when keys change hands.
- **Telegram:** `/chei` (comitet only).
- **Data:** `keys`, `key_handovers`

### F54 — Vizitatori / străini observați
- **Audience:** all
- **Description:** Residents can quickly log suspicious visitors with a photo and time. Other residents see recent reports. Useful in areas with property crime.
- **Acceptance:** Quick log, recent visitors feed, comitet can mark as resolved/known.
- **Telegram:** `/strain` for quick photo + note.
- **Data:** `visitor_reports`

### F55 — Sirenă / sistem alarmă (status)
- **Audience:** all see; admin manages
- **Description:** For buildings with a centralized alarm system or fire detection — status display, test schedule, recent activations.
- **Acceptance:** Status dashboard, test reminders.
- **Telegram:** Push when system tested or activated.
- **Data:** `alarm_systems`, `alarm_events`

### F56 — Numere de urgență localizate
- **Audience:** all
- **Description:** Quick-dial list customized for the building: dispecerat apă local, gaz, salvare, pompieri, dispecerat lift (specific number, not generic 112), administrator, președinte. Always one tap away.
- **Acceptance:** Stored numbers, tap to call from mobile.
- **Telegram:** `/urgenta`.
- **Data:** `emergency_contacts`

---

## Category 8 — Community Life (F57-F65)

### F57 — Marketplace intern
- **Audience:** all
- **Description:** Sell/give away furniture, appliances, kids' clothes to neighbors first (before OLX). Photo, price, expires after 14 days. Comments inline.
- **Acceptance:** Listings, search, expiry, interest tracking.
- **Telegram:** `/marketplace`, `/marketplace_vand`.
- **Data:** `marketplace_listings`

### F58 — Carpooling / drumuri partajate
- **Audience:** all (opt-in)
- **Description:** Residents who work in similar areas can find each other for ridesharing. Especially useful for the rural-Romanian commute pattern.
- **Acceptance:** Profile with destination + schedule, search, in-app DM bridge.
- **Telegram:** `/carpool`.
- **Data:** `carpool_profiles`

### F59 — Babysitting / pet-sitting bord
- **Audience:** all (opt-in)
- **Description:** Residents who offer babysitting or pet-sitting register their availability and rates. Trust factor of "vecin de bloc" beats stranger from app.
- **Acceptance:** Profile, availability calendar, ratings after service.
- **Telegram:** `/babysit`, `/petsit`.
- **Data:** `sitter_profiles`, `sitter_ratings`

### F60 — Skill exchange / barter
- **Audience:** all
- **Description:** "Eu repar bicicleta ta, tu mă ajuți cu Excel". Residents list skills offered + needed. Local matching.
- **Acceptance:** Skill tags, matching algorithm, exchange log.
- **Telegram:** `/barter`.
- **Data:** `skill_offerings`, `skill_exchanges`

### F61 — Grupuri de cumpărături comune
- **Audience:** all
- **Description:** "Comand 50kg de cartofi de la fermă, cine se bagă?" Bulk-buy coordination with deadlines and quantity tracking.
- **Acceptance:** Create group buy, sign up with quantity, deadline, pickup logistics.
- **Telegram:** `/bulk` to see active group buys.
- **Data:** `group_buys`, `group_buy_signups`

### F62 — Welcome kit for new residents
- **Audience:** new residents
- **Description:** When a new owner or tenant joins (admin marks the apartament as having new occupants), they get a welcome message with: building basics, key contacts, important wiki pages, recent announcements they missed, info about the next AGA.
- **Acceptance:** Automated, customizable per asociație, tracked completion.
- **Telegram:** Sent on first link to apartament.
- **Data:** `welcome_kit_templates`

### F63 — Birthdays / aniversări (opt-in)
- **Audience:** all (opt-in)
- **Description:** Residents who opt in get a small public birthday greeting. Optional comitet sends a small gift card. Builds neighborhood feel.
- **Acceptance:** Opt-in date, anonymized day-only display, reminders to comitet.
- **Telegram:** Daily morning post mentions today's birthdays.
- **Data:** `birthdays_consent`

### F64 — Children & teens activities
- **Audience:** parents
- **Description:** Coordinate kids' activities: playground meetups, snow-day sledding, courtyard games. Parents register kids' age range (no names visible to others, just "există 3 copii 5-8 ani în bloc").
- **Acceptance:** Age range registration (privacy preserving), event coordination.
- **Telegram:** `/copii_evenimente`.
- **Data:** `kids_age_ranges`, `kids_events`

### F65 — Feedback platformă (vecini.online)
- **Audience:** all (open to vecini.online team)
- **Description:** Residents and admins can submit feedback about vecini.online itself. Helps the developers improve. Optional thumbs-up/down on each feature.
- **Acceptance:** Submission form, anonymous option, public roadmap.
- **Telegram:** `/feedback`.
- **Data:** `platform_feedback`

---

## Category 9 — Personalization & Profile (F66-F67)

> Personalization features that sit on top of the existing 65, touching identity
> and the home shell rather than introducing new domain data. Both F66 (profile
> editor) and F67 (customizable home) are built end-to-end (offline + live-ready).

### F66 — Profil complet (complete profile editor)
- **Audience:** every resident (own profile); admin can view/edit any profile in their asociație
- **Description:** A rich, full-page profile editor — not the minimal current profile screen. The resident sets a **profile photo** (pick from gallery / take photo / crop to a circle, with a generated initials avatar as fallback) and fills a structured set of **standard fields**: full name, display name, phone, email, apartament (linked to the apartments registry), scara, etaj, număr mașină / plăcuță (car plate, feeding F28 Parcare), adresă completă, contact de urgență (name + phone + relationship), date of birth (feeding F63 Aniversări opt-in), preferred language (RO/EN), and notification preferences summary. Beyond the standard set, the resident can add **arbitrary extra fields** by pressing a `+ Adaugă câmp` button: they give the field an explicit label and pick its **type** from a typed catalog — `text scurt`, `text lung`, `număr`, `telefon`, `email`, `dată`, `bifă (da/nu)`, `selecție dintr-o listă`, `link`, `adresă`. Each custom field can be marked **private** (only owner + admin) or **vizibil vecinilor** (surfaces in F36 Locator directory subject to its consent rules). Fields are reorderable (drag), editable, and deletable. The whole thing validates per-type, autosaves drafts, and shows completeness (`profil 80% complet`) to nudge filling it in.
- **Acceptance:** Photo upload with crop + fallback avatar. All standard fields present with per-type validation (plate format, phone, email, date). `+ Adaugă câmp` flow: name the field, choose its type from the catalog, set visibility, save — it persists and renders with the correct input control. Custom fields reorder/edit/delete. Plate auto-syncs to F28; birthday respects F63 opt-in; visible fields respect F36 consent. Admin can open any resident's profile read/write; resident sees only their own. Completeness indicator and autosave work. Fully bilingual (RO/EN).
- **Telegram:** `/profil` shows the resident's profile summary and a deep link into the Mini App editor; inline quick-edit for phone and plate.
- **Data:** extend `profiles` with the standard columns; `profile_custom_fields` (owner_id, label, field_type, value, visibility, sort_order) for the dynamic fields; profile photo in the `storage` bucket. RLS: owner read/write own; admin read/write within asociație; visible-flagged fields exposed to F36 per its consent table.

### F67 — Acasă personalizabil (customizable home screen)
- **Audience:** every resident (own home layout)
- **Description:** The home screen becomes **editable per resident**. A **pencil icon** in the top corner of the home flips it into edit mode, where the resident chooses which **cards** (feature widgets) they see and in what order — show only the functions that interest them. In edit mode each available card can be toggled on/off, reordered (drag), and where a card supports it, sized (e.g., compact vs. expanded) — so someone who only cares about Anunțuri, Sesizări and Plăți pins those to the top and hides the rest. The catalog of available cards is the set of features the **admin has enabled** for the asociație (a resident can never surface a disabled feature), each exposing a small home-widget (latest announcement, my open tickets, next event, active polls, etc.). A `Resetează la implicit` restores the admin's default layout. The layout persists per resident across devices; tapping the pencil again (or `Gata`) exits edit mode.
- **Acceptance:** Pencil icon toggles edit mode. In edit mode: per-card show/hide, drag-reorder, optional size, live preview. Card catalog is exactly the asociație's enabled features (disabling a feature removes its card and any pinned instance). Layout persists per resident and syncs across sessions/devices. `Resetează la implicit` restores defaults. Smooth, eased enter/exit of edit mode in keeping with the premium-feel mandate. Fully bilingual (RO/EN).
- **Telegram:** N/A (home personalization is a Mini App / web surface; the bot keeps its command-driven model).
- **Data:** `home_layouts` (resident_id, asociatie_id, ordered list of {card_key, visible, size}) with owner-only RLS; falls back to an asociație default layout when none is set.

---

## Implementation tracking

Status legend (two axes — built, and wired live):
- **✅ demo-complete** — built end-to-end in demo mode: real page, pure unit-tested logic, seeded offline store, RO/EN strings, schema + RLS in `supabase/migrations/`, toggleable. This is the status in the table below; every F01-F67 is here.
- **🟦 schema only** — table + RLS exist but the UI is not built yet (none currently).
- **⬜ planned** — not yet specced into the schema (none currently).

**Live-wired** (reads/writes Supabase under RLS in PROD today, beyond demo): **F01, F02, F04, F05, F17, F33**, plus the auth, invites and onboarding plumbing. Every other feature is offline-first; its live activation is tracked per-row in the Notes column and in `BACKLOG.md` under the live-activation track. See `DECISIONS.md` for the scope boundary.

| Key | Title | Status | Notes |
|-----|-------|--------|-------|
| F01 | Anunțuri oficiale | ✅ | Compose/publish, categories, read receipts; scheduled publish + PDF/image attachments (T188); DOMPurify-sanitized HTML; tables + GIN search + RLS. |
| F02 | Canal de discuții moderat | ✅ | Moderated discussion channel: topic-tagged threads (pinned float first, then most-recent-activity), expand to read/post messages, comitet pin/unpin and delete-message; validation/sort/last-activity/rate-limit logic unit-tested; `/discutii` bot command. Threads + messages scoped per asociație (T48: `byAsociatie` store, `useAsociatieThreads`, posts attributed to the active author). F02 E2E happy path (create thread, post message, pin). Tables `discussion_threads/messages`, `moderation_actions` + RLS. |
| F03 | Alertă de bloc (urgență) | ✅ | Emergency broadcast: double-confirm send flow, real recipient count derived from the active asociație's apartments (residents across active units), per-asociație seeded + persisted `alertsStore`, dual-mode `alertsApi` (hydrate/insert `alerts` under RLS behind `isSupabaseConfigured`, offline store as fallback), live-fetch `ErrorState` with retry. Quiet-hours bypass: `shouldDeliverAlert` wraps the urgent-priority path so an alert reaches a recipient even inside quiet hours / when email is opted out. `alertsLogic` (seed/forAsociatie/newAlert/migrate/isSendableAlert/recipientCount/shouldDeliverAlert) unit-tested; F03 E2E happy path. Tables `alerts`, `alert_acknowledgments` + RLS. |
| F04 | Mesagerie privată cu administratorul | ✅ | Private resident↔admin channel: start a subject-titled thread, chat-style timeline (own messages right / admin left), reply, unread-from-admin badge, an "awaiting reply for Nh" SLA hint, mark resolved/reopen, open-threads-first ordering, and read-on-open receipts; subject/message validation, last-activity, awaiting-reply, waiting-hours, unread-count, sort and status-toggle logic unit-tested; `/contact_admin` bot command. F04 E2E happy path (clear an unread inbox thread, reply, start a new admin->resident thread). Tables `private_threads/messages` + RLS. |
| F05 | Mesaj anonim către comitet | ✅ | Residents send messages to the comitet with their identity hidden at the app layer; queue floats open above resolved (newest-first), a pending banner, and toggle resolve/reopen; validation/toggle/order/open-count logic unit-tested; `/anonim` bot command. F05 E2E happy path (submit, lands in the comitet queue as "Nou"). Table `anonymous_messages` + owner RLS on sender. |
| F06 | Anunțuri vecini (locator) | ✅ | Compose neighbour posts with category + 14-day auto-archive; expiry logic unit-tested; `/locator` bot command. Table `resident_posts` + owner RLS. Live hydrate/create wired (`locatorApi`) behind `isSupabaseConfigured` with the offline store as fallback (T186). |
| F07 | Întrebări frecvente (FAQ) | ✅ | Searchable FAQ (diacritic-insensitive) with helpful/not-helpful voting; search + ratio logic unit-tested; `/faq` bot command. Tables `faq_entries/votes` + RLS. Live hydrate via `faqApi` + attribution-free `faq_tally` RPC; comitet/admin manage UI (create/edit/archive, `archived` flag) gated by audience (T186). |
| F08 | Calendar de evenimente | ✅ | Per-asociație seeded + persisted `eventsStore`; agenda view (upcoming + past) and a month view toggle; RSVP toggle with live attendee counts; per-event ICS (.ics) export; live read of `events` + the resident's `event_rsvps` and RSVP upsert/delete under RLS behind `isSupabaseConfigured` (offline store as fallback). Sort/split/group/RSVP/ICS logic unit-tested; F08 E2E happy path. Tables `events/event_rsvps`. |
| F09 | Vot rapid pe propuneri | ✅ | Per-asociație persisted `pollsStore` + `useAsociatiePolls()`; vote with a confirm step and live result bars; quorum denominator from the real active-apartment count (quorum/majority tally logic unit-tested). Live read of `polls`/`poll_options` with per-option counts merged from the attribution-free `poll_tally` RPC (T80), and a per-apartment `votes` insert under RLS, behind `isSupabaseConfigured` (offline store as fallback); `pollsApi` offline-path unit-tested; F09 E2E happy path. Tables `polls`/`poll_options`/`votes` + RLS (T189). |
| F10 | AGA digitală | ✅ | Digital General Assembly per Legea 196/2018: lifecycle (convocată → în desfășurare → încheiată) with comitet convoke + add agenda items; per-assembly convocator (date/time, location or online) and live quorum tracker (represented apartments vs. required %); resident RSVP (prezent / procură / absent) that feeds quorum; per-item voting (pentru/contra/abținere) with live tally bars and a per-item majority rule (simplă / absolută / două treimi) driving an adoptat/respins/în-așteptare outcome; one-tap proces-verbal download -- plain-text in demo/offline mode, server-rendered PDF (A4, asociație header, Identity-H Unicode encoding) in live mode via `generate-pv-pdf` Netlify function (T37). PV generation logic extracted to `pvGenerator.ts` (no @/ aliases, importable by both client and Netlify). Quorum/present/tally/percent/outcome/sort/lifecycle/PV-generation logic unit-tested; `/aga` bot command. Tables `agas`, `aga_agenda_items/attendees/votes` + RLS, with additive owner-RLS for resident RSVP + vote (batch5 migration). |
| F11 | Procese verbale (arhivă) | ✅ | Searchable archive of signed minutes with category badge and accent-insensitive search over title/category/content, newest-document-date first. Comitet/admin upload surface: title/date/category/summary + optional PDF or image attachment (max 10 MB, validated) stored in the `attachments` Storage bucket; download via signed URL. `pvStore` per-asociație persisted; `pvApi` hydrates `pv_documents` under RLS and mirrors inserts + Storage uploads behind `isSupabaseConfigured` (offline store as fallback). Role-gated "Add" button (admin/presedinte/comitet only), live-fetch `ErrorState` with retry. `canManagePv`/model/migration logic unit-tested; `pvApi` offline-path unit-tested; F11 E2E happy path (search + clear). Table `pv_documents` with GIN full-text search + RLS + `category` column (T191 migration). |
| F12 | Buget participativ | ✅ | Discretionary-fund cycle with a pool + live "rămân X lei" tracker, proposals ranked by votes with a greedy within-budget funded badge, one-tap vote toggle and propose-idea form; validation/sort/greedy-funding/remaining logic unit-tested; per-asociație persisted store (`budgetStore`); `budgetApi` hydrates `budget_cycles`/`budget_proposals`/`budget_votes` under RLS, `proposeItem` + `castBudgetVote` store-first behind `isSupabaseConfigured`; live-fetch `ErrorState` with retry; F12 E2E happy path (propose + vote + funded badge). Tables `budget_cycles/proposals/votes` + RLS. |
| F13 | Prioritizare proiecte mari | ✅ | Ranked list of major projects with numbered rank badges, up/down reordering (boundary-safe, auto re-numbers 1..n) and add project; validation/sort/move-up/move-down logic unit-tested; `/prioritati` bot command. Tables `project_priorities`, `priority_rankings` + RLS. |
| F14 | Cutie de idei | ✅ | Submit ideas, one-vote upvoting, status badges, vote-ranked list; ranking + top-N promotion logic unit-tested; per-asociație persisted store (`ideasStore`); `ideasApi` hydrates `ideas`/`idea_votes` under RLS (idea_votes RLS added T194), `submitIdea` + `castIdeaVote` store-first behind `isSupabaseConfigured`; `isPromoted` badge for top-N open ideas surfaced to comitet; live-fetch `ErrorState` with retry; F14 E2E extended (upvote + promoted badge). Tables `ideas`, `idea_votes/comments` + RLS. |
| F15 | Sondaje de opinie | ✅ | Non-binding surveys with anonymous voting and live percentage bars; results shown after voting or close; tally/percent/close logic unit-tested; per-asociație persisted store (`surveysStore`); `surveysApi` hydrates `surveys` under RLS + fetches each tally via attribution-free `survey_tally` RPC (T80), `recordSurveyResponse` store-first behind `isSupabaseConfigured`; live-fetch `ErrorState` with retry; F15 E2E happy path (vote, progressbars). Tables `surveys`, `survey_responses` + member-insert RLS. |
| F16 | Petiții interne | ✅ | Start/sign petitions with per-apartment signature tally, threshold progress bar and auto-forward when the 25% threshold is reached; per-asociație persisted store (`petitionStore`); `petitionApi` hydrates `petitions`/`petition_signatures` under RLS (tallied in JS), `createPetition` + `signPetition` store-first behind `isSupabaseConfigured`; auto-forward: status update in DB + `petition.forwarded` audit event + demo notification when threshold is reached; live-fetch `ErrorState` with retry; F16 E2E happy path (sign, progress bar advances). Tables `petitions`, `petition_signatures` + owner/member RLS. |
| F17 | Sesizări cu foto | ✅ | Create with severity/category/location; SLA logic unit-tested; status badges. Scoped per active asociație (T49): demo seeded, submit lands only in the active tenant's list. Admin/comitet action bar advances tickets through the full lifecycle (primit→asignat→in_lucru→rezolvat→verificat/respins→inchis), stamps resolved_at/verified_at, optional resolution notes; reporter rates after resolution (1-5 stars). Transition rules + rating unit-tested (T67). |
| F18 | Istoric reparații | ✅ | Searchable repair log with system filter, cost/contractor, and warranty-expiry badges (active/expiring/expired); search + warranty logic unit-tested; admin compose form (add repair record); live-wired: `repairRecordsStore` (per-asociatie persisted), `repairRecordsApi.ts` (hydrateRepairs + addRepair), page hydrates on mount + ErrorState retry (T213). |
| F19 | Calendar service-uri programate | ✅ | Scheduled-maintenance list sorted soonest-first with overdue/due-soon/scheduled badges, add and mark-done; logic unit-tested; live-wired: `maintenanceStore` rebuilt as per-asociatie persisted, `scheduledMaintenanceApi.ts` (hydrateMaintenance + addMaintenanceItem + markMaintenanceDone), page hydrates on mount + ErrorState retry (T213). |
| F20 | Citire contoare | ✅ | Monthly index submission per meter with validation + anomaly flagging; live-wired: `metersStore` rebuilt as per-asociatie persisted (meters + readings), `metersApi.ts` (hydrateMeters + submitMeterReading), member-insert policy on `meter_readings` (T213 migration), page hydrates on mount + ErrorState retry (T213). |
| F21 | Sesizări recurente | ✅ | Auto-detects patterns over `tickets`: groups recent tickets by category+location (accent/case-insensitive), flags any group repeating ≥3× within a 90-day window, picks max severity, and suggests structural-fix vs. routine-maintenance (severity≥high or ≥4 occurrences → structural). Comitet can mark a pattern "cunoscut" per-asociatie (floats faded to the bottom) or reactivate it; an attention banner counts active patterns. Location label/grouping, severity, suggestion, window, threshold, sort and date-range logic unit-tested; acknowledged keys now per-asociatie persisted store (T214). Computed — no table (reads `tickets`). |
| F22 | Solicitare oferte (RFP) | ✅ | Post an RFP, add contractor quotes (cheapest auto-highlighted), and choose a winner which closes the RFP and marks the selected quote; open RFPs float above decided ones; validation/cheapest/quote-sort/RFP-sort logic unit-tested; `/oferte` bot command. Tables `rfps`, `rfp_quotes` + member-insert policy on `rfp_quotes` + `selected` column (T214 migration). Live-wired: `rfpStore` rebuilt per-asociatie, `rfpApi.ts` (hydrateRfps + addRfpItem + addRfpQuote + decideRfpItem), page hydrates on mount + ErrorState retry (T214). |
| F23 | Vecin de gardă | ✅ | Weekend duty rotation: an "on duty now" banner (covering Sat 00:00–Mon 00:00), upcoming weekends soonest-first with covered/free badges, self sign-up with an optional note and release; sort/coverage/current-duty/next-duty/mine logic unit-tested; `/garda` bot command. Tables `duty_volunteers`, `duty_schedule` (with `volunteer_user_id/volunteer_name` columns + member-update policy, T214 migration). Live-wired: `dutyStore` rebuilt per-asociatie, `dutyApi.ts` (hydrateDutySlots + signUpForDuty + releaseFromDuty), page hydrates on mount + ErrorState retry (T214). |
| F24 | Listă obiecte împrumutabile | ✅ | Registry of borrowable items with add, category, search and available/borrowed toggle; validation + search/filter logic unit-tested; `/imprumut` bot command. Tables `lending_items/records` + owner RLS + member-update policy + `owner_name` column (T214 migration). Live-wired: `lendingStore` rebuilt per-asociatie, `lendingApi.ts` (hydrateLendingItems + addLendingItem + toggleLendingAvailable), page hydrates on mount + ErrorState retry (T214). |
| F25 | Rezervare spălătorie | ✅ | Slot booking for shared washers/dryer: 2-hour slots, clash detection, date+slot ordering, book own / cancel own; validity/clash/sort/mine logic unit-tested; `/spalatorie` bot command. Tables `bookable_resources`, `bookings` + owner RLS. |
| F26 | Rezervare lift pentru mutare | ✅ | Elevator booking for moves in 3-hour windows (08:00–20:00): book own date/slot/destination-floor with clash detection (one move per slot), date+slot ordering, cancel own; validity (numeric-floor)/clash/sort/mine logic unit-tested; `/lift` bot command. Uses `bookings` (resource_type) + RLS. |
| F27 | Rezervare sală comună / terasă | ✅ | Venue booking (sală comună / terasă) in 4-hour windows: pick venue/date/slot + event purpose, per-venue clash detection (two venues are independent on the same slot), date→slot→venue ordering, book own / cancel own; validity/per-venue-clash/sort/mine logic unit-tested; `/sala` bot command. Uses `bookings` (resource_type) + RLS. |
| F28 | Parcare | ✅ | Parking-spot registry with assigned apartment/plate, occupied/free/visitor badges, accent-insensitive search and add; plate input pre-filled from F66 profile (`residentPlateSuggestion`); occupancy/search/sort/free-count logic unit-tested; per-asociatie persisted store (`byAsociatie`, seeded for demo) + `useAsociatieParking()` hook; `parkingApi` hydrates `parking_spots` on mount + live insert (denormalized `apartment_label`/`license_plate` columns); `ErrorState` retry; unit-tested offline path (T215). `/parcare` bot command. Tables `parking_spots/assignments` + RLS + migration `20260603000008`. |
| F29 | Bicicletăria | ✅ | Bike registry with register, search and active/abandoned marking; validation + search/filter logic unit-tested; per-asociatie persisted store (`byAsociatie`) + `useAsociatieBikes()` hook; `bikesApi` hydrates `bikes` on mount + live insert + live toggle-abandoned (denormalized `owner_name`/`created_at` columns); `ErrorState` retry; uses `authStore.session` for live owner_id; unit-tested offline path (T215). `/biciclete` bot command. Table `bikes` + owner RLS + migration `20260603000008`. |
| F30 | Boxa / dependinți | ✅ | Storage-room registry with assigned/unassigned filter, apartment badges, notes and add (assigned units float to top); validation + assignment filter + search/sort logic unit-tested; per-asociatie persisted store (`byAsociatie`) + `useAsociatieStorageUnits()` hook; `storageApi` hydrates `storage_units` on mount + live insert (denormalized `apartment_label` column); `ErrorState` retry; unit-tested offline path (T215). `/boxe` bot command. Table `storage_units` + RLS + migration `20260603000008`. |
| F31 | Plante / spații verzi | ✅ | Volunteer schedule for green-space tasks: tasks bucketed soonest-week-first with assigned/free badges, an open-tasks banner, self sign-up/release and comitet add (task + week); validation/sort/assignment/open-count/mine logic unit-tested; per-asociatie persisted store (`byAsociatie`) + `useAsociatieGreenTasks()` hook; `greenApi` hydrates `green_space_tasks` on mount + live insert + live signUp/release (denormalized `volunteer_user_id`/`volunteer_name` columns); `ErrorState` retry; uses `authStore.session` for live user id; unit-tested offline path (T215). `/plante` bot command. Tables `green_space_tasks`, `task_signups` + RLS + migration `20260603000008`. |
| F32 | Acces curierat (cod temporar) | ✅ | One-tap generation of a 6-digit interphone code valid 30 min, with live active/expired badges and minutes-left countdown, newest-first; code generation (injectable RNG), expiry math, active/minutes-left and sort logic unit-tested; per-asociatie persisted store (`byAsociatie`) + `useAsociatieAccessCodes()` hook; `accessApi` hydrates `access_codes` on mount (server-stamped `expires_at` is authoritative for active/expired) + live insert; `ErrorState` retry; uses `authStore.session` for live generated_by; unit-tested offline path (T215). `/curier` bot command. Table `access_codes` + owner RLS + migration `20260603000008`. |
| F33 | Document arhivă | ✅ | Searchable document repository (statut/regulament/contracte/cadastru) with category filter, version display and add; real file upload: admin/presedinte/comitet upload PDF/image/Word/Excel (max 10 MB), all members download, delete with confirm modal; upload/delete audit events; category + diacritic-insensitive search + file helpers unit-tested; `/documente` bot command. Demo: files stored as base64 data URLs in persisted Zustand store. Live (T89): files in Supabase Storage bucket `documents` (`<asociatie_id>/<doc_id>/<filename>`), downloads via 1-hour signed URLs, Storage object cleaned up on delete, page hydrates from DB on mount. Table `documents` + GIN full-text search + RLS + Storage bucket (T89). |
| F34 | Furnizori / contracte | ✅ | Supplier catalog sorted by contract end (undated last) with active/expiring/expired contract badges, an alert summary banner and add; contract-status (reuses warranty classifier), validation, sort and alert-count logic unit-tested; `/furnizori` bot command. Tables `suppliers`, `supplier_complaints` + RLS. Live (T216): per-asociatie persisted store (`vecini.suppliers`), `suppliersApi.ts` (hydrateSuppliers + addSupplierLive), page hydrates on mount with ErrorState retry. |
| F35 | Apartament info | ✅ | Read-only per-apartament aggregation over existing data (no table of its own): the apartment card (owner, location, suprafață, cotă-parte indiviză as a RO percent, persoane), meters with their latest index plus full reading history newest-first, the resident's tickets (matched by apartment or reporter, de-duplicated, newest-first) with an open/resolved summary and status badges, and per-poll vote summaries (voted option label or a "votează acum" link) with a cast/total count; payments card shows a finance-module-disabled empty state. Meters/tickets/votes folding, cota-parte percent, short-label, open-ticket classing and option-label logic unit-tested; `/apartament_meu` bot command. Computed from already-live stores (T216 completes activation via transitive live stores). |
| F36 | Locator directory | ✅ | Per-field opt-in consent toggles + searchable list of opted-in neighbours (tap-to-call/email); F66 neighbour-visible custom fields rendered per entry; admin/comitet can open any resident's full profile modal (all fields incl. private, `canViewAnyProfile`); consent-masking + search + custom-fields logic unit-tested; `/vecini` bot command. Table `resident_directory_consent` + RLS. Live (T216): per-asociatie persisted store (`vecini.directory`), `directoryApi.ts` (hydrateDirectory + syncDirectoryConsent), denormalized name/apartment/phone/email columns added to `resident_directory_consent` via migration. |
| F37 | Pet directory | ✅ | Opt-in pet registry with add, species filter, search and lost & found marking (lost pets float to top); validation + search/sort logic unit-tested; `/animale` bot command. Table `pets` (+ `lost`, `created_at`, `owner_name`) + owner RLS. Live (T216): per-asociatie persisted store (`vecini.pets`), `petsApi.ts` (hydratePets + addPetLive + togglePetLostLive), page hydrates on mount with ErrorState retry. |
| F38 | Carte de aur (mulțumiri) | ✅ | Public thank-you wall: post a note tagging a neighbour's apartment, recency-ordered feed; validation + apartment-label logic unit-tested; `/multumeste` bot command. Table `thank_yous` (+ `from_name`) + RLS + member insert policy. Live (T216): per-asociatie persisted store (`vecini.thankyous`), `thankYousApi.ts` (hydrateThankYous + postThankYouLive), page hydrates on mount with ErrorState retry. |
| F39 | Wiki bloc | ✅ | Collaborative local-knowledge wiki: add a page (title/body, auto-slug), accent-insensitive search over title/body, newest-updated-first list and Markdown-lite rendering; validation/slugify/search/sort + canManageWiki logic unit-tested; `/wiki` bot command. Tables `wiki_pages/revisions/suggested_edits` + GIN search + RLS. Live (T216): per-asociatie persisted store (`vecini.wiki`), `wikiApi.ts` (hydrateWiki + addWikiPageLive + updateWikiPageLive), page role-gates edit/new to comitet+. |
| F40 | Glosar de termeni | ✅ | Searchable, alphabetically-sorted glossary of association jargon; search + exact-term lookup logic unit-tested; `/glosar` bot command. Table `glossary_entries` + RLS. Live (T216): per-asociatie persisted store (`vecini.glossary`), `glossaryApi.ts` (hydrateGlossary), page hydrates on mount with ErrorState retry. |
| F41 | Project tracker | ✅ | Major-works tracker (anvelopare/lift/acoperiș): per-project status badge + changeable status, phase-derived progress bar, budget alloc-vs-spent bar with remaining/over-budget note, advanceable phases (așteptare→în curs→finalizat); active/planned-first sort, percent/budget/current-phase/validation logic unit-tested; `/proiecte` bot command. Tables `projects`, `project_phases/updates` + RLS. Live (T217): per-asociatie persisted store (`vecini.projects`), `projectsApi.ts` (hydrateProjects + addProjectLive + setProjectStatusLive), page hydrates on mount with ErrorState retry. |
| F42 | Project photo journal | ✅ | Reverse-chronological photo journal grouped by day, per-project filter, project+phase badges; demo images shown as gradient swatches (no binary assets), add entry (project/date/caption/phase); group-by-date/filter/swatch/validation logic unit-tested; `/jurnal_foto` bot command. Table `project_photos` + RLS. Live (T217): per-asociatie persisted store (`vecini.photojournal`), `photoJournalApi.ts` (hydratePhotos + addPhotoLive), page hydrates on mount with ErrorState retry. |
| F43 | Contractor library | ✅ | Vetted-contractor library (comitet/admin) with specialty/price-tier, 0–5 rating shown rating-first, available-only filter, accent-insensitive search and add + re-rate (running average); validation/rating-validation/search/filter/sort/apply-rating logic unit-tested; `/contractori` bot command. Tables `contractors`, `contractor_ratings` + RLS. Live (T217): per-asociatie persisted store (`vecini.contractors`), `contractorsApi.ts` (hydrateContractors + addContractorLive + rateContractorLive + toggleContractorAvailableLive), page hydrates on mount with ErrorState retry. |
| F44 | Crowdfunding proiecte mici | ✅ | Voluntary pledge tracker with target/raised progress bar, one-tap pledge (amount, join-once), funded/closed states and open-first ordering; validation/open/funded-ratio/sort logic unit-tested; `/crowdfund` bot command. Tables `crowdfunds`, `pledges` + owner RLS on pledges. Live (T217): per-asociatie persisted store (`vecini.crowdfund`), `crowdfundApi.ts` (hydrateCrowdfunds + createCrowdfundLive + pledgeLive, pledges aggregated in JS), page hydrates on mount with ErrorState retry. |
| F45 | Plan multianual de mentenanță | ✅ | Multi-year works roadmap with add (year/title/cost/notes), items bucketed by ascending year and a total-estimated-cost summary; year/title validation + sort + total + group-by-year logic unit-tested; `/plan_multianual` bot command. Table `multiyear_plan_items` (comitet-managed RLS). Live (T217): per-asociatie persisted store (`vecini.multiyear`), `multiyearApi.ts` (hydrateMultiyear + addMultiyearItemLive), page hydrates on mount with ErrorState retry. |
| F46 | Recomandări fond de reparații | ✅ | Calculator that recommends a lei/m²/month accumulation rate from built area, building age and years since last major works, with rationale and a gap vs. current rate; component/validation/recommendation logic unit-tested; `/fond_reparatii` bot command. Computed — no table. |
| F47 | Energy efficiency tracker | ✅ | Monthly common-area consumption log (lighting/lift/heating) with add, period/kind, a total-cost summary and per-kind breakdown, newest-period-first ordering; validation + period formatting + sort + totals/by-kind logic unit-tested; `/energie` bot command. Table `energy_records` (comitet-managed RLS). Live (T217): per-asociatie persisted store (`vecini.energy`), `energyApi.ts` (hydrateEnergy + addEnergyRecordLive), page hydrates on mount with ErrorState retry. |
| F48 | Garanție tracker | ✅ | Equipment warranty dashboard sorted by expiry with active/expiring/expired badges and add (auto-computes expiry); expiry math, validation, sort and alert-count logic unit-tested; `/garantii` bot command. Table `warranties` + RLS. Live (T217): per-asociatie persisted store (`vecini.warranties`), `warrantiesApi.ts` (hydrateWarranties + addWarrantyLive), page hydrates on mount with ErrorState retry. |
| F49 | Cod portari / vecini de încredere | ✅ | Private owner-only safety profile: passphrase + instructions + trusted contacts; live-wired: `safetyStore` rebuilt as per-user persisted, `safetyApi.ts` (hydrateSafetyProfile + persistSafetyProfile with AES-GCM client-side encryption -- ciphertext only in DB), page hydrates on mount + ErrorState retry (T218). |
| F50 | Plan de evacuare | ✅ | Evacuation plan per scara + pet markers (firefighter info); live-wired: `evacuationStore` rebuilt as per-asociatie persisted, `evacuationApi.ts` (hydrateEvacuation + persistPetMarker + removePetMarker), migration adds route/equipment jsonb + apartment_label/user_id columns + owner-manage policy on pet_markers, page hydrates on mount + ErrorState retry (T218). |
| F51 | Verificări PSI | ✅ | Fire-safety asset list with overdue/due-soon/ok badges, add and mark-checked; live-wired: `psiStore` rebuilt as per-asociatie persisted, `psiApi.ts` (hydratePsiAssets + addPsiAssetLive + markPsiCheckedLive), page hydrates on mount + ErrorState retry (T218). |
| F52 | Asigurare bloc | ✅ | Insurance-policy tracker with expired/expiring/active badges and renewal banner; live-wired: `insuranceStore` rebuilt as per-asociatie persisted, `insuranceApi.ts` (hydrateInsurance + addInsurancePolicyLive), page hydrates on mount + ErrorState retry (T218). |
| F53 | Registru de chei | ✅ | Key-holder registry with search, add and handover; live-wired: `keysStore` rebuilt as per-asociatie persisted, `keysApi.ts` (hydrateKeys + addKeyLive + handoverKeyLive), migration adds denormalized holder_name column, page hydrates on mount + ErrorState retry (T218). |
| F54 | Vizitatori / străini observați | ✅ | Suspicious-visitor log with open-first feed, comitet status cycle; live-wired: `visitorsStore` rebuilt as per-asociatie persisted, `visitorsApi.ts` (hydrateVisitors + addVisitorReportLive + cycleVisitorStatusLive), migration adds reporter_name column + member-insert policy, page hydrates on mount + ErrorState retry (T218). |
| F55 | Sistem alarmă (status) | ✅ | Alarm/detection-system dashboard with status badges, log test, report fault; live-wired: `alarmStore` rebuilt as per-asociatie persisted, `alarmApi.ts` (hydrateAlarm + addAlarmSystemLive + logAlarmTestLive + reportAlarmFaultLive), page hydrates on mount + ErrorState retry (T218). |
| F56 | Numere de urgență localizate | ✅ | Tap-to-call list; table `emergency_contacts` + RLS; seeded. |
| F57 | Marketplace intern | ✅ | Sell/give-away listings with category, price (0 = gratis), search and 14-day auto-expiry; live-wired (T219): per-asociație persisted store, `marketplaceApi` (`hydrateListings`/`addListingLive`), hydration on mount + ErrorState retry; migration adds `seller_name`/`category` columns + member-insert policy. |
| F58 | Carpooling | ✅ | Opt-in carpool profile (save/edit/leave); live-wired (T219): per-asociație persisted store, `carpoolApi` (upsert/leave/hydrate behind `isSupabaseConfigured`), unique constraint on `(asociatie_id, user_id)`; migration adds `user_name` column. |
| F59 | Babysitting / pet-sitting | ✅ | Opt-in sitter profile (kind/availability/rate, save/edit/leave); live-wired (T219): per-asociație persisted store, `sitterApi` (upsert/leave/hydrate behind `isSupabaseConfigured`), unique constraint on `(asociatie_id, user_id)`; migration adds `user_name` column. |
| F60 | Skill exchange / barter | ✅ | Opt-in skill offering (offers/needs, save/edit/leave); live-wired (T219): per-asociație persisted store, `barterApi` (upsert/leave/hydrate), unique constraint on `(asociatie_id, user_id)`; migration adds `user_name` column. |
| F61 | Grupuri de cumpărături comune | ✅ | Create + join group buys; live-wired (T219): per-asociație persisted store, `groupBuyApi` (`hydrateGroupBuys` aggregates signup counts via `group_buy_signups`, `addGroupBuyLive`, `joinGroupBuyLive`); migration adds `organizer_name` column + member-insert policies. |
| F62 | Welcome kit for new residents | ✅ | New-resident onboarding checklist; live-wired (T219): per-asociație persisted store, `welcomeKitApi` (`hydrateWelcomeKit`/`addWelcomeKitItemLive`/`removeWelcomeKitItemLive`); migration adds `order_num`/`title`/`body` columns to `welcome_kit_templates` for multi-step items. |
| F63 | Aniversări (opt-in) | ✅ | Opt-in birthday consent (day/month only); live-wired (T219): per-asociație persisted store, `birthdaysApi` (upsert/leave/hydrate), unique constraint on `(asociatie_id, user_id)`; migration adds `user_name` column. |
| F64 | Activități copii și adolescenți | ✅ | Privacy-preserving kids registry + activities; live-wired (T219): per-asociație persisted `KidsByAsociatie` catalog, `kidsApi` (`hydrateKids` reads ranges+events, `registerKidsLive` upsert with `bucket`/`count_num`, `addKidsEventLive`); migration adds `bucket`/`count_num` to `kids_age_ranges` + full event columns to `kids_events`; minors guard enforced. |
| F65 | Feedback platformă | ✅ | Platform feedback with sentiment; live-wired (T219): per-asociație persisted store, `feedbackApi` (`hydrateFeedback`/`addFeedbackLive`); migration adds member-insert policy to `platform_feedback`. |
| F66 | Profil complet | ✅ | Rich full-page profile editor at `/app/profil`: photo (center-cropped square + initials fallback, capped data URL offline), structured standard fields (full/display name, phone, email, apartament/scara/etaj, car plate→F28, address, emergency contact, DOB→F63, language) with per-type validation (plate/phone/email/date) and a live completeness indicator; autosaves every change. User-added custom fields via `+ Adaugă câmp` (label + typed catalog text/longtext/number/phone/email/date/bool/select/link/address) each marked private vs. visible-to-neighbours (→F36), with the right input control per type, reorder (up/down) + delete. Account card links to Notificări/Securitate/Datele mele/Confidențialitate + sign-out. car plate feeds F28 (pre-fill); visible-to-neighbours custom fields surface in F36 directory; admin read path via F36 profile modal (`canViewAnyProfile`). Pure model/validation/completeness/custom-field ops + avatar crop maths + canViewAnyProfile unit-tested; migration extends `users` + new owner-RLS `profile_custom_fields`; `/profil` bot help; one E2E. Live persistence + Storage avatar bucket folds into T103. |
| F67 | Acasă personalizabil | ✅ | Customizable home at `/app`: a `Personalizează` pencil flips the card grid into edit mode where each card has show/hide, up/down reorder + native drag-and-drop, and a compact↔expanded size toggle; every edit autosaves per resident. The card catalog is exactly the asociație's admin-enabled, routed features in registry order (a disabled feature is never offered; `reconcileLayout` drops disabled keys and appends newly enabled ones); the default shows the first six and hides the rest. `Resetează la implicit` restores the default (disabled when already default); an all-hidden empty state guides recovery. Pure layout model/ops (catalog, default split, reconcile, toggle/size/move/move-to, isDefault) unit-tested; persisted `homeLayoutStore` keyed by resident+asociație; migration adds the owner-RLS, tenant-tightened `home_layouts` table; one E2E (hide a card → leaves the grid → survives reload); no bot command (web/Mini App surface). Live persistence under owner RLS is a follow-up (T106). Expanded cards now render a live at-a-glance widget (T108): latest announcement (F01), next upcoming event (F08), active-poll count (F09), and the resident's open-ticket count (F17), via pure null-safe builders in `homeWidgets.ts` derived from the existing per-asociatie stores. |

---

## Platform helpers (cross-cutting, not feature-flagged)

### Legal & privacy (GDPR consent surface) ✅
- **Audience:** everyone (public + authenticated)
- **Description:** The GDPR / ePrivacy compliance surface (BACKLOG T05). A global
  consent banner appears until the resident decides — Accept all / Doar esențiale
  / Personalizează (per-category switches for preferences, analytics, marketing;
  strictly-necessary is mandatory). Public, bilingual policy pages at
  `/confidentialitate`, `/termeni` and `/cookies` cover the data controller vs.
  processor split (asociația is operator, vecini.online is persoană împuternicită
  per art. 28), lawful bases (Legea 196/2018 + GDPR), data-subject rights, the
  ANSPDCP complaint route, and consumer info (ANPC + SOL/ODR). An in-app
  `/app/confidentialitate` page lets a resident review/change consent and see
  their decision history (who-consented-what-when-version). The `mayNotify`
  fan-out gate makes non-essential notifications honour the consent categories
  while essential alerts always send.
- **Files:** `src/features/legal/{consentLogic,legalContent}.ts`,
  `{ConsentBanner,LegalDocPage,PrivacyPolicyPage,TermsPage,CookiePolicyPage,PrivacySettingsPage}.tsx`,
  `src/shared/store/consentStore.ts`, `src/shared/notify/consentGate.ts`,
  `src/styles/legal.css`; `consent`/`legal` locale keys (RO/EN); additive
  `consent_records` migration. Unit-tested (choices, version re-prompt, the
  `mayNotify` gate); one E2E happy-path. See DECISIONS.md for lawful bases.

### GDPR data-subject rights (export + erasure) ✅
- **Audience:** every signed-in resident (self-service); admin / president (request queue)
- **Description:** The GDPR data-subject rights surface (BACKLOG T06), built on
  the T05 consent surface. From `/app/datele-mele` (linked from the privacy
  settings page) a resident exercises the rights of **access + portability**
  (art. 15 + 20): a one-tap download of a complete, machine-readable copy of all
  the personal data the platform holds about them, as **JSON or CSV**, assembled
  from their profile, tickets, marketplace listings, ideas, consent history and
  security-activity log (only rows genuinely theirs). The same page documents the
  **retention policy** (period + lawful basis per category) and the **erasure
  plan** (what is deleted vs. anonymized vs. retained, each with its legal
  rationale) before the resident files an **erasure** request (art. 17). Export is
  self-service but still logged for accountability; erasure is filed pending and
  **actioned by an admin/president** in the request queue at
  `/app/admin/cereri-date`, which records who actioned it and when (tamper-evident
  trail, no delete policy on the table). Works fully offline in demo mode; mirrors
  requests to `data_subject_requests` when a backend is present. Bilingual RO/EN.
- **Files:** `src/features/gdpr/{gdprLogic.ts,MyDataPage.tsx,DsrAdminPage.tsx}`,
  `src/shared/store/gdprStore.ts`, routes `/app/datele-mele` +
  `/app/admin/cereri-date`, sidebar admin nav link + privacy-settings link,
  `gdpr.*` locale keys (RO/EN), `/datele_mele` bot command, additive
  `data_subject_requests` migration (append/no-delete RLS: self files+reads own,
  admin/president reads+actions), GDPR CSS in `src/styles/legal.css`,
  `DATA_RETENTION.md` policy doc. Unit-tested (collect/serialize/erasure plan/
  retention/request lifecycle, 13 tests); one E2E happy-path (file erasure →
  admin completes it).

### GDPR personal-data breach procedure (art. 33/34) ✅
- **Audience:** admin / president (data-controller roles)
- **Description:** The GDPR breach-notification surface (BACKLOG T22). From
  `/app/admin/incidente-date` (linked from the privacy settings page for
  controller roles) the asociație — the data controller — records a personal-data
  breach, **classifies its risk** from the data involved (sensitivity, scale,
  identifiability, whether the risk is neutralised), and the app derives whether
  notification is required: `low` (none), `risk` (notify the authority) or `high`
  (notify the authority **and** the affected residents). It then generates the
  **art. 33 notification to ANSPDCP** (nature, categories + approximate number of
  subjects/records, contact point, likely consequences, measures) and, on a high
  risk, the **art. 34 resident notice** in clear language, both as
  signature/submission-ready bilingual plain text. The **72-hour deadline** is
  computed from when the controller became aware and each record is flagged
  on-time / due-soon / overdue. The **append-only** breach log (no delete policy)
  is the accountability documentation required by art. 33(5); admins advance the
  lifecycle (`detectat` → `evaluat` → `notificat` → `inchis`) and stamp the
  authority/resident notification times. Works fully offline in demo mode; mirrors
  to `data_breaches` when a backend is present. Bilingual RO/EN.
- **Files:** `src/features/gdpr/{breachLogic.ts,breachContent.ts,BreachAdminPage.tsx}`,
  `src/shared/store/breachStore.ts`, route `/app/admin/incidente-date`, sidebar
  admin nav link + privacy-settings link, `breach.*` locale keys (RO/EN),
  `/incidente` bot command, additive `data_breaches` migration (append/no-delete
  RLS, controller-role manage), breach CSS in `src/styles/legal.css`,
  `BREACH_PROCEDURE.md` policy doc. Unit-tested (risk classification, 72-hour
  deadline, lifecycle, notification generators, queries, export — 29 tests); one
  E2E happy-path (record a breach → see it logged with both notifications
  available). Live in-app delivery of the resident notice via the fan-out is
  BACKLOG T76.

### Help assistant ✅
- **Audience:** all residents (role-filtered)
- **Description:** A floating corner chat widget (FAB → panel) that answers "what is X / how do I X / where is X" about the app **and surfaces concrete facts** like "numărul de telefon al președintelui". **Local + rule-based, no LLM, no network:** a grounded matcher normalizes the query (diacritic-insensitive, with prefix matching so Romanian inflections like *președintelui* match *președinte*), scores it against a curated knowledge base derived from the feature registry plus a few how-to/concept entries, and returns only pre-written answers — so it can neither hallucinate nor leak. Data lookups draw from **user-visible** sources only: emergency contacts (F56, public — administrator + committee president phones) and the **opt-in resident directory** (F36) passed through the same `visibleEntry` consent mask, so a number an owner did not choose to share never becomes an answer. **No admin access** is enforced by filtering every entry to the viewer's role (demo/unknown → resident, never privileged) and only using enabled features; it is info-only and never performs actions. Bilingual RO/EN.
- **Human-feel layer (still 100% non-generative → jailbreak-proof by construction):** handles small talk (greetings, thanks, "cine ești", "ce poți face") with varied canned replies; rotates phrasing of social/clarify/fallback lines by turn index; tolerates typos (bounded one-edit incl. transposition, e.g. *spalatorei* → laundry); asks "la care te referi?" when two topics tie instead of guessing; and shows a brief typing indicator before each reply (reduced-motion aware). Factual answers stay concise/unchanged. Any prompt-injection attempt simply has no model to manipulate — it falls through to the friendly fallback and can never surface a role-filtered-out entry.
- **Files:** `src/features/assistant/{knowledge,match,visibility,engine,dataSources,smalltalk}.ts`, `AssistantWidget.tsx`, `src/shared/store/assistantStore.ts`, `src/styles/assistant.css`; mounted in `AppLayout`. `assistant.*` locale keys in ro/en (incl. `social`/`clarifyVariants`/`fallbackVariants`/`typing`). Unit-tested (match + typos + visibility + data lookups incl. consent-masking + small talk + engine social/clarify/no-leak).
- **Phase 2 (planned):** broaden live data answers (open polls, my sesizare status, my bookings) and swap `dataSources.ts` from demo fixtures to Supabase queries under existing RLS.

### Two-factor authentication (2FA / TOTP) ✅
- **Audience:** every signed-in resident; mandatory for privileged roles (super_admin, admin, președinte, comitet, cenzor)
- **Description:** Account-level second factor (BACKLOG T02). A resident enables
  TOTP from `/app/securitate`: a QR (live, via Supabase MFA) or a manual setup
  key (demo), confirmed by a 6-digit code, after which ten single-use recovery
  codes are shown once (copy/download). At the next sign-in the password step is
  followed by a TOTP / recovery-code challenge before the session is allowed
  through. The crypto is real (RFC 6238 over Web Crypto), so demo mode genuinely
  verifies codes from a standard authenticator app offline; the live path
  delegates challenge/verify to Supabase MFA. Privileged roles are steered to the
  security page until they enrol. Recovery codes are stored only as SHA-256
  hashes and consumed single-use. Bilingual RO/EN, accessible.
- **Files:** `src/features/auth/{mfaLogic,SecurityPage}.tsx/.ts` (+ login
  challenge in `LoginPage.tsx`), `src/shared/store/mfaStore.ts`, enforcement in
  `src/app/AppLayout.tsx`, route `/app/securitate`, `auth.mfa.*` locale keys
  (RO/EN), `/securitate` bot command, additive `mfa_recovery_codes` migration
  (hashed, owner-only RLS). Unit-tested against the RFC 4226/6238 vectors plus
  recovery-code single-use and role enforcement; one E2E happy-path (enrol →
  recovery codes → challenged at next sign-in). Live recovery-code login needs a
  server routine (BACKLOG T29). See DECISIONS.md.

### Invite codes & QR (onboarding) ✅
- **Audience:** admin / comitet (issue); anyone with a token link (redeem)
- **Description:** The onboarding plumbing that lets an admin grow their asociatie.
  From `/app/admin/invitatii` an admin issues invites scoped to the active
  asociatie (granted role, optional apartment link, 24h expiry, single-use flag),
  lists / copies / revokes them; a resident redeems via the secure `?token=` deep
  link in the invite email. Each invite carries an **opaque high-entropy token**
  (T123) and a **secure deep link** (`/configurare-cont?token=...`, built from
  `VITE_APP_URL`). The superadmin provisioning setup link likewise carries a 24h
  token, built from `VITE_RESIDENT_APP_URL` (falling back to `VITE_APP_URL`, T133)
  so a link minted on the platform subdomain targets the resident/admin origin. An
  admin **delivers invitations by email** (T147): both the apartment edit surface
  ("Trimite pe email") and the invites surface send a bilingual (RO/EN) email
  carrying the onboarding link, keyed off the recipient's locale, stamping the
  invite as sent (`emailSentAt`); offline the dispatch is simulated, live it goes
  through the Resend-backed `invite-email` Netlify function.
- **MVP change (T157):** Short alphanumeric codes removed from UI. `InvitesAdminPage`
  no longer shows the code chip or "Copiaza codul" button. `AccountSetupPage` no
  longer has a code-entry text field — token-URL only. The `code` field still
  exists in DB and logic for backward compatibility, just not surfaced to users.
- **MVP change (T152-T153):** Superadmin provisioning is now email-only (admin
  name + email → polished bilingual HTML email with "[Accept Invitation]" CTA
  button and an **embedded QR code** of the setup link, generated server-side by
  the `qrcode` package in the Netlify function). The superadmin no longer fills in
  asociatie identity fields or sees a setup code. The admin fills in asociatie
  details during onboarding (T154).
- **MVP change (T154):** After account setup, an admin (kind = 'setup') is
  redirected to `OnboardingWizard` (enters asociatie name, address, CUI, etc.) then
  lands on the Apartamente page. A resident (kind = 'invite') still lands on `/app`.
- **MVP additions (T155-T156):** `ApartmentsPage` gains a "Descarca sablon .csv"
  button (downloadable 7-column template) and an "Import lista" button that parses
  the filled CSV, creates apartments + persons entries, and automatically sends
  invite emails to all `opt_in = true` rows with an email address.
- **Planned (BACKLOG T90), UI QR:** also render a scannable QR inside
  `InvitesAdminPage` for each issued invite (in addition to the QR already in the
  email from T153). Uses `qrcode.react`. **Planned (T128):** tokens stored hashed
  at rest on the live path.
- **Files:** `src/features/invites/{inviteLogic.ts,InvitesAdminPage.tsx}`,
  `src/shared/store/inviteStore.ts` (`consumeByToken`), `src/shared/lib/inviteCode.ts`
  (`generateInviteToken`, `buildOnboardingLink`), `src/shared/lib/csv.ts`
  (import/template), `src/platform/platformProvisioningLogic.ts` (`buildSetupLink`),
  `netlify/functions/invite-email.ts` (bilingual HTML + QR), `invites.*` locale
  keys (RO/EN), `/invitatii` bot command, `invite_codes` table (RLS admin-manage).

### Platform / Superadmin tier (planned — BACKLOG T20 → T91-T100)
- **Audience:** platform operators only (`super_admin`, ~2 accounts) — strictly separated from any tenant admin.
- **Not a tenant-toggleable F## feature:** this is a platform-level capability (like the helpers above), built as a **separate front-end app on its own subdomain** (e.g. `admin.vecini.online`), in this monorepo under `src/platform/*` with its own Vite build, sharing the Supabase client + domain types + i18n. The resident/admin app never ships the superadmin code.
- **Security model (the point of the separation):** the real protection is **database RLS + server-side `super_admin` re-checks**, not the frontend. A compromised *admin* stays scoped to a single asociație (enforced in Postgres) and every action they take is recorded in the tamper-evident audit log; they can never reach the superadmin tier or another asociație. A separate origin additionally isolates the superadmin **session** — an XSS in the resident/admin app cannot read a superadmin token. Privileged operations (account creation, impersonation) run in **Netlify functions using the service role** that re-verify the caller is `super_admin`; the client is never trusted. Superadmin accounts carry **mandatory, non-removable MFA**.
- **Capabilities (each a BACKLOG task):**
  - **Platform identity + cross-asociatie RLS (T91):** a platform-wide `super_admin` marker (not a per-asociație membership), an `is_super_admin()` SQL helper, and read-only cross-tenant RLS for the console.
  - **Server-side provisioning (T92):** the superadmin **creates an asociație and provisions its first admin**; that admin then onboards their own residents via invite codes (F-invites). Superadmin creates admins, admins add users.
  - **Mandatory hardened MFA (T100)** for every `super_admin` session.
  - **Separate app shell (T93) ✅:** the gated, separate-subdomain front-end is built under `src/platform/*` as a second Vite page (`platform.html`), with its own router, layout (topbar + left rail, theme/lang, sign-out), an overview landing, and a demo superadmin so it runs fully offline. Access is server-verified via `is_super_admin()` (T91) and never client-trusted; a separate `netlify-platform.toml` documents the subdomain deploy + tightest CSP. The console pages T94-T99 mount inside it.
  - **Asociații + admin management console (T94) ✅:** the first console page (`/consola/asociatii`) lists every asociație with members/apartments counts and a dormant/active signal, and provisions a new asociație with its first administrator. Offline it drives a persisted local platform store seeded from the demo dataset and mints a one-time setup code the operator hands to the new admin; the privileged live write (create the asociație + the admin's auth account across tenants) is the T92 service-role function, never the browser. Every provisioning is audited as the genesis of the new asociație's tamper-evident chain (`asociatie.provisioned` + `admin.provisioned`). Bilingual RO/EN, premium-feel.
  - **Cross-asociatie audit viewer (T95) ✅:** read-only aggregate of every asociație's tamper-evident T09 audit chain, so the superadmin sees what each admin is doing platform-wide. Per-asociație `verifyChain` integrity badges, the full T09 filter set plus an asociație filter, JSON/CSV export. Live: fetches via `hydrateAllAuditLogs()` (super_admin cross-tenant RLS); demo: seeded chains for all 3 demo asociații. 9 unit tests green.
  - **Platform error feed (T96):** scrubbed app errors (from the T07 reporting hook, no PII) surfaced so the superadmin can spot problems with the app.
  - **Usage/health metrics (T97):** per-asociație adoption + activity.
  - **Audited read-only impersonation (T98):** enter an asociație's context to diagnose, every entry/exit logged.
  - **Admin ↔ superadmin messenger (T99):** a bidirectional support thread per asociație (modeled on F04 `adminchat`) — admins raise issues to the superadmin and back. Admin side in the main app, superadmin inbox in the platform app.
- **Data (planned):** a platform-role store/table + `is_super_admin()`; cross-tenant read policies on `asociatii` / `memberships` / `audit_log`; an error-report store/table; the support-thread tables (reuse `private_threads`/`private_messages` shape). All scoped so only `super_admin` crosses tenant boundaries.
