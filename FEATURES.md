# Features — BlocHub

Every feature below has a unique key (F01-F65). The admin can toggle each one on or off during onboarding and at any time afterwards. When Claude Code completes a feature, mark it with ✅ next to the title and a one-line note about the implementation.

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
- **Data:** `alerts`, `alert_acknowledgments`

### F04 — Mesagerie privată cu administratorul
- **Audience:** proprietar/chiriaș ↔ admin
- **Description:** Direct private channel between a resident and the administrator (not the comitet). For personal financial questions, sensitive complaints, etc.
- **Acceptance:** Threaded conversation, attachments allowed, read receipts. Admin sees all open threads in a queue with SLA timer.
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
- **Audience:** all read
- **Description:** Repository of official documents: statutul asociației, regulamentul de ordine interioară, contracte cu furnizorii (apa, gaz, salubritate), documente cadastrale. Searchable.
- **Acceptance:** Upload, categorize, search, version history.
- **Telegram:** `/documente` shows categories.
- **Data:** `documents`

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

### F65 — Feedback platformă (BlocHub)
- **Audience:** all (open to BlocHub team)
- **Description:** Residents and admins can submit feedback about BlocHub itself. Helps the developers improve. Optional thumbs-up/down on each feature.
- **Acceptance:** Submission form, anonymous option, public roadmap.
- **Telegram:** `/feedback`.
- **Data:** `platform_feedback`

---

## Implementation tracking

Status legend: ✅ implemented UI end-to-end · 🟦 schema + RLS + registered/toggleable, UI not yet built in this session.

Every feature has its database table(s) with RLS in `supabase/migrations/` and is
toggleable from the admin panel. See `DECISIONS.md` for the scope boundary.

