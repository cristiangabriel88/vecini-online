/** Shared domain types mirroring the Supabase schema (see /supabase/migrations). */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'presedinte'
  | 'comitet'
  | 'cenzor'
  | 'proprietar'
  | 'chirias';

export type Locale = 'ro' | 'en';

export interface Asociatie {
  id: string;
  name: string;
  slug: string;
  address: string;
  cui: string | null;
  registration_number: string | null;
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

export interface Apartment {
  id: string;
  asociatie_id: string;
  scara: string | null;
  etaj: number | null;
  numar_apartament: string;
  suprafata_utila: number | null;
  cota_parte_indiviza: number | null;
  numar_persoane: number;
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
