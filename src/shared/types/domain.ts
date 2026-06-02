/** Shared domain types mirroring the Supabase schema (see /supabase/migrations). */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'presedinte'
  | 'comitet'
  | 'cenzor'
  | 'proprietar'
  | 'locatar';

export type Locale = 'ro' | 'en';

export interface Asociatie {
  id: string;
  name: string;
  slug: string;
  address: string;
  cui: string | null;
  registration_number: string | null;
  /** Bank account (IBAN) the asociație collects payments into. */
  iban: string | null;
  /** Public contact phone for the asociație. */
  contact_phone: string | null;
  /** Public contact email for the asociație. */
  contact_email: string | null;
  country: string;
  locale: Locale;
  timezone: string;
  currency: string;
  branding: Branding;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Branding {
  logo_url?: string;
  primary_color?: string;
  welcome_message?: string;
  email_sender_name?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: Locale;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  quiet_hours: { start: string; end: string };
}

export type NotificationChannel = 'inapp' | 'telegram' | 'email';

export interface Membership {
  id: string;
  user_id: string;
  asociatie_id: string;
  role: Role;
  title: string | null;
  joined_at: string;
  ended_at: string | null;
}

/** A resident manually recorded on an apartment by the admin. Lives embedded on
 *  the apartment (jsonb) so the building can be configured before any of these
 *  people hold an account; account-linked residency stays in apartment_residents. */
export interface ApartmentPerson {
  id: string;
  name: string;
  role: 'proprietar' | 'locatar';
  is_primary: boolean;
  /** Optional contact email the admin can record so this person can be invited
   *  by email later. Lives in the embedded jsonb (absent on older records), so
   *  no schema change is needed. */
  email?: string | null;
  /** Auth user id of the resident who claimed this entry by redeeming an invite
   *  linked to this apartment (T117). Absent on pre-account / unclaimed entries.
   *  Set server-side by redeem_onboarding_token; lives in the jsonb. */
  claimed_user_id?: string | null;
}

export interface Apartment {
  id: string;
  asociatie_id: string;
  scara: string | null;
  etaj: number | null;
  numar_apartament: string;
  suprafata_utila: number | null;
  cota_parte_indiviza: number | null;
  /** Headline occupant count, editable independently of the person list. */
  numar_persoane: number;
  /** Named occupants the admin has recorded for this apartment. */
  persons: ApartmentPerson[];
  proprietar_principal_name: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AsociatieFeature {
  id: string;
  asociatie_id: string;
  feature_key: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export type AnnouncementCategory = 'urgent' | 'important' | 'informativ' | 'eveniment';

export type Audience =
  | { type: 'all' }
  | { type: 'apartament'; ids: string[] }
  | { type: 'role'; role: Role }
  | { type: 'scara'; scari: string[] };

/** A file attached to an announcement (F01). Stored as a base64 data URL offline
 *  and as a Supabase Storage object path in the live path. */
export interface AnnouncementAttachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  /** Storage object path in the live path; null offline. */
  storage_path: string | null;
  /** Base64 data URL offline; null in the live (Storage) path. */
  file_data_url: string | null;
}

export interface Announcement {
  id: string;
  asociatie_id: string;
  author_user_id: string;
  title: string;
  body_html: string;
  category: AnnouncementCategory;
  audience: Audience;
  scheduled_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  /** Optional file attachments (F01). Absent on older persisted rows. */
  attachments?: AnnouncementAttachment[];
  created_at: string;
  updated_at: string;
}

export type PollType = 'yes_no' | 'single_choice' | 'multi_choice' | 'ranked';
export type MajorityRule = 'simple' | 'absolute' | 'qualified_2_3';

export interface Poll {
  id: string;
  asociatie_id: string;
  author_user_id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  weighted: boolean;
  quorum_percent: number;
  majority_rule: MajorityRule;
  opens_at: string | null;
  closes_at: string | null;
  audience: Audience;
  created_at: string;
  published_at: string | null;
  closed_at: string | null;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  apartment_id: string;
  voter_user_id: string;
  selected_option_ids: string[];
  ranked_options: Record<string, number> | null;
  weight: number;
  cast_at: string;
}

export type TicketStatus =
  | 'primit'
  | 'asignat'
  | 'in_lucru'
  | 'rezolvat'
  | 'verificat'
  | 'inchis'
  | 'respins';

export type TicketSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Ticket {
  id: string;
  asociatie_id: string;
  reporter_user_id: string;
  apartment_id: string | null;
  title: string;
  description: string;
  category: string;
  severity: TicketSeverity;
  location_scara: string | null;
  location_etaj: number | null;
  location_description: string | null;
  status: TicketStatus;
  assigned_to_user_id: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  resolution_notes: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface BuildingEvent {
  id: string;
  asociatie_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  asociatie_id: string;
  label: string;
  phone: string;
  category: string;
  sort_order: number;
}

export interface Alert {
  id: string;
  asociatie_id: string;
  sender_user_id: string;
  title: string;
  body: string;
  kind: string;
  sent_at: string;
  recipient_count: number;
}

export type Priority = 'low' | 'normal' | 'urgent';

export interface AppNotification {
  id: string;
  asociatie_id: string;
  user_id: string;
  template: string;
  title: string;
  body: string;
  link: string | null;
  data: Record<string, unknown>;
  priority: Priority;
  read_at: string | null;
  delivered_channels: NotificationChannel[];
  created_at: string;
}

/** F06 — neighbour-to-neighbour post (`resident_posts`). */
export type ResidentPostCategory = 'vand' | 'caut' | 'ofer' | 'info';

export interface ResidentPost {
  id: string;
  asociatie_id: string;
  author_user_id: string;
  author_name: string;
  category: ResidentPostCategory;
  title: string;
  body: string;
  photo_path: string | null;
  expires_at: string;
  created_at: string;
}

/** F07 — FAQ entry (`faq_entries`) with aggregate vote counts. */
export interface FaqEntry {
  id: string;
  asociatie_id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  helpful_count: number;
  not_helpful_count: number;
  /** Retired entries stay in the table (vote history preserved) but are hidden from residents. */
  archived: boolean;
}

/** F14 — idea-box submission (`ideas`). */
export type IdeaStatus = 'in_discutie' | 'aprobat' | 'implementat' | 'respins';

export interface Idea {
  id: string;
  asociatie_id: string;
  author_user_id: string;
  author_name: string;
  title: string;
  body: string;
  status: IdeaStatus;
  votes: number;
  created_at: string;
}

/** F18 — institutional repair log (`repair_records`). */
export type RepairSystem = 'apa' | 'electric' | 'lift' | 'incalzire' | 'structura' | 'altele';

export interface RepairRecord {
  id: string;
  asociatie_id: string;
  system: RepairSystem;
  title: string;
  description: string;
  contractor: string | null;
  cost: number | null;
  warranty_until: string | null;
  performed_at: string;
  created_at: string;
}

/** F20 — utility meter (`meters`) and reading (`meter_readings`). */
export type MeterKind = 'apa_rece' | 'apa_calda' | 'gaz' | 'incalzire';

export interface Meter {
  id: string;
  asociatie_id: string;
  apartment_id: string;
  kind: MeterKind;
  serial: string;
  last_value: number;
}

export interface MeterReading {
  id: string;
  asociatie_id: string;
  meter_id: string;
  value: number;
  photo_path: string | null;
  submitted_by: string;
  reading_date: string;
  created_at: string;
}

/** F36 — opt-in resident directory consent (`resident_directory_consent`). */
export interface DirectoryEntry {
  id: string;
  asociatie_id: string;
  user_id: string;
  name: string;
  apartment: string;
  phone: string;
  email: string;
  show_name: boolean;
  show_apartment: boolean;
  show_phone: boolean;
  show_email: boolean;
}

/** F38 — public thank-you wall post (`thank_yous`). */
export interface ThankYou {
  id: string;
  asociatie_id: string;
  from_user_id: string;
  from_name: string;
  to_apartment: string;
  message: string;
  created_at: string;
}

/** F40 — glossary term (`glossary_entries`). */
export interface GlossaryEntry {
  id: string;
  asociatie_id: string;
  term: string;
  definition: string;
}

/** F15 — non-binding opinion survey (`surveys` / `survey_responses`). */
export interface Survey {
  id: string;
  asociatie_id: string;
  title: string;
  options: string[];
  anonymous: boolean;
  closes_at: string | null;
  created_at: string;
}

/** Aggregate response counts keyed by option label. */
export type SurveyTally = Record<string, number>;

/** F24 — borrowable item registry (`lending_items`). */
export interface LendingItem {
  id: string;
  asociatie_id: string;
  owner_user_id: string;
  owner_name: string;
  name: string;
  category: string;
  photo_path: string | null;
  available: boolean;
  created_at: string;
}

/** F29 — bike room registry (`bikes`). */
export interface Bike {
  id: string;
  asociatie_id: string;
  owner_user_id: string;
  owner_name: string;
  description: string;
  serial: string | null;
  photo_path: string | null;
  abandoned: boolean;
  created_at: string;
}

/** F37 — opt-in pet directory (`pets`). */
export interface Pet {
  id: string;
  asociatie_id: string;
  owner_user_id: string;
  owner_name: string;
  name: string;
  species: string;
  photo_path: string | null;
  emergency_contact: string | null;
  lost: boolean;
  created_at: string;
}

/** F48 — equipment warranty tracker (`warranties`). */
export interface Warranty {
  id: string;
  asociatie_id: string;
  asset: string;
  purchased_at: string;
  warranty_months: number;
  expires_at: string;
  document_path: string | null;
}

/** F54 — suspicious-visitor log (`visitor_reports`). */
export type VisitorStatus = 'nou' | 'cunoscut' | 'rezolvat';

export interface VisitorReport {
  id: string;
  asociatie_id: string;
  reporter_user_id: string;
  reporter_name: string;
  note: string;
  photo_path: string | null;
  status: VisitorStatus;
  created_at: string;
}

/** F57 — internal marketplace listing (`marketplace_listings`). */
export interface MarketplaceListing {
  id: string;
  asociatie_id: string;
  seller_user_id: string;
  seller_name: string;
  category: string;
  title: string;
  description: string;
  price: number | null;
  photo_path: string | null;
  expires_at: string;
  created_at: string;
}

/** F65 — platform feedback (`platform_feedback`). */
export type FeedbackSentiment = 'idee' | 'problema' | 'lauda';

export interface PlatformFeedback {
  id: string;
  asociatie_id: string | null;
  user_id: string | null;
  anonymous: boolean;
  body: string;
  sentiment: FeedbackSentiment;
  created_at: string;
}

/** F33 — official document archive (`documents`). */
export interface DocumentRecord {
  id: string;
  asociatie_id: string;
  category: string;
  title: string;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  /** Base64 data URL stored offline in the local store; null in the live path (T89). */
  file_data_url: string | null;
  version: number;
  content_text: string | null;
  created_at: string;
}

/** F34 — supplier / contract catalog (`suppliers`). */
export interface Supplier {
  id: string;
  asociatie_id: string;
  name: string;
  kind: string;
  contact: string | null;
  account_number: string | null;
  contract_start: string | null;
  contract_end: string | null;
  last_invoice_date: string | null;
}

/** F30 — storage room / dependinți registry (`storage_units`). */
export interface StorageUnit {
  id: string;
  asociatie_id: string;
  label: string;
  apartment_id: string | null;
  apartment_label: string | null;
  notes: string | null;
}

/** F58 — opt-in carpooling profile (`carpool_profiles`). */
export interface CarpoolProfile {
  id: string;
  asociatie_id: string;
  user_id: string;
  user_name: string;
  destination: string;
  schedule: string;
}

/** F63 — opt-in birthday consent (`birthdays_consent`). Day/month only. */
export interface BirthdayConsent {
  id: string;
  asociatie_id: string;
  user_id: string;
  user_name: string;
  birth_day: number;
  birth_month: number;
}

/** F47 — building-wide energy consumption record (`energy_records`). */
export interface EnergyRecord {
  id: string;
  asociatie_id: string;
  /** ISO date for the first day of the period (month). */
  period: string;
  kind: string;
  amount: number;
  cost: number;
}

/** F45 — multi-year maintenance plan line item (`multiyear_plan_items`). */
export interface MultiyearPlanItem {
  id: string;
  asociatie_id: string;
  year: number;
  title: string;
  estimated_cost: number;
  notes: string | null;
}

/** F32 — temporary courier access code (`access_codes`). */
export interface AccessCode {
  id: string;
  asociatie_id: string;
  generated_by: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/** F59 — opt-in babysitting / pet-sitting profile (`sitter_profiles`). */
export interface SitterProfile {
  id: string;
  asociatie_id: string;
  user_id: string;
  user_name: string;
  /** 'babysitting' | 'petsitting' */
  kind: string;
  availability: string;
  rate: string;
}

/** F60 — skill exchange / barter offering (`skill_offerings`). */
export interface SkillOffering {
  id: string;
  asociatie_id: string;
  user_id: string;
  user_name: string;
  offers: string;
  needs: string;
}

/** F61 — group buy (`group_buys`). */
export interface GroupBuy {
  id: string;
  asociatie_id: string;
  organizer_user_id: string;
  organizer_name: string;
  title: string;
  description: string;
  deadline: string;
  created_at: string;
  /** Local signup tally (demo). */
  signups: number;
}

/** F19 — scheduled maintenance entry (`scheduled_maintenance`). */
export interface ScheduledMaintenance {
  id: string;
  asociatie_id: string;
  title: string;
  vendor: string | null;
  recurrence: string;
  last_done: string | null;
  next_due: string;
  notes: string | null;
}

/** F28 — parking spot with its (optional) assignment (`parking_spots` + `parking_assignments`). */
export interface ParkingSpot {
  id: string;
  asociatie_id: string;
  label: string;
  zone: string | null;
  is_visitor: boolean;
  apartment_label: string | null;
  license_plate: string | null;
}

/** F16 — internal petition (`petitions`) with demo signature tally. */
export interface Petition {
  id: string;
  asociatie_id: string;
  author_user_id: string;
  author_name: string;
  title: string;
  body: string;
  threshold_percent: number;
  status: string;
  created_at: string;
  /** Local signature tally (demo). */
  signatures: number;
  /** Apartment count used to compute the forwarding threshold (demo). */
  total_apartments: number;
}

/** F44 — small-project crowdfund (`crowdfunds`) with demo pledge total. */
export interface Crowdfund {
  id: string;
  asociatie_id: string;
  title: string;
  description: string;
  target_amount: number;
  deadline: string;
  created_at: string;
  /** Local pledged total in lei (demo). */
  pledged: number;
}

/** F51 — PSI (fire-safety) asset with its next due check (`psi_assets`). */
export interface PsiAsset {
  id: string;
  asociatie_id: string;
  asset: string;
  kind: string;
  location: string | null;
  next_check: string;
}

/** F52 — building insurance policy (`insurance_policies`). */
export interface InsurancePolicy {
  id: string;
  asociatie_id: string;
  insurer: string;
  policy_number: string;
  expires_at: string;
  document_path: string | null;
}

/** F53 — shared-space key holder record (`keys`). */
export interface KeyRecord {
  id: string;
  asociatie_id: string;
  space: string;
  holder_name: string;
  notes: string | null;
}

/** F05 — anonymous message to the comitet (`anonymous_messages`). Sender is
 *  stored for abuse prevention but hidden from the comitet at the app layer. */
export type AnonymousStatus = 'nou' | 'rezolvat';

export interface AnonymousMessage {
  id: string;
  asociatie_id: string;
  /** Present for the message owner (owner-RLS read) and in the offline store.
   *  Absent when the row is returned via `anonymous_messages_for_comitet` (the
   *  privacy-preserving function never projects sender identity). */
  sender_user_id?: string;
  body: string;
  status: AnonymousStatus;
  created_at: string;
}

/** F04 — private resident ↔ administrator channel (`private_threads` +
 *  `private_messages`). A thread groups one resident's conversation with the
 *  administrator; messages carry a read receipt for the counterpart. */
export type PrivateThreadStatus = 'open' | 'resolved';

/** Who wrote a private message: the resident party or the administrator. */
export type PrivateSender = 'resident' | 'admin';

export interface PrivateMessage {
  id: string;
  thread_id: string;
  /** Who wrote it — the resident or the administrator. */
  sender: PrivateSender;
  sender_name: string;
  body: string;
  created_at: string;
  /** Read by the recipient: a resident message is read by the administrator, an
   *  administrator message is read by the resident. Drives the unread badges on
   *  both sides of the inbox. */
  read: boolean;
}

export interface PrivateThread {
  id: string;
  asociatie_id: string;
  /** The resident party to the conversation (its only non-admin participant). */
  resident_user_id: string;
  resident_name: string;
  /** Apartment label of the resident party (e.g. "Ap. 5"), shown in the admin
   *  inbox so a thread is identifiable at a glance. Optional for legacy rows. */
  apartment_label?: string;
  subject: string;
  status: PrivateThreadStatus;
  created_at: string;
  messages: PrivateMessage[];
}

/** F11 — archived signed minutes / decisions (`pv_documents`). */
export interface PvDocument {
  id: string;
  asociatie_id: string;
  title: string;
  doc_date: string;
  category: string;
  content_text: string;
  storage_path: string | null;
  created_at: string;
}

/** F22 — contractor request for proposals (`rfps`) with its quotes. */
export type RfpStatus = 'deschis' | 'decis';

export interface RfpQuote {
  id: string;
  rfp_id: string;
  contractor: string;
  amount: number;
  selected: boolean;
}

export interface Rfp {
  id: string;
  asociatie_id: string;
  title: string;
  description: string;
  status: RfpStatus;
  created_at: string;
  quotes: RfpQuote[];
}

/** F23 — weekend duty rotation entry (`duty_volunteers` + `duty_schedule`). */
export interface DutySlot {
  id: string;
  asociatie_id: string;
  /** Saturday of the duty weekend (YYYY-MM-DD). */
  week_start: string;
  volunteer_user_id: string | null;
  volunteer_name: string | null;
  note: string | null;
}

/** F31 — shared green-space volunteer task (`green_space_tasks` + `task_signups`). */
export interface GreenTask {
  id: string;
  asociatie_id: string;
  title: string;
  /** Monday of the task week (YYYY-MM-DD). */
  week_start: string;
  volunteer_user_id: string | null;
  volunteer_name: string | null;
}

/** F39 — collaborative wiki page (`wiki_pages`). */
export interface WikiPage {
  id: string;
  asociatie_id: string;
  slug: string;
  title: string;
  body_md: string;
  updated_at: string;
}

/** F43 — vetted contractor with its aggregate rating (`contractors` + `contractor_ratings`). */
export interface Contractor {
  id: string;
  asociatie_id: string;
  name: string;
  specialty: string;
  price_tier: string;
  contact: string;
  last_used: string | null;
  available: boolean;
  /** Average rating 0–5 over recorded ratings (demo-aggregated). */
  rating: number;
  rating_count: number;
}

/** F55 — centralized alarm / detection system status (`alarm_systems` + `alarm_events`). */
export type AlarmStatus = 'ok' | 'test' | 'alarma' | 'defect';

export interface AlarmEvent {
  id: string;
  system_id: string;
  kind: string;
  occurred_at: string;
}

export interface AlarmSystem {
  id: string;
  asociatie_id: string;
  name: string;
  status: AlarmStatus;
  last_test: string | null;
  events: AlarmEvent[];
}

/** F02 — moderated discussion thread with its messages (`discussion_threads` +
 *  `discussion_messages`). */
export interface DiscussionMessage {
  id: string;
  thread_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface DiscussionThread {
  id: string;
  asociatie_id: string;
  topic: string;
  title: string;
  pinned: boolean;
  created_at: string;
  messages: DiscussionMessage[];
}

/** F12 — participatory budget cycle and its proposals (`budget_cycles` +
 *  `budget_proposals` + `budget_votes`). */
export type BudgetPhase = 'idei' | 'vot' | 'incheiat';

export interface BudgetProposal {
  id: string;
  cycle_id: string;
  title: string;
  cost: number;
  author_name: string;
  votes: number;
  /** Whether the current apartment has voted for this proposal (demo). */
  voted: boolean;
}

export interface BudgetCycle {
  id: string;
  asociatie_id: string;
  title: string;
  pool: number;
  phase: BudgetPhase;
  proposals: BudgetProposal[];
}

/** F10 — digital General Assembly (AGA), per Legea 196/2018. Tables `agas`,
 *  `aga_agenda_items`, `aga_attendees`, `aga_votes`. */
export type AgaStatus = 'convocata' | 'in_desfasurare' | 'incheiata';
export type AgaDecision = 'pentru' | 'contra' | 'abtinere';
/** A resident's attendance choice for an AGA (null = not yet answered). */
export type AgaRsvp = 'prezent' | 'absent' | 'procura' | null;

export interface AgaVoteCounts {
  pentru: number;
  contra: number;
  abtinere: number;
}

export interface AgaAgendaItem {
  id: string;
  aga_id: string;
  sort_order: number;
  title: string;
  description: string;
  /** Majority rule required to adopt this item (shared with the polls engine). */
  majority_rule: MajorityRule;
  /** Apartment votes already cast, excluding the current demo apartment. */
  votes: AgaVoteCounts;
  /** The current demo apartment's vote on this item, if cast. */
  my_vote: AgaDecision | null;
}

/** A procură (proxy) designation recorded for an AGA: one apartment grants a
 *  named holder the right to attend and vote on its behalf (Legea 196/2018
 *  art. 47). Recorded distinctly from direct attendance, and its per-item votes
 *  fold into the tally. Table `aga_attendees` with `is_proxy = true`. */
export interface AgaProxy {
  id: string;
  /** Display label of the apartment that granted the proxy. */
  grantor_apartment: string;
  /** Name of the person holding (exercising) the proxy. */
  proxy_holder: string;
  /** Filename of the uploaded procură document, or null when none attached. */
  document_name: string | null;
  /** Offline-only data URL of the uploaded document so it can be opened and
   *  verified; null when no document, or on the live path (the object lives in
   *  Storage under `aga_attendees.proxy_document_path`). */
  document_url: string | null;
  /** Votes cast on the grantor's behalf, keyed by agenda item id. */
  votes: Record<string, AgaDecision>;
}

export interface AgaMeeting {
  id: string;
  asociatie_id: string;
  title: string;
  /** ISO datetime of the assembly. */
  scheduled_at: string;
  location: string;
  scheduled_online: boolean;
  /** Quorum required for valid decisions, as a percent of all apartments. */
  required_quorum_percent: number;
  status: AgaStatus;
  total_apartments: number;
  /** Apartments represented (present or by proxy), excluding the current demo apartment. */
  represented_apartments: number;
  /** The current demo apartment's RSVP. */
  my_rsvp: AgaRsvp;
  agenda: AgaAgendaItem[];
  /** Procură designations recorded through the app (F10 proxy votes). */
  proxies: AgaProxy[];
}

/** F13 — major-project priority ranking (`project_priorities` +
 *  `priority_rankings`). `rank` is 1-based; lower means higher priority. */
export interface PriorityProject {
  id: string;
  asociatie_id: string;
  title: string;
  description: string;
  rank: number;
}

/** F25 — shared-laundry slot reservation (`bookable_resources` + `bookings`). */
export interface LaundryBooking {
  id: string;
  asociatie_id: string;
  resource: string;
  /** Reserved day (YYYY-MM-DD). */
  date: string;
  /** Slot label, e.g. "08:00–10:00". */
  slot: string;
  user_id: string;
  user_name: string;
}

/** Elevator/move booking — 3-hour windows (`bookable_resources` + `bookings`). */
export interface MovingBooking {
  id: string;
  asociatie_id: string;
  /** Reserved day (YYYY-MM-DD). */
  date: string;
  /** Slot label, e.g. "08:00–11:00". */
  slot: string;
  /** Destination floor for the move. */
  floor: string;
  user_id: string;
  user_name: string;
}

/** Community-room / terrace booking — 4-hour windows (`bookable_resources` + `bookings`). */
export interface VenueBooking {
  id: string;
  asociatie_id: string;
  /** Which venue — community room or terrace. */
  venue: string;
  /** Reserved day (YYYY-MM-DD). */
  date: string;
  /** Slot label, e.g. "10:00–14:00". */
  slot: string;
  /** What the booking is for. */
  purpose: string;
  user_id: string;
  user_name: string;
}

/** A single step in the new-resident welcome kit (`welcome_kit_templates`). */
export interface WelcomeKitItem {
  id: string;
  asociatie_id: string;
  /** Ordering within the kit (ascending). */
  order: number;
  /** Short step title, e.g. "Citește regulamentul". */
  title: string;
  /** One- or two-sentence explanation of the step. */
  body: string;
}

/** Age buckets used for the privacy-preserving kids registry (F64). */
export type KidsAgeBucket = '0-3' | '4-6' | '7-10' | '11-14' | '15-18';

/**
 * A parent's privacy-preserving registration of how many children they have in
 * an age bucket (`kids_age_ranges`). Names are never stored — only counts, so
 * the building can see "3 copii 7-10 ani" without identifying any child.
 */
export interface KidsAgeRange {
  id: string;
  asociatie_id: string;
  user_id: string;
  bucket: KidsAgeBucket;
  /** How many children this parent has in the bucket. */
  count: number;
}

/** A coordinated children/teens activity (`kids_events`). */
export interface KidsEvent {
  id: string;
  asociatie_id: string;
  /** Short activity title, e.g. "Întâlnire la locul de joacă". */
  title: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Free-text time, e.g. "17:00". */
  time: string;
  /** Where it happens, e.g. "Locul de joacă din curte". */
  location: string;
  /** Target age bucket, or 'all' for any age. */
  bucket: KidsAgeBucket | 'all';
  /** Optional details. */
  note: string;
  /** How many other parents have already said they will come. */
  interested: number;
  organizer_user_id: string;
  organizer_name: string;
  created_at: string;
}

/** F41 — lifecycle of a major works project. */
export type ProjectStatus = 'planificat' | 'in_curs' | 'finalizat' | 'suspendat';

/** State of a single phase within a project. */
export type ProjectPhaseStatus = 'asteptare' | 'in_curs' | 'finalizat';

/** A phase within a major-works project (`project_phases`). */
export interface ProjectPhase {
  id: string;
  /** Short phase name, e.g. "Demontare schelă". */
  name: string;
  status: ProjectPhaseStatus;
}

/**
 * F41 — a major-works project (`projects` + `project_phases` + `project_updates`):
 * anvelopare, schimbare instalație, reabilitare acoperiș. Percentage complete is
 * derived from the phases; budget tracks allocated vs spent.
 */
export interface Project {
  id: string;
  asociatie_id: string;
  /** Project title, e.g. "Reabilitare termică (anvelopare)". */
  title: string;
  description: string;
  /** Contractor handling the works (may be empty while still planning). */
  contractor: string;
  status: ProjectStatus;
  /** Lei budgeted for the project. */
  budget_allocated: number;
  /** Lei spent so far. */
  budget_spent: number;
  phases: ProjectPhase[];
  created_at: string;
}

/**
 * F42 — a photo-journal entry for a project (`project_photos`). In demo mode the
 * image is represented by a gradient `swatch` (no binary assets ship), with the
 * caption, date and optional phase carrying the time-lapse story.
 */
export interface ProjectPhoto {
  id: string;
  asociatie_id: string;
  /** Project this entry belongs to. */
  project_id: string;
  /** Denormalized project title so the journal renders without a join. */
  project_title: string;
  /** ISO date (YYYY-MM-DD) the photo was taken. */
  date: string;
  /** Short caption describing what the photo shows. */
  caption: string;
  /** Optional phase label, e.g. "Turnare șapă". */
  phase: string;
  /** Tailwind gradient classes standing in for the image in demo mode. */
  swatch: string;
  author_name: string;
  created_at: string;
}

/** F49 — a single trusted contact within an owner's safety profile. */
export interface TrustedContact {
  id: string;
  /** Who they are, e.g. "Andrei (fiul)". */
  name: string;
  /** Relationship label, e.g. "fiu", "vecin", "medic de familie". */
  relationship: string;
  /** Phone number, tap-to-call. */
  phone: string;
}

/**
 * F49 — Cod portari / vecini de încredere. A private, owner-only safety profile:
 * a passphrase to defeat phone scams ("dacă sun, întreabă parola X"), free-text
 * instructions, and a short list of trusted contacts. Stored encrypted at rest;
 * only the owner can read it (owner-only RLS on `safety_codes`).
 */
export interface SafetyProfile {
  id: string;
  asociatie_id: string;
  user_id: string;
  /** The agreed safety word/phrase a caller must know to be trusted. */
  passphrase: string;
  /** Free-text instructions for trusted relatives / the comitet. */
  note: string;
  contacts: TrustedContact[];
  updated_at: string;
}

/** F50 — kind of safety fixture marked on an evacuation plan. */
export type EvacuationEquipmentKind = 'stingator' | 'hidrant' | 'iesire' | 'tablou_electric';

/** F50 — one safety fixture on an evacuation plan (`evacuation_plans`). */
export interface EvacuationEquipment {
  id: string;
  kind: EvacuationEquipmentKind;
  /** Where it is, e.g. "Casa scării, etaj 2". */
  location: string;
}

/**
 * F50 — an evacuation plan for one scara (`evacuation_plans`): the evacuation
 * route described in text, plus the location of safety fixtures. In demo mode no
 * binary floor-plan image ships — the route text and fixture list carry the plan.
 */
export interface EvacuationPlan {
  id: string;
  asociatie_id: string;
  /** Stairwell this plan covers, e.g. "A". */
  scara: string;
  /** Step-by-step evacuation route, free text. */
  route: string;
  equipment: EvacuationEquipment[];
  updated_at: string;
}

/**
 * F50 — a pet marker (`pet_markers`): a resident declares that their apartment
 * has animals so firefighters know where to look during an evacuation.
 */
export interface PetMarker {
  id: string;
  asociatie_id: string;
  apartment_id: string;
  /** Denormalized apartment label, e.g. "Ap. 5 (et. 1)". */
  apartment_label: string;
  /** Short species note, e.g. "1 pisică", "2 câini". */
  species: string;
  user_id: string;
}
