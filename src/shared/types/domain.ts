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