| Key | Title | Status | Notes |
|-----|-------|--------|-------|
| F01 | Anunțuri oficiale | ✅ | Compose/publish, categories, read receipts; DOMPurify-sanitized HTML; tables + GIN search + RLS. |
| F02 | Canal de discuții moderat | 🟦 | Tables `discussion_*`, `moderation_actions` + RLS. |
| F03 | Alertă de bloc (urgență) | ✅ | Send flow with double-confirm bypassing quiet hours; recipient count. |
| F04 | Mesagerie privată cu administratorul | 🟦 | Tables `private_threads/messages` + RLS. |
| F05 | Mesaj anonim către comitet | 🟦 | Table `anonymous_messages` (sender hidden at app layer) + RLS. |
| F06 | Anunțuri vecini (locator) | ✅ | Compose neighbour posts with category + 14-day auto-archive; expiry logic unit-tested; `/locator` bot command. Table `resident_posts` + owner RLS. |
| F07 | Întrebări frecvente (FAQ) | ✅ | Searchable FAQ (diacritic-insensitive) with helpful/not-helpful voting; search + ratio logic unit-tested; `/faq` bot command. Tables `faq_entries/votes` + RLS. |
| F08 | Calendar de evenimente | ✅ | Upcoming list, RSVP toggle, counts; tables `events/event_rsvps`. |
| F09 | Vot rapid pe propuneri | ✅ | Vote with confirm, live bars; quorum/majority tally logic unit-tested. |
| F10 | AGA digitală | 🟦 | Tables `agas`, `aga_agenda_items/attendees/votes` + RLS. |
| F11 | Procese verbale (arhivă) | 🟦 | Table `pv_documents` with full-text search + RLS. |
| F12 | Buget participativ | 🟦 | Tables `budget_cycles/proposals/votes` + RLS. |
| F13 | Prioritizare proiecte mari | 🟦 | Tables `project_priorities`, `priority_rankings` + RLS. |
| F14 | Cutie de idei | ✅ | Submit ideas, one-vote upvoting, status badges, vote-ranked list; ranking + top-N promotion logic unit-tested; `/idei` bot command. Tables `ideas`, `idea_votes/comments` + RLS. |
| F15 | Sondaje de opinie | 🟦 | Tables `surveys`, `survey_responses` + RLS. |
| F16 | Petiții interne | 🟦 | Tables `petitions`, `petition_signatures` + RLS. |
| F17 | Sesizări cu foto | ✅ | Create with severity/category/location; SLA logic unit-tested; status badges. |
| F18 | Istoric reparații | ✅ | Searchable repair log with system filter, cost/contractor, and warranty-expiry badges (active/expiring/expired); search + warranty logic unit-tested; `/istoric_reparatii` bot command. Table `repair_records` + RLS. |
| F19 | Calendar service-uri programate | 🟦 | Tables `scheduled_maintenance`, `maintenance_log` + RLS. |
| F20 | Citire contoare | 🟦 | Tables `meters`, `meter_readings` + RLS. |
| F21 | Sesizări recurente | 🟦 | Computed over `tickets`. |
| F22 | Solicitare oferte (RFP) | 🟦 | Tables `rfps`, `rfp_quotes`, `contractor_recommendations` + RLS. |
| F23 | Vecin de gardă | 🟦 | Tables `duty_volunteers`, `duty_schedule` + RLS. |
| F24 | Listă obiecte împrumutabile | 🟦 | Tables `lending_items/records` + owner RLS. |
| F25 | Rezervare spălătorie | 🟦 | Tables `bookable_resources`, `bookings` + owner RLS. |
| F26 | Rezervare lift pentru mutare | 🟦 | Uses `bookings` (resource_type) + RLS. |
| F27 | Rezervare sală comună / terasă | 🟦 | Uses `bookings`, `booking_inspections` + RLS. |
| F28 | Parcare | 🟦 | Tables `parking_spots/assignments/reports` + RLS. |
| F29 | Bicicletăria | 🟦 | Table `bikes` + owner RLS. |
| F30 | Boxa / dependinți | 🟦 | Table `storage_units` + RLS. |
| F31 | Plante / spații verzi | 🟦 | Tables `green_space_tasks`, `task_signups` + RLS. |
| F32 | Acces curierat (cod temporar) | 🟦 | Table `access_codes` + RLS. |
| F33 | Document arhivă | 🟦 | Table `documents` with full-text search + RLS. |
| F34 | Furnizori / contracte | 🟦 | Tables `suppliers`, `supplier_complaints` + RLS. |
| F35 | Apartament info | 🟦 | Views across apartments/readings/tickets/votes. |
| F36 | Locator directory | 🟦 | Table `resident_directory_consent` + owner RLS. |
| F37 | Pet directory | 🟦 | Table `pets` + owner RLS. |
| F38 | Carte de aur (mulțumiri) | 🟦 | Table `thank_yous` + RLS. |
| F39 | Wiki bloc | 🟦 | Tables `wiki_pages/revisions/suggested_edits` + search + RLS. |
| F40 | Glosar de termeni | 🟦 | Table `glossary_entries` + RLS. |
| F41 | Project tracker | 🟦 | Tables `projects`, `project_phases/updates` + RLS. |
| F42 | Project photo journal | 🟦 | Table `project_photos` + RLS. |
| F43 | Contractor library | 🟦 | Tables `contractors`, `contractor_ratings` + RLS. |
| F44 | Crowdfunding proiecte mici | 🟦 | Tables `crowdfunds`, `pledges` + RLS. |
| F45 | Plan multianual de mentenanță | 🟦 | Table `multiyear_plan_items` + RLS. |
| F46 | Recomandări fond de reparații | 🟦 | Computed; calculator helper to come. |
| F47 | Energy efficiency tracker | 🟦 | Table `energy_records` + RLS. |
| F48 | Garanție tracker | 🟦 | Table `warranties` + RLS. |
| F49 | Cod portari / vecini de încredere | 🟦 | Table `safety_codes` (owner-only RLS, encrypted payload). |
| F50 | Plan de evacuare | 🟦 | Tables `evacuation_plans`, `pet_markers` + RLS. |
| F51 | Verificări PSI | 🟦 | Tables `psi_assets`, `psi_checks` + RLS. |
| F52 | Asigurare bloc | 🟦 | Tables `insurance_policies/claims` + RLS. |
| F53 | Registru de chei | 🟦 | Tables `keys`, `key_handovers` + RLS. |
| F54 | Vizitatori / străini observați | 🟦 | Table `visitor_reports` + RLS. |
| F55 | Sistem alarmă (status) | 🟦 | Tables `alarm_systems`, `alarm_events` + RLS. |
| F56 | Numere de urgență localizate | ✅ | Tap-to-call list; table `emergency_contacts` + RLS; seeded. |
| F57 | Marketplace intern | 🟦 | Table `marketplace_listings` + owner RLS. |
| F58 | Carpooling | 🟦 | Table `carpool_profiles` + owner RLS. |
| F59 | Babysitting / pet-sitting | 🟦 | Tables `sitter_profiles/ratings` + RLS. |
| F60 | Skill exchange / barter | 🟦 | Tables `skill_offerings`, `skill_exchanges` + RLS. |
| F61 | Grupuri de cumpărături comune | 🟦 | Tables `group_buys`, `group_buy_signups` + RLS. |
| F62 | Welcome kit for new residents | 🟦 | Table `welcome_kit_templates` + RLS. |
| F63 | Aniversări (opt-in) | 🟦 | Table `birthdays_consent` + owner RLS. |
| F64 | Activități copii și adolescenți | 🟦 | Tables `kids_age_ranges`, `kids_events` + RLS. |
| F65 | Feedback platformă | 🟦 | Table `platform_feedback` + insert RLS. |
