import type {
  Alert,
  Announcement,
  Apartment,
  Asociatie,
  BirthdayConsent,
  Bike,
  BuildingEvent,
  CarpoolProfile,
  AccessCode,
  DocumentRecord,
  EmergencyContact,
  EnergyRecord,
  FaqEntry,
  GlossaryEntry,
  GroupBuy,
  Idea,
  LendingItem,
  MarketplaceListing,
  Meter,
  MeterReading,
  MultiyearPlanItem,
  Pet,
  PlatformFeedback,
  SitterProfile,
  SkillOffering,
  Poll,
  PollOption,
  RepairRecord,
  ResidentPost,
  StorageUnit,
  Supplier,
  Survey,
  SurveyTally,
  DirectoryEntry,
  ThankYou,
  Ticket,
  VisitorReport,
  Warranty,
  ScheduledMaintenance,
  ParkingSpot,
  Petition,
  Crowdfund,
  PsiAsset,
  InsurancePolicy,
  KeyRecord,
  AnonymousMessage,
  PrivateThread,
  PvDocument,
  Rfp,
  DutySlot,
  GreenTask,
  WikiPage,
  Contractor,
  AlarmSystem,
  DiscussionThread,
  AgaMeeting,
  BudgetCycle,
  PriorityProject,
  LaundryBooking,
  MovingBooking,
  VenueBooking,
  WelcomeKitItem,
  KidsAgeRange,
  KidsEvent,
  Project,
  ProjectPhoto,
  SafetyProfile,
  EvacuationPlan,
  PetMarker,
} from '@/shared/types/domain';
import type { InviteCode } from '@/features/invites/inviteLogic';
import type { AppNotification } from '@/features/notifications/notificationLogic';
import { FEATURES } from '@/shared/features/registry';

export const DEMO_ASOCIATIE: Asociatie = {
  id: 'demo-asoc',
  name: 'Asociația de Proprietari Bloc 12, Scara A',
  slug: 'bloc-12-scara-a',
  address: 'Str. Aleea Teilor nr. 12, Sector 4, București',
  cui: '12345678',
  registration_number: '4521/2019',
  iban: 'RO49AAAA1B31007593840000',
  contact_phone: '+40 21 555 0123',
  contact_email: 'contact@bloc12.ro',
  country: 'RO',
  locale: 'ro',
  timezone: 'Europe/Bucharest',
  currency: 'RON',
  branding: { primary_color: '#2563eb', welcome_message: 'Bine ai venit în comunitatea blocului nostru!' },
  settings: { scari: ['A', 'B'] },
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2026-05-01T08:00:00Z',
  deleted_at: null,
};

/**
 * The demo asociație is a full showcase: every implemented module is enabled so
 * the offline app is completely explorable (and the per-feature E2E happy paths
 * can reach each page). This is intentionally broader than the curated
 * `RECOMMENDED_FEATURES` starter set a real new asociație gets at onboarding.
 * With the T44 route guard now blocking disabled modules by URL, a feature must
 * be enabled here to be reachable in demo, so the showcase set is the right
 * default. See DECISIONS.md.
 */
export const DEMO_FEATURES: Record<string, boolean> = Object.fromEntries(
  FEATURES.filter((f) => f.implemented).map((f) => [f.key, true]),
);

export const DEMO_APARTMENTS: Apartment[] = [
  { id: 'ap-1', asociatie_id: 'demo-asoc', scara: 'A', etaj: 0, numar_apartament: '1', suprafata_utila: 54.2, cota_parte_indiviza: 0.041, numar_persoane: 2, persons: [{ id: 'pe-1a', name: 'Ionescu Maria', role: 'proprietar', is_primary: true }, { id: 'pe-1b', name: 'Ionescu Radu', role: 'locatar', is_primary: false }], proprietar_principal_name: 'Ionescu Maria', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-2', asociatie_id: 'demo-asoc', scara: 'A', etaj: 1, numar_apartament: '5', suprafata_utila: 63.8, cota_parte_indiviza: 0.048, numar_persoane: 3, persons: [{ id: 'pe-2a', name: 'Popescu Andrei', role: 'proprietar', is_primary: true }, { id: 'pe-2b', name: 'Popescu Ioana', role: 'locatar', is_primary: false }, { id: 'pe-2c', name: 'Popescu Matei', role: 'locatar', is_primary: false }], proprietar_principal_name: 'Popescu Andrei', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-3', asociatie_id: 'demo-asoc', scara: 'A', etaj: 2, numar_apartament: '9', suprafata_utila: 71.0, cota_parte_indiviza: 0.054, numar_persoane: 4, persons: [{ id: 'pe-3a', name: 'Georgescu Elena', role: 'proprietar', is_primary: true }], proprietar_principal_name: 'Georgescu Elena', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-4', asociatie_id: 'demo-asoc', scara: 'A', etaj: 3, numar_apartament: '13', suprafata_utila: 54.2, cota_parte_indiviza: 0.041, numar_persoane: 1, persons: [{ id: 'pe-4a', name: 'Dumitrescu Vasile', role: 'proprietar', is_primary: true }], proprietar_principal_name: 'Dumitrescu Vasile', is_active: true, notes: null, created_at: '', updated_at: '' },
  { id: 'ap-5', asociatie_id: 'demo-asoc', scara: 'A', etaj: 4, numar_apartament: '17', suprafata_utila: 63.8, cota_parte_indiviza: 0.048, numar_persoane: 2, persons: [{ id: 'pe-5a', name: 'Stan Gabriela', role: 'locatar', is_primary: true }, { id: 'pe-5b', name: 'Stan Mihai', role: 'locatar', is_primary: false }], proprietar_principal_name: 'Stan Gabriela', is_active: true, notes: null, created_at: '', updated_at: '' },
];

/**
 * Seed invite codes so the apartments surface can show both onboarding states
 * offline: the code on Ap. 9 (`ap-3`) has been redeemed, so that apartment reads
 * as "registered"; the others have no redeemed code and offer the invite action.
 * Tokens/codes are fixed demo values (real ones are CSPRNG-minted at issue time).
 */
export const DEMO_INVITES: InviteCode[] = [
  {
    id: 'inv-demo-1',
    asociatieId: 'demo-asoc',
    code: 'GEOR2345',
    token: 'a3f1c0d29b4e6705182a3b4c5d6e7f8091a2b3c4d5e6f70819a2b3c4d5e6f708',
    role: 'proprietar',
    apartmentId: 'ap-3',
    expiresAt: null,
    singleUse: true,
    consumedAt: Date.parse('2026-05-22T09:30:00Z'),
    consumedByUserId: 'u-georgescu',
    revokedAt: null,
    createdAt: Date.parse('2026-05-21T08:00:00Z'),
    createdBy: 'u-admin',
    inviteeName: 'Georgescu Elena',
    inviteeEmail: 'elena.georgescu@example.ro',
    asociatieName: 'Asociația de Proprietari Bloc 12, Scara A',
    emailSentAt: Date.parse('2026-05-21T08:01:00Z'),
    emailDeliveredAt: null,
  },
];

/**
 * Demo notifications for the admin persona (T126). The `membership.joined`
 * entry reflects Georgescu Elena redeeming her invite on 2026-05-22.
 * All notifications are addressed to `DEMO_CURRENT_USER_ID` because every
 * demo persona shares the same user id (`'u-res'`), so they are visible
 * regardless of the role the demo entry uses.
 */
export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-demo-1',
    userId: 'u-res',
    asociatieId: 'demo-asoc',
    kind: 'membership.joined',
    title: '',
    body: '',
    link: '/app/admin/invitatii',
    priority: 'normal',
    readAt: null,
    createdAt: Date.parse('2026-05-22T09:31:00Z'),
    data: { name: 'Georgescu Elena', role: 'proprietar' },
  },
  {
    id: 'notif-demo-2',
    userId: 'u-res',
    asociatieId: 'demo-asoc',
    kind: 'announcement.published',
    title: 'Întrerupere apă caldă — 25 mai',
    body: 'Anunț publicat de administrator.',
    link: '/app/anunturi',
    priority: 'normal',
    readAt: Date.parse('2026-05-20T10:05:00Z'),
    createdAt: Date.parse('2026-05-20T10:00:00Z'),
    data: {},
  },
];

/** The resident the demo signs in as: Popescu Andrei, owner of Ap. 5 (`ap-2`),
 *  whose meters and tickets back the "Informații apartament" (F35) view. */
export const DEMO_CURRENT_USER_ID = 'u-res';
export const DEMO_CURRENT_USER_NAME = 'Popescu Andrei';
export const DEMO_CURRENT_APARTMENT_ID = 'ap-2';

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an-1', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Întrerupere apă caldă — 25 mai',
    body_html: '<p>Se va întrerupe apa caldă <strong>mâine între 09:00 și 14:00</strong> pentru lucrări la centrala termică. Vă mulțumim pentru înțelegere.</p>',
    category: 'important', audience: { type: 'all' },
    scheduled_at: null, published_at: '2026-05-20T10:00:00Z', expires_at: null,
    created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z',
  },
  {
    id: 'an-2', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Adunarea Generală anuală — 5 iunie, ora 18:00',
    body_html: '<p>Vă invităm la Adunarea Generală anuală care va avea loc în holul de la parter. Ordinea de zi va fi afișată la avizier și în aplicație.</p>',
    category: 'eveniment', audience: { type: 'all' },
    scheduled_at: null, published_at: '2026-05-18T09:00:00Z', expires_at: null,
    created_at: '2026-05-18T09:00:00Z', updated_at: '2026-05-18T09:00:00Z',
  },
  {
    id: 'an-3', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Curățenie generală pe casa scării',
    body_html: '<p>Sâmbătă, 24 mai, firma de curățenie va efectua spălarea generală a casei scării. Vă rugăm să nu lăsați obiecte pe holuri.</p>',
    category: 'informativ', audience: { type: 'scara', scari: ['A'] },
    scheduled_at: null, published_at: '2026-05-15T12:00:00Z', expires_at: null,
    created_at: '2026-05-15T12:00:00Z', updated_at: '2026-05-15T12:00:00Z',
  },
];

/**
 * One past emergency alert (F03) so the offline Alerte page is populated and the
 * history view is explorable. `recipient_count` reflects the demo building's
 * residents at the time it was sent.
 */
export const DEMO_ALERTS: Alert[] = [
  {
    id: 'al-1',
    asociatie_id: 'demo-asoc',
    sender_user_id: 'u-admin',
    title: 'Scurgere de gaz — evacuați scara A',
    body: 'S-a semnalat miros puternic de gaz pe scara A. Evacuați imediat și nu folosiți întrerupătoare sau lifturi. Pompierii au fost anunțați.',
    kind: 'emergency',
    sent_at: '2026-04-12T19:42:00Z',
    recipient_count: 9,
  },
];

export const DEMO_POLL_OPTIONS: PollOption[] = [
  { id: 'po-1', poll_id: 'poll-1', label: 'Pentru', sort_order: 0 },
  { id: 'po-2', poll_id: 'poll-1', label: 'Contra', sort_order: 1 },
  { id: 'po-3', poll_id: 'poll-1', label: 'Abținere', sort_order: 2 },
];

export const DEMO_POLLS: Poll[] = [
  {
    id: 'poll-1', asociatie_id: 'demo-asoc', author_user_id: 'u-admin',
    title: 'Înlocuirea interfonului audio cu unul video',
    description: 'Comitetul propune înlocuirea interfonului audio cu unul video. Cost estimat: 12.500 lei din fondul de reparații.',
    poll_type: 'yes_no', weighted: false, quorum_percent: 50, majority_rule: 'simple',
    opens_at: '2026-05-19T00:00:00Z', closes_at: '2026-05-28T23:59:00Z', audience: { type: 'all' },
    created_at: '2026-05-19T00:00:00Z', published_at: '2026-05-19T00:00:00Z', closed_at: null,
  },
];

export const DEMO_VOTE_COUNTS: Record<string, number> = { 'po-1': 18, 'po-2': 4, 'po-3': 3 };

export const DEMO_TICKETS: Ticket[] = [
  {
    id: 't-1', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-3',
    title: 'Bec ars pe casa scării, etajul 4', description: 'Becul de pe palierul etajului 4 nu mai funcționează de două zile.',
    category: 'iluminat', severity: 'low', location_scara: 'A', location_etaj: 4, location_description: 'Palier etaj 4',
    status: 'in_lucru', assigned_to_user_id: 'u-admin', sla_due_at: '2026-05-23T18:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-19T15:30:00Z', updated_at: '2026-05-20T09:00:00Z',
  },
  {
    id: 't-2', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-1',
    title: 'Infiltrație în garaj', description: 'Apare apă pe peretele din dreapta intrării în garaj după ploaie.',
    category: 'apa', severity: 'high', location_scara: 'A', location_etaj: -1, location_description: 'Garaj subsol',
    status: 'primit', assigned_to_user_id: null, sla_due_at: '2026-05-22T12:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-21T08:15:00Z', updated_at: '2026-05-21T08:15:00Z',
  },
  // F21 — a recurring lift breakdown (same kind + place, four times in the
  // window, high severity) that should surface as a structural-fix pattern.
  {
    id: 't-3', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res2', apartment_id: 'ap-9',
    title: 'Liftul s-a blocat din nou', description: 'Liftul s-a oprit între etaje și a trebuit chemată firma de intervenție.',
    category: 'lift', severity: 'high', location_scara: 'A', location_etaj: null, location_description: 'Lift, scara A',
    status: 'rezolvat', assigned_to_user_id: 'u-admin', sla_due_at: '2026-03-01T08:00:00Z',
    resolved_at: '2026-02-28T16:00:00Z', verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-02-28T07:30:00Z', updated_at: '2026-02-28T16:00:00Z',
  },
  {
    id: 't-4', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res3', apartment_id: 'ap-17',
    title: 'Lift oprit la parter', description: 'Ușile liftului nu se mai închideau, a rămas blocat la parter.',
    category: 'lift', severity: 'medium', location_scara: 'A', location_etaj: null, location_description: 'Lift, scara A',
    status: 'rezolvat', assigned_to_user_id: 'u-admin', sla_due_at: '2026-03-25T08:00:00Z',
    resolved_at: '2026-03-23T11:00:00Z', verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-03-22T18:40:00Z', updated_at: '2026-03-23T11:00:00Z',
  },
  {
    id: 't-5', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-5',
    title: 'Iar s-a stricat liftul', description: 'Liftul face un zgomot puternic și se oprește brusc între etaje.',
    category: 'lift', severity: 'high', location_scara: 'A', location_etaj: null, location_description: 'Lift, scara A',
    status: 'rezolvat', assigned_to_user_id: 'u-admin', sla_due_at: '2026-04-16T08:00:00Z',
    resolved_at: '2026-04-16T09:00:00Z', verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-04-15T12:10:00Z', updated_at: '2026-04-16T09:00:00Z',
  },
  {
    id: 't-6', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res2', apartment_id: 'ap-9',
    title: 'Lift blocat din nou', description: 'A treia oprire în această primăvară. Firma a venit iar.',
    category: 'lift', severity: 'high', location_scara: 'A', location_etaj: null, location_description: 'Lift, scara A',
    status: 'in_lucru', assigned_to_user_id: 'u-admin', sla_due_at: '2026-05-13T08:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-12T08:05:00Z', updated_at: '2026-05-12T09:00:00Z',
  },
  // F21 — a recurring but low-severity light fault on scara B's stairwell:
  // three times in the window, points at routine maintenance rather than works.
  {
    id: 't-7', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res3', apartment_id: 'ap-17',
    title: 'Bec ars pe casa scării', description: 'Becul de pe palierul de la etajul 2 nu mai merge.',
    category: 'iluminat', severity: 'low', location_scara: 'B', location_etaj: null, location_description: 'Casa scării, scara B',
    status: 'rezolvat', assigned_to_user_id: 'u-admin', sla_due_at: '2026-03-17T08:00:00Z',
    resolved_at: '2026-03-12T10:00:00Z', verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-03-10T19:00:00Z', updated_at: '2026-03-12T10:00:00Z',
  },
  {
    id: 't-8', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', apartment_id: 'ap-5',
    title: 'S-a ars iar becul pe scară', description: 'Tot palierul de la etajul 2 e pe întuneric seara.',
    category: 'iluminat', severity: 'low', location_scara: 'B', location_etaj: null, location_description: 'Casa scării, scara B',
    status: 'rezolvat', assigned_to_user_id: 'u-admin', sla_due_at: '2026-04-15T08:00:00Z',
    resolved_at: '2026-04-10T10:00:00Z', verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-04-08T20:30:00Z', updated_at: '2026-04-10T10:00:00Z',
  },
  {
    id: 't-9', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res2', apartment_id: 'ap-9',
    title: 'Bec ars din nou pe scara B', description: 'Se ard becurile foarte des aici, poate e o problemă la dulie.',
    category: 'iluminat', severity: 'low', location_scara: 'B', location_etaj: null, location_description: 'Casa scării, scara B',
    status: 'primit', assigned_to_user_id: null, sla_due_at: '2026-05-16T08:00:00Z',
    resolved_at: null, verified_at: null, resolution_notes: null, rating: null,
    created_at: '2026-05-09T21:15:00Z', updated_at: '2026-05-09T21:15:00Z',
  },
];

export const DEMO_EVENTS: BuildingEvent[] = [
  { id: 'ev-1', asociatie_id: 'demo-asoc', title: 'Adunarea Generală anuală', description: 'Discutarea bugetului și a lucrărilor de anvelopare.', location: 'Holul de la parter', starts_at: '2026-06-05T18:00:00Z', ends_at: '2026-06-05T20:00:00Z', category: 'AGA', created_by: 'u-admin', created_at: '2026-05-18T09:00:00Z' },
  { id: 'ev-2', asociatie_id: 'demo-asoc', title: 'Deratizare programată', description: 'Firma autorizată va efectua deratizarea spațiilor comune.', location: 'Subsol și spații comune', starts_at: '2026-05-28T09:00:00Z', ends_at: '2026-05-28T12:00:00Z', category: 'mentenanță', created_by: 'u-admin', created_at: '2026-05-15T09:00:00Z' },
];

// F08 — attendee base counts per seeded event (residents already attending,
// excluding the current resident's own RSVP, which is added live).
export const DEMO_EVENT_ATTENDEES: Record<string, number> = { 'ev-1': 7, 'ev-2': 5 };

export const DEMO_EMERGENCY: EmergencyContact[] = [
  { id: 'em-1', asociatie_id: 'demo-asoc', label: 'Urgențe (SNUAU)', phone: '112', category: 'general', sort_order: 0 },
  { id: 'em-2', asociatie_id: 'demo-asoc', label: 'Dispecerat lift', phone: '+40 21 555 0123', category: 'lift', sort_order: 1 },
  { id: 'em-3', asociatie_id: 'demo-asoc', label: 'Avarii apă (dispecerat local)', phone: '+40 21 555 0456', category: 'apa', sort_order: 2 },
  { id: 'em-4', asociatie_id: 'demo-asoc', label: 'Avarii gaz (Distrigaz)', phone: '+40 800 800 928', category: 'gaz', sort_order: 3 },
  { id: 'em-5', asociatie_id: 'demo-asoc', label: 'Administrator', phone: '+40 721 234 567', category: 'admin', sort_order: 4 },
  { id: 'em-6', asociatie_id: 'demo-asoc', label: 'Președinte comitet', phone: '+40 722 345 678', category: 'comitet', sort_order: 5 },
];

// F06 — Anunțuri vecini (locator). Expiries are kept in the future relative to
// the seeded "now" (2026-05) so the demo always shows live posts.
export const DEMO_RESIDENT_POSTS: ResidentPost[] = [
  { id: 'rp-1', asociatie_id: 'demo-asoc', author_user_id: 'u-res', author_name: 'Popescu Andrei', category: 'vand', title: 'Vând bicicletă copii 20"', body: 'Bicicletă în stare bună, folosită un sezon. 250 lei, negociabil. Sun la interfon ap. 5.', photo_path: null, expires_at: '2026-06-02T10:00:00Z', created_at: '2026-05-19T10:00:00Z' },
  { id: 'rp-2', asociatie_id: 'demo-asoc', author_user_id: 'u-res2', author_name: 'Georgescu Elena', category: 'caut', title: 'Caut o pisică pierdută (tărcată)', body: 'A fugit pisica noastră tărcată, răspunde la „Miru”. Dacă o vedeți pe casa scării, vă rog sunați la ap. 9.', photo_path: null, expires_at: '2026-05-31T08:00:00Z', created_at: '2026-05-17T08:00:00Z' },
  { id: 'rp-3', asociatie_id: 'demo-asoc', author_user_id: 'u-res3', author_name: 'Stan Gabriela', category: 'info', title: 'Vine bunica săptămâna viitoare', body: 'Posibil să se audă geamuri trântite la et. 4. Vă rog să aveți răbdare, e în vizită câteva zile.', photo_path: null, expires_at: '2026-05-30T18:00:00Z', created_at: '2026-05-16T18:00:00Z' },
];

// F07 — Întrebări frecvente (FAQ).
export const DEMO_FAQ: FaqEntry[] = [
  { id: 'faq-1', asociatie_id: 'demo-asoc', category: 'Utilități', question: 'Când vine apa caldă după întreruperi?', answer: 'După reluarea furnizării, apa caldă ajunge la etajele superioare în 20–40 de minute. Lăsați robinetul deschis până se elimină aerul din instalație.', sort_order: 0, helpful_count: 12, not_helpful_count: 1, archived: false },
  { id: 'faq-2', asociatie_id: 'demo-asoc', category: 'Contoare', question: 'Cum citesc corect contorul de apă?', answer: 'Citiți doar cifrele negre (mc), ignorând cifrele roșii (litri). Trimiteți indexul între 1 și 5 ale lunii din secțiunea „Citire contoare”.', sort_order: 1, helpful_count: 9, not_helpful_count: 0, archived: false },
  { id: 'faq-3', asociatie_id: 'demo-asoc', category: 'Plăți', question: 'Ce este fondul de rulment?', answer: 'Este o sumă de garanție pe care o depune fiecare apartament, folosită de asociație pentru a acoperi facturile până la încasarea cotelor lunare.', sort_order: 2, helpful_count: 7, not_helpful_count: 2, archived: false },
];

// F14 — Cutie de idei.
export const DEMO_IDEAS: Idea[] = [
  { id: 'idea-1', asociatie_id: 'demo-asoc', author_user_id: 'u-res', author_name: 'Popescu Andrei', title: 'Bancă nouă în fața blocului', body: 'O bancă la intrare ar ajuta vârstnicii să se odihnească. Cost estimativ 600 lei.', status: 'in_discutie', votes: 14, created_at: '2026-05-12T09:00:00Z' },
  { id: 'idea-2', asociatie_id: 'demo-asoc', author_user_id: 'u-res2', author_name: 'Georgescu Elena', title: 'Suport de biciclete la intrare', body: 'Un rastel ar elibera holul de la parter de biciclete.', status: 'aprobat', votes: 21, created_at: '2026-05-08T09:00:00Z' },
  { id: 'idea-3', asociatie_id: 'demo-asoc', author_user_id: 'u-res3', author_name: 'Stan Gabriela', title: 'Senzori de mișcare pe casa scării', body: 'Ar reduce consumul de curent la iluminatul comun.', status: 'implementat', votes: 30, created_at: '2026-04-20T09:00:00Z' },
];

// F18 — Istoric reparații.
export const DEMO_REPAIRS: RepairRecord[] = [
  { id: 'rr-1', asociatie_id: 'demo-asoc', system: 'apa', title: 'Înlocuire pompă hidrofor', description: 'Pompa principală de presiune a fost înlocuită cu un model Grundfos. Garanție 2 ani.', contractor: 'HidroServ SRL', cost: 4200, warranty_until: '2027-09-15', performed_at: '2025-09-15', created_at: '2025-09-16T10:00:00Z' },
  { id: 'rr-2', asociatie_id: 'demo-asoc', system: 'lift', title: 'Revizie generală lift + cabluri', description: 'Schimbare cabluri de tracțiune și verificare ISCIR.', contractor: 'Lift Expert', cost: 6800, warranty_until: '2026-06-10', performed_at: '2025-06-10', created_at: '2025-06-11T10:00:00Z' },
  { id: 'rr-3', asociatie_id: 'demo-asoc', system: 'electric', title: 'Refacere tablou electric parter', description: 'Înlocuire siguranțe și refacere legături în tabloul de la parter.', contractor: 'ElectroFix', cost: 1500, warranty_until: '2024-11-01', performed_at: '2023-11-01', created_at: '2023-11-02T10:00:00Z' },
];

// F20 — Citire contoare. Meters belong to the demo resident's apartment (ap-2).
export const DEMO_METERS: Meter[] = [
  { id: 'mt-1', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'apa_rece', serial: 'AR-882140', last_value: 312 },
  { id: 'mt-2', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'apa_calda', serial: 'AC-771203', last_value: 188 },
  { id: 'mt-3', asociatie_id: 'demo-asoc', apartment_id: 'ap-2', kind: 'gaz', serial: 'GZ-440019', last_value: 1043 },
];

export const DEMO_METER_READINGS: MeterReading[] = [
  { id: 'mrd-1', asociatie_id: 'demo-asoc', meter_id: 'mt-1', value: 312, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
  { id: 'mrd-2', asociatie_id: 'demo-asoc', meter_id: 'mt-2', value: 188, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
  { id: 'mrd-3', asociatie_id: 'demo-asoc', meter_id: 'mt-3', value: 1043, photo_path: null, submitted_by: 'u-res', reading_date: '2026-04-03', created_at: '2026-04-03T09:00:00Z' },
];

// F36 — Locator directory (opt-in).
export const DEMO_DIRECTORY: DirectoryEntry[] = [
  { id: 'dir-1', asociatie_id: 'demo-asoc', user_id: 'u-res', name: 'Popescu Andrei', apartment: 'Ap. 5', phone: '+40 721 111 222', email: 'andrei.popescu@example.ro', show_name: true, show_apartment: true, show_phone: true, show_email: false },
  { id: 'dir-2', asociatie_id: 'demo-asoc', user_id: 'u-res2', name: 'Georgescu Elena', apartment: 'Ap. 9', phone: '+40 722 333 444', email: 'elena.g@example.ro', show_name: true, show_apartment: true, show_phone: false, show_email: true },
  { id: 'dir-3', asociatie_id: 'demo-asoc', user_id: 'u-res3', name: 'Stan Gabriela', apartment: 'Ap. 17', phone: '+40 723 555 666', email: 'gabriela.stan@example.ro', show_name: true, show_apartment: false, show_phone: false, show_email: false },
];

// The current demo user's own directory entry (used by the consent toggles).
export const DEMO_MY_DIRECTORY: DirectoryEntry = DEMO_DIRECTORY[0];

// F38 — Carte de aur (mulțumiri).
export const DEMO_THANK_YOUS: ThankYou[] = [
  { id: 'ty-1', asociatie_id: 'demo-asoc', from_user_id: 'u-res2', from_name: 'Georgescu Elena', to_apartment: 'Ap. 13', message: 'Mulțumesc lui Andrei de la 13 care a urcat sacii cu pământ ai bunicii. Mare ajutor!', created_at: '2026-05-18T16:00:00Z' },
  { id: 'ty-2', asociatie_id: 'demo-asoc', from_user_id: 'u-res3', from_name: 'Stan Gabriela', to_apartment: 'Ap. 1', message: 'Mulțumiri doamnei Maria de la 1 pentru că a udat florile de pe casa scării toată vara.', created_at: '2026-05-10T11:00:00Z' },
];

// F15 — Sondaje de opinie. Tally is keyed by option label.
export const DEMO_SURVEYS: Survey[] = [
  { id: 'sv-1', asociatie_id: 'demo-asoc', title: 'Ce culoare să aibă noua fațadă?', options: ['Crem', 'Gri deschis', 'Teracotă'], anonymous: true, closes_at: '2026-06-15T23:59:00Z', created_at: '2026-05-14T09:00:00Z' },
  { id: 'sv-2', asociatie_id: 'demo-asoc', title: 'La ce oră preferi curățenia generală pe casa scării?', options: ['Dimineața', 'După-amiaza', 'În weekend'], anonymous: true, closes_at: null, created_at: '2026-05-10T09:00:00Z' },
];

export const DEMO_SURVEY_TALLIES: Record<string, SurveyTally> = {
  'sv-1': { Crem: 6, 'Gri deschis': 11, Teracotă: 3 },
  'sv-2': { Dimineața: 4, 'După-amiaza': 2, 'În weekend': 14 },
};

// F24 — Listă obiecte împrumutabile.
export const DEMO_LENDING_ITEMS: LendingItem[] = [
  { id: 'li-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', name: 'Bormașină Bosch', category: 'unelte', photo_path: null, available: true, created_at: '2026-05-12T09:00:00Z' },
  { id: 'li-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', name: 'Scară aluminiu 3m', category: 'unelte', photo_path: null, available: false, created_at: '2026-05-08T09:00:00Z' },
  { id: 'li-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Stan Gabriela', name: 'Set cabluri pornire auto', category: 'auto', photo_path: null, available: true, created_at: '2026-05-04T09:00:00Z' },
];

// F29 — Bicicletăria.
export const DEMO_BIKES: Bike[] = [
  { id: 'bk-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', description: 'Mountain bike negru, Cube', serial: 'CB-2291', photo_path: null, abandoned: false, created_at: '2026-04-20T09:00:00Z' },
  { id: 'bk-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', description: 'Bicicletă de oraș albă, coș împletit', serial: null, photo_path: null, abandoned: false, created_at: '2026-04-15T09:00:00Z' },
  { id: 'bk-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Necunoscut', description: 'Bicicletă copii roșie, ruginită, fără roată față', serial: null, photo_path: null, abandoned: true, created_at: '2025-11-01T09:00:00Z' },
];

// F37 — Pet directory (opt-in).
export const DEMO_PETS: Pet[] = [
  { id: 'pet-1', asociatie_id: 'demo-asoc', owner_user_id: 'u-res', owner_name: 'Popescu Andrei', name: 'Rex', species: 'caine', photo_path: null, emergency_contact: '+40 721 111 222', lost: false, created_at: '2026-03-01T09:00:00Z' },
  { id: 'pet-2', asociatie_id: 'demo-asoc', owner_user_id: 'u-res2', owner_name: 'Georgescu Elena', name: 'Miru', species: 'pisica', photo_path: null, emergency_contact: '+40 722 333 444', lost: true, created_at: '2026-02-10T09:00:00Z' },
  { id: 'pet-3', asociatie_id: 'demo-asoc', owner_user_id: 'u-res3', owner_name: 'Stan Gabriela', name: 'Coco', species: 'papagal', photo_path: null, emergency_contact: null, lost: false, created_at: '2026-01-20T09:00:00Z' },
];

// F48 — Garanție tracker. Expiries straddle "now" (2026-05) so the dashboard
// shows active, expiring-soon and expired assets.
export const DEMO_WARRANTIES: Warranty[] = [
  { id: 'wr-1', asociatie_id: 'demo-asoc', asset: 'Hidrofor Grundfos', purchased_at: '2025-09-15', warranty_months: 24, expires_at: '2027-09-15', document_path: null },
  { id: 'wr-2', asociatie_id: 'demo-asoc', asset: 'Centrală termică comună', purchased_at: '2024-06-01', warranty_months: 24, expires_at: '2026-06-01', document_path: null },
  { id: 'wr-3', asociatie_id: 'demo-asoc', asset: 'Pompă circulație încălzire', purchased_at: '2022-04-01', warranty_months: 24, expires_at: '2024-04-01', document_path: null },
];

// F54 — Vizitatori / străini observați.
export const DEMO_VISITOR_REPORTS: VisitorReport[] = [
  { id: 'vr-1', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res', reporter_name: 'Popescu Andrei', note: 'Persoană necunoscută a sunat la mai multe interfoane, ora 21:30. Spunea că e curier dar nu avea colete.', photo_path: null, status: 'nou', created_at: '2026-05-20T21:35:00Z' },
  { id: 'vr-2', asociatie_id: 'demo-asoc', reporter_user_id: 'u-res2', reporter_name: 'Georgescu Elena', note: 'Mașină parcată în fața intrării toată ziua, fără localnic cunoscut.', photo_path: null, status: 'cunoscut', created_at: '2026-05-18T14:00:00Z' },
];

// F57 — Marketplace intern. Expiries kept ahead of the seeded "now".
export const DEMO_MARKETPLACE: MarketplaceListing[] = [
  { id: 'ml-1', asociatie_id: 'demo-asoc', seller_user_id: 'u-res', seller_name: 'Popescu Andrei', category: 'mobilă', title: 'Canapea extensibilă 3 locuri', description: 'Stare foarte bună, gri, ridicare din ap. 5. Preț negociabil.', price: 600, photo_path: null, expires_at: '2026-06-03T09:00:00Z', created_at: '2026-05-20T09:00:00Z' },
  { id: 'ml-2', asociatie_id: 'demo-asoc', seller_user_id: 'u-res2', seller_name: 'Georgescu Elena', category: 'electrocasnice', title: 'Mașină de spălat Arctic', description: 'Funcțională, 6 kg, o donez pentru ridicare.', price: 0, photo_path: null, expires_at: '2026-05-31T09:00:00Z', created_at: '2026-05-17T09:00:00Z' },
  { id: 'ml-3', asociatie_id: 'demo-asoc', seller_user_id: 'u-res3', seller_name: 'Stan Gabriela', category: 'copii', title: 'Haine copii 2-3 ani (lot)', description: 'Lot de ~20 piese, fete, stare bună.', price: 80, photo_path: null, expires_at: '2026-05-30T09:00:00Z', created_at: '2026-05-16T09:00:00Z' },
];

// F65 — Feedback platformă.
export const DEMO_FEEDBACK: PlatformFeedback[] = [
  { id: 'fb-1', asociatie_id: 'demo-asoc', user_id: 'u-res', anonymous: false, body: 'Mi-ar plăcea să primesc o notificare cu o zi înainte de citirea contoarelor.', sentiment: 'idee', created_at: '2026-05-19T10:00:00Z' },
  { id: 'fb-2', asociatie_id: 'demo-asoc', user_id: null, anonymous: true, body: 'Aplicația e mult mai clară decât grupul de WhatsApp. Mulțumesc!', sentiment: 'lauda', created_at: '2026-05-15T18:30:00Z' },
];

// F33 — Document arhivă.
export const DEMO_DOCUMENTS: DocumentRecord[] = [
  { id: 'doc-1', asociatie_id: 'demo-asoc', category: 'statut', title: 'Statutul asociației de proprietari', storage_path: null, file_name: null, file_size: null, file_type: null, file_data_url: null, version: 2, content_text: 'Statut adoptat în AGA din 2019, actualizat 2023.', created_at: '2023-03-15T09:00:00Z' },
  { id: 'doc-2', asociatie_id: 'demo-asoc', category: 'regulament', title: 'Regulament de ordine interioară', storage_path: null, file_name: null, file_size: null, file_type: null, file_data_url: null, version: 1, content_text: 'Reguli privind liniștea, spațiile comune, animalele de companie și parcarea.', created_at: '2022-09-01T09:00:00Z' },
  { id: 'doc-3', asociatie_id: 'demo-asoc', category: 'contract', title: 'Contract salubritate 2026', storage_path: null, file_name: null, file_size: null, file_type: null, file_data_url: null, version: 1, content_text: 'Contract cu firma de salubritate, ridicare de două ori pe săptămână.', created_at: '2026-01-10T09:00:00Z' },
  { id: 'doc-4', asociatie_id: 'demo-asoc', category: 'cadastru', title: 'Plan cadastral teren', storage_path: null, file_name: null, file_size: null, file_type: null, file_data_url: null, version: 1, content_text: 'Documentație cadastrală pentru terenul aferent blocului.', created_at: '2020-05-20T09:00:00Z' },
];

// F34 — Furnizori / contracte. Contract ends straddle "now" (2026-05).
export const DEMO_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', asociatie_id: 'demo-asoc', name: 'Apa Nova', kind: 'apă', contact: '021 9999', account_number: 'RO12BANK0001', contract_start: '2024-01-01', contract_end: '2027-01-01', last_invoice_date: '2026-05-05' },
  { id: 'sup-2', asociatie_id: 'demo-asoc', name: 'Distrigaz Sud', kind: 'gaz', contact: '021 8888', account_number: 'RO34BANK0002', contract_start: '2023-06-01', contract_end: '2026-06-15', last_invoice_date: '2026-05-03' },
  { id: 'sup-3', asociatie_id: 'demo-asoc', name: 'Salubris SRL', kind: 'salubritate', contact: '0721 000 111', account_number: null, contract_start: '2025-01-01', contract_end: '2026-05-10', last_invoice_date: '2026-04-30' },
  { id: 'sup-4', asociatie_id: 'demo-asoc', name: 'LiftService SRL', kind: 'lift', contact: '0722 222 333', account_number: 'RO56BANK0004', contract_start: '2024-03-01', contract_end: '2028-03-01', last_invoice_date: '2026-05-01' },
];

// F30 — Boxa / dependinți.
export const DEMO_STORAGE_UNITS: StorageUnit[] = [
  { id: 'su-1', asociatie_id: 'demo-asoc', label: 'Boxa 1 — subsol', apartment_id: 'ap-1', apartment_label: 'Ap. 1', notes: 'Lângă centrala termică.' },
  { id: 'su-2', asociatie_id: 'demo-asoc', label: 'Boxa 2 — subsol', apartment_id: 'ap-2', apartment_label: 'Ap. 5', notes: null },
  { id: 'su-3', asociatie_id: 'demo-asoc', label: 'Dependință pod', apartment_id: null, apartment_label: null, notes: 'Neatribuită — în discuție la comitet.' },
];

// F58 — Carpooling (opt-in).
export const DEMO_CARPOOL: CarpoolProfile[] = [
  { id: 'cp-1', asociatie_id: 'demo-asoc', user_id: 'u-res', user_name: 'Popescu Andrei', destination: 'Pipera (zona office)', schedule: 'L–V, plecare 08:00, retur 17:30' },
  { id: 'cp-2', asociatie_id: 'demo-asoc', user_id: 'u-res2', user_name: 'Georgescu Elena', destination: 'Centru — Universitate', schedule: 'L–V, plecare 07:30' },
];

// F63 — Aniversări (opt-in). Day/month only.
export const DEMO_BIRTHDAYS: BirthdayConsent[] = [
  { id: 'bd-1', asociatie_id: 'demo-asoc', user_id: 'u-res', user_name: 'Popescu Andrei', birth_day: 24, birth_month: 5 },
  { id: 'bd-2', asociatie_id: 'demo-asoc', user_id: 'u-res2', user_name: 'Georgescu Elena', birth_day: 3, birth_month: 6 },
  { id: 'bd-3', asociatie_id: 'demo-asoc', user_id: 'u-res3', user_name: 'Stan Gabriela', birth_day: 12, birth_month: 1 },
];

// F47 — Energy efficiency tracker.
export const DEMO_ENERGY: EnergyRecord[] = [
  { id: 'en-1', asociatie_id: 'demo-asoc', period: '2026-04-01', kind: 'Iluminat comun', amount: 540, cost: 410 },
  { id: 'en-2', asociatie_id: 'demo-asoc', period: '2026-04-01', kind: 'Lift', amount: 320, cost: 245 },
  { id: 'en-3', asociatie_id: 'demo-asoc', period: '2026-03-01', kind: 'Iluminat comun', amount: 580, cost: 440 },
  { id: 'en-4', asociatie_id: 'demo-asoc', period: '2026-03-01', kind: 'Lift', amount: 335, cost: 256 },
];

// F45 — Plan multianual de mentenanță.
export const DEMO_MULTIYEAR: MultiyearPlanItem[] = [
  { id: 'mp-1', asociatie_id: 'demo-asoc', year: 2026, title: 'Reparație acoperiș (terasă)', estimated_cost: 45000, notes: 'Hidroizolație + jgheaburi.' },
  { id: 'mp-2', asociatie_id: 'demo-asoc', year: 2027, title: 'Înlocuire coloane apă rece', estimated_cost: 80000, notes: null },
  { id: 'mp-3', asociatie_id: 'demo-asoc', year: 2029, title: 'Anvelopare termică fațadă', estimated_cost: 320000, notes: 'Posibil cofinanțare program local.' },
];

// F32 — Acces curierat (coduri temporare). Seeded with one active code.
export const DEMO_ACCESS_CODES: AccessCode[] = [
  {
    id: 'ac-1',
    asociatie_id: 'demo-asoc',
    generated_by: 'u-res',
    code: '482190',
    expires_at: new Date(Date.now() + 18 * 60_000).toISOString(),
    used_at: null,
    created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
];

// F59 — Babysitting / pet-sitting bord (opt-in).
export const DEMO_SITTERS: SitterProfile[] = [
  { id: 'st-1', asociatie_id: 'demo-asoc', user_id: 'u-res2', user_name: 'Georgescu Elena', kind: 'babysitting', availability: 'Seri în weekend', rate: '40 lei/oră' },
  { id: 'st-2', asociatie_id: 'demo-asoc', user_id: 'u-res3', user_name: 'Stan Gabriela', kind: 'petsitting', availability: 'Flexibil, anunț cu o zi înainte', rate: 'Negociabil' },
];

// F60 — Skill exchange / barter.
export const DEMO_SKILLS: SkillOffering[] = [
  { id: 'sk-1', asociatie_id: 'demo-asoc', user_id: 'u-res2', user_name: 'Georgescu Elena', offers: 'Reparații biciclete, ascuțit cuțite', needs: 'Ajutor cu Excel și formulare online' },
  { id: 'sk-2', asociatie_id: 'demo-asoc', user_id: 'u-res3', user_name: 'Stan Gabriela', offers: 'Croitorie, mici reparații haine', needs: 'Transport ocazional la piață' },
];

// F61 — Grupuri de cumpărături comune.
export const DEMO_GROUP_BUYS: GroupBuy[] = [
  { id: 'gb-1', asociatie_id: 'demo-asoc', organizer_user_id: 'u-res2', organizer_name: 'Georgescu Elena', title: '50 kg cartofi de la fermă', description: 'Comand direct de la producător, ridicare sâmbătă în parcare.', deadline: new Date(Date.now() + 4 * 86_400_000).toISOString(), created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), signups: 6 },
  { id: 'gb-2', asociatie_id: 'demo-asoc', organizer_user_id: 'u-res3', organizer_name: 'Stan Gabriela', title: 'Lemne de foc (bax 1 mc)', description: 'Comandă comună pentru livrare cu transport unic.', deadline: new Date(Date.now() + 9 * 86_400_000).toISOString(), created_at: new Date(Date.now() - 1 * 86_400_000).toISOString(), signups: 3 },
];

// F40 — Glosar de termeni.
export const DEMO_GLOSSARY: GlossaryEntry[] = [
  { id: 'gl-1', asociatie_id: 'demo-asoc', term: 'Cotă-parte indiviză', definition: 'Procentul din proprietatea comună (scări, acoperiș, fațadă) care revine fiecărui apartament, calculat de regulă în funcție de suprafața utilă. Determină ponderea la votul ponderat și la repartizarea unor cheltuieli.' },
  { id: 'gl-2', asociatie_id: 'demo-asoc', term: 'Fond de rulment', definition: 'Sumă de garanție depusă de fiecare apartament, folosită de asociație pentru a plăti facturile curente până la încasarea cotelor de întreținere.' },
  { id: 'gl-3', asociatie_id: 'demo-asoc', term: 'Fond de reparații', definition: 'Sumă acumulată lunar pentru lucrări majore viitoare (acoperiș, fațadă, instalații). Se constituie prin hotărâre a Adunării Generale.' },
  { id: 'gl-4', asociatie_id: 'demo-asoc', term: 'Cenzor', definition: 'Persoana sau firma care verifică gestiunea financiară a asociației și prezintă un raport Adunării Generale.' },
  { id: 'gl-5', asociatie_id: 'demo-asoc', term: 'Comitet executiv', definition: 'Organul ales de proprietari care administrează curent asociația între Adunările Generale, format din președinte și membri.' },
];

const dayOffset = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// F19 — Calendar service-uri programate.
export const DEMO_MAINTENANCE: ScheduledMaintenance[] = [
  { id: 'sm-1', asociatie_id: 'demo-asoc', title: 'Revizie centrală termică', vendor: 'TermoServ SRL', recurrence: 'Anual', last_done: dayOffset(-340), next_due: dayOffset(-5), notes: 'Necesită acces în centrala de la subsol.' },
  { id: 'sm-2', asociatie_id: 'demo-asoc', title: 'Verificare ISCIR lift', vendor: 'Lift Expert', recurrence: 'Anual', last_done: dayOffset(-350), next_due: dayOffset(12), notes: 'Liftul va fi oprit ~2 ore.' },
  { id: 'sm-3', asociatie_id: 'demo-asoc', title: 'Deratizare subsol și ghene', vendor: 'DDD Clean', recurrence: 'Trimestrial', last_done: dayOffset(-80), next_due: dayOffset(40), notes: null },
];

// F28 — Parcare.
export const DEMO_PARKING: ParkingSpot[] = [
  { id: 'pk-1', asociatie_id: 'demo-asoc', label: 'P1', zone: 'Față', is_visitor: false, apartment_label: 'Ap. 5', license_plate: 'B 12 ABC' },
  { id: 'pk-2', asociatie_id: 'demo-asoc', label: 'P2', zone: 'Față', is_visitor: false, apartment_label: 'Ap. 9', license_plate: 'B 99 XYZ' },
  { id: 'pk-3', asociatie_id: 'demo-asoc', label: 'P3', zone: 'Spate', is_visitor: false, apartment_label: null, license_plate: null },
  { id: 'pk-4', asociatie_id: 'demo-asoc', label: 'V1', zone: 'Vizitatori', is_visitor: true, apartment_label: null, license_plate: null },
];

// F16 — Petiții interne.
export const DEMO_PETITIONS: Petition[] = [
  { id: 'pt-1', asociatie_id: 'demo-asoc', author_user_id: 'u-res2', author_name: 'Georgescu Elena', title: 'Schimbarea firmei de curățenie', body: 'Calitatea curățeniei a scăzut în ultimele luni. Cerem comitetului să analizeze oferte alternative.', threshold_percent: 25, status: 'deschisa', created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), signatures: 1, total_apartments: 5 },
];

// F44 — Crowdfunding proiecte mici.
export const DEMO_CROWDFUNDS: Crowdfund[] = [
  { id: 'cf-1', asociatie_id: 'demo-asoc', title: 'Loc de joacă pentru copii în curte', description: 'Un leagăn și un tobogan mic pentru copiii din bloc. Contribuție voluntară.', target_amount: 4000, deadline: dayOffset(30), created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(), pledged: 1500 },
  { id: 'cf-2', asociatie_id: 'demo-asoc', title: 'Decorațiuni de sărbători', description: 'Instalație luminoasă pentru intrarea blocului în decembrie.', target_amount: 1200, deadline: dayOffset(-2), created_at: new Date(Date.now() - 40 * 86_400_000).toISOString(), pledged: 1200 },
];

// F51 — Verificări PSI.
export const DEMO_PSI_ASSETS: PsiAsset[] = [
  { id: 'psi-1', asociatie_id: 'demo-asoc', asset: 'Stingătoare scara A', kind: 'Stingător', location: 'Câte unul pe fiecare palier', next_check: dayOffset(-3) },
  { id: 'psi-2', asociatie_id: 'demo-asoc', asset: 'Hidranți interiori', kind: 'Hidrant', location: 'Casa scării, etajele 2 și 6', next_check: dayOffset(20) },
  { id: 'psi-3', asociatie_id: 'demo-asoc', asset: 'Verificare instalație electrică', kind: 'Instalație electrică', location: 'Tablou general subsol', next_check: dayOffset(400) },
];

// F52 — Asigurare bloc.
export const DEMO_INSURANCE: InsurancePolicy[] = [
  { id: 'ins-1', asociatie_id: 'demo-asoc', insurer: 'Allianz-Țiriac', policy_number: 'POL-2025-44821', expires_at: dayOffset(18), document_path: null },
];

// F53 — Registru de chei.
export const DEMO_KEYS: KeyRecord[] = [
  { id: 'key-1', asociatie_id: 'demo-asoc', space: 'Centrală termică (subsol)', holder_name: 'Administrator — Ionescu Mihai', notes: 'Cheie unică, copie la președinte.' },
  { id: 'key-2', asociatie_id: 'demo-asoc', space: 'Terasă / acoperiș', holder_name: 'Președinte — Popescu Andrei', notes: null },
  { id: 'key-3', asociatie_id: 'demo-asoc', space: 'Magazia administrației', holder_name: 'Administrator — Ionescu Mihai', notes: null },
];

// F05 — Mesaj anonim către comitet.
export const DEMO_ANONYMOUS_MESSAGES: AnonymousMessage[] = [
  { id: 'an-1', asociatie_id: 'demo-asoc', sender_user_id: 'u-res2', body: 'Vecinul de la parter lasă gunoiul pe casa scării de câteva zile. Aș vrea să fie discutat fără să se știe că eu am sesizat.', status: 'nou', created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  { id: 'an-2', asociatie_id: 'demo-asoc', sender_user_id: 'u-res3', body: 'Cred că becul de la etajul 3 e spart de mai bine de o lună. Mulțumesc.', status: 'rezolvat', created_at: new Date(Date.now() - 12 * 86_400_000).toISOString() },
];

// F04 — Mesagerie privată cu administratorul (inbox cu rol dublu).
// `read` = citit de destinatar: un mesaj al locatarului este citit de administrator,
// un mesaj al administratorului este citit de locatar.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
export const DEMO_PRIVATE_THREADS: PrivateThread[] = [
  // Conversație calmă, complet citită de ambele părți (Popescu Andrei, Ap. 5).
  {
    id: 'pt-1', asociatie_id: 'demo-asoc', resident_user_id: 'u-res', resident_name: 'Popescu Andrei', apartment_label: 'Ap. 5',
    subject: 'Eroare la cota de întreținere pe luna aceasta', status: 'open', created_at: hoursAgo(30),
    messages: [
      { id: 'pm-1', thread_id: 'pt-1', sender: 'resident', sender_name: 'Popescu Andrei', body: 'Bună ziua, cred că la apartamentul meu a fost trecut greșit consumul de apă caldă luna aceasta. Puteți verifica?', created_at: hoursAgo(30), read: true },
      { id: 'pm-2', thread_id: 'pt-1', sender: 'admin', sender_name: 'Administrator', body: 'Bună ziua, verific indexul declarat și revin cu un răspuns până mâine.', created_at: hoursAgo(28), read: true },
      { id: 'pm-3', thread_id: 'pt-1', sender: 'resident', sender_name: 'Popescu Andrei', body: 'Vă mulțumesc!', created_at: hoursAgo(27), read: true },
    ],
  },
  // Conversație rezolvată (Popescu Andrei, Ap. 5).
  {
    id: 'pt-2', asociatie_id: 'demo-asoc', resident_user_id: 'u-res', resident_name: 'Popescu Andrei', apartment_label: 'Ap. 5',
    subject: 'Adeverință pentru fond de rulment', status: 'resolved', created_at: hoursAgo(240),
    messages: [
      { id: 'pm-4', thread_id: 'pt-2', sender: 'resident', sender_name: 'Popescu Andrei', body: 'Am nevoie de o adeverință că nu am restanțe la întreținere, pentru bancă.', created_at: hoursAgo(240), read: true },
      { id: 'pm-5', thread_id: 'pt-2', sender: 'admin', sender_name: 'Administrator', body: 'Am pregătit adeverința, o puteți ridica de la birou sau v-o trimit pe email. Confirmați adresa?', created_at: hoursAgo(236), read: true },
    ],
  },
  // Mesaj nou de la alt locatar, necitit de administrator (Ionescu Maria, Ap. 1):
  // apare în inbox-ul administratorului ca necitit și în așteptarea unui răspuns.
  {
    id: 'pt-3', asociatie_id: 'demo-asoc', resident_user_id: 'u-ap1', resident_name: 'Ionescu Maria', apartment_label: 'Ap. 1',
    subject: 'Zgomot de la lucrările vecinului de deasupra', status: 'open', created_at: hoursAgo(5),
    messages: [
      { id: 'pm-6', thread_id: 'pt-3', sender: 'resident', sender_name: 'Ionescu Maria', body: 'Bună ziua, vecinul de la etajul superior face lucrări de renovare după ora 20:00. Puteți să îi reamintiți de orele de liniște?', created_at: hoursAgo(5), read: false },
    ],
  },
  // Conversație inițiată de administrator către un locatar (Georgescu Elena, Ap. 9),
  // încă necitită de locatar.
  {
    id: 'pt-4', asociatie_id: 'demo-asoc', resident_user_id: 'u-ap3', resident_name: 'Georgescu Elena', apartment_label: 'Ap. 9',
    subject: 'Index contor apă rece — luna mai', status: 'open', created_at: hoursAgo(20),
    messages: [
      { id: 'pm-7', thread_id: 'pt-4', sender: 'admin', sender_name: 'Administrator', body: 'Bună ziua, nu am primit indexul la apa rece pentru luna mai. Îl puteți transmite până vineri, vă rog?', created_at: hoursAgo(20), read: false },
    ],
  },
];

// F11 — Procese verbale (arhivă).
export const DEMO_PV_DOCUMENTS: PvDocument[] = [
  { id: 'pv-1', asociatie_id: 'demo-asoc', title: 'Proces verbal AGA ordinară 2026', doc_date: dayOffset(-40), category: 'AGA', content_text: 'Adunarea Generală a aprobat bugetul pe 2026, alegerea comitetului și majorarea fondului de reparații.', storage_path: null, created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() },
  { id: 'pv-2', asociatie_id: 'demo-asoc', title: 'Proces verbal ședință comitet — martie', doc_date: dayOffset(-70), category: 'Comitet', content_text: 'Comitetul a decis schimbarea firmei de salubritate și recepția lucrărilor la acoperiș.', storage_path: null, created_at: new Date(Date.now() - 70 * 86_400_000).toISOString() },
  { id: 'pv-3', asociatie_id: 'demo-asoc', title: 'Proces verbal recepție lucrări fațadă', doc_date: dayOffset(-200), category: 'Recepție lucrări', content_text: 'Recepția finală a lucrărilor de anvelopare termică, fără obiecțiuni majore.', storage_path: null, created_at: new Date(Date.now() - 200 * 86_400_000).toISOString() },
];

// F22 — Solicitare oferte (RFP).
export const DEMO_RFPS: Rfp[] = [
  {
    id: 'rfp-1', asociatie_id: 'demo-asoc', title: 'Reabilitare instalație de hidrofor', description: 'Înlocuirea pompei și a vasului de expansiune la hidroforul din subsol.', status: 'deschis', created_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    quotes: [
      { id: 'q-1', rfp_id: 'rfp-1', contractor: 'HidroTech SRL', amount: 8500, selected: false },
      { id: 'q-2', rfp_id: 'rfp-1', contractor: 'AquaFix', amount: 7200, selected: false },
    ],
  },
  {
    id: 'rfp-2', asociatie_id: 'demo-asoc', title: 'Zugrăvit casa scării A', description: 'Zugrăvire integrală pe toate cele 8 etaje, inclusiv holuri.', status: 'decis', created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    quotes: [
      { id: 'q-3', rfp_id: 'rfp-2', contractor: 'ZugravExpert', amount: 12000, selected: true },
      { id: 'q-4', rfp_id: 'rfp-2', contractor: 'Renov SRL', amount: 13500, selected: false },
    ],
  },
];

// F23 — Vecin de gardă (weekend rotation).
export const DEMO_DUTY: DutySlot[] = [
  { id: 'duty-1', asociatie_id: 'demo-asoc', week_start: dayOffset(-((new Date().getDay() + 1) % 7)), volunteer_user_id: 'u-res', volunteer_name: 'Popescu Andrei', note: 'Disponibil pentru urgențe de instalator.' },
  { id: 'duty-2', asociatie_id: 'demo-asoc', week_start: dayOffset(7 - ((new Date().getDay() + 1) % 7)), volunteer_user_id: null, volunteer_name: null, note: null },
  { id: 'duty-3', asociatie_id: 'demo-asoc', week_start: dayOffset(14 - ((new Date().getDay() + 1) % 7)), volunteer_user_id: 'u-res2', volunteer_name: 'Georgescu Elena', note: null },
];

// F31 — Plante / spații verzi.
export const DEMO_GREEN_TASKS: GreenTask[] = [
  { id: 'gt-1', asociatie_id: 'demo-asoc', title: 'Udat plantele din curte', week_start: dayOffset(-((new Date().getDay() + 6) % 7)), volunteer_user_id: 'u-res3', volunteer_name: 'Stan Gabriela' },
  { id: 'gt-2', asociatie_id: 'demo-asoc', title: 'Tuns gazonul din față', week_start: dayOffset(7 - ((new Date().getDay() + 6) % 7)), volunteer_user_id: null, volunteer_name: null },
  { id: 'gt-3', asociatie_id: 'demo-asoc', title: 'Curățat aleea și jardinierele', week_start: dayOffset(14 - ((new Date().getDay() + 6) % 7)), volunteer_user_id: null, volunteer_name: null },
];

// F39 — Wiki bloc.
export const DEMO_WIKI: WikiPage[] = [
  { id: 'wk-1', asociatie_id: 'demo-asoc', slug: 'inchidere-apa', title: 'Cum se închide apa pe toată scara', body_md: 'Robinetul general este în subsol, lângă hidrofor. Se rotește în sensul acelor de ceasornic până se oprește. Anunță vecinii înainte — apa caldă revine greu după repornire.', updated_at: new Date(Date.now() - 10 * 86_400_000).toISOString() },
  { id: 'wk-2', asociatie_id: 'demo-asoc', slug: 'lift-blocat', title: 'Ce faci dacă se blochează liftul', body_md: 'Apasă butonul de alarmă din cabină. Sună la dispeceratul liftului: numărul e afișat în cabină și în secțiunea „Numere de urgență”. Nu încerca să forțezi ușile.', updated_at: new Date(Date.now() - 25 * 86_400_000).toISOString() },
  { id: 'wk-3', asociatie_id: 'demo-asoc', slug: 'cheie-pivnita', title: 'Unde e cheia de la pivniță', body_md: 'Cheia de la pivniță e la administrator și o copie la președinte. Vezi „Registru de chei” pentru detalii de contact.', updated_at: new Date(Date.now() - 60 * 86_400_000).toISOString() },
];

// F43 — Contractor library.
export const DEMO_CONTRACTORS: Contractor[] = [
  { id: 'ct-1', asociatie_id: 'demo-asoc', name: 'HidroTech SRL', specialty: 'Instalații sanitare', price_tier: 'mediu', contact: '+40 721 100 100', last_used: dayOffset(-90), available: true, rating: 4.5, rating_count: 4 },
  { id: 'ct-2', asociatie_id: 'demo-asoc', name: 'ElectroBloc', specialty: 'Instalații electrice', price_tier: 'ridicat', contact: '+40 722 200 200', last_used: dayOffset(-200), available: true, rating: 4, rating_count: 2 },
  { id: 'ct-3', asociatie_id: 'demo-asoc', name: 'ZugravExpert', specialty: 'Zugrăveli și finisaje', price_tier: 'scazut', contact: '+40 723 300 300', last_used: dayOffset(-30), available: false, rating: 3.5, rating_count: 6 },
];

// F55 — Sistem alarmă (status).
export const DEMO_ALARM_SYSTEMS: AlarmSystem[] = [
  {
    id: 'al-1', asociatie_id: 'demo-asoc', name: 'Detecție incendiu subsol', status: 'ok', last_test: dayOffset(-20),
    events: [
      { id: 'ae-1', system_id: 'al-1', kind: 'Test lunar', occurred_at: new Date(Date.now() - 20 * 86_400_000).toISOString() },
      { id: 'ae-2', system_id: 'al-1', kind: 'Test lunar', occurred_at: new Date(Date.now() - 50 * 86_400_000).toISOString() },
    ],
  },
  {
    id: 'al-2', asociatie_id: 'demo-asoc', name: 'Sirenă casa scării', status: 'defect', last_test: dayOffset(-95),
    events: [
      { id: 'ae-3', system_id: 'al-2', kind: 'Defecțiune semnalată', occurred_at: new Date(Date.now() - 5 * 86_400_000).toISOString() },
    ],
  },
];

// F02 — Canal de discuții moderat.
export const DEMO_DISCUSSIONS: DiscussionThread[] = [
  {
    id: 'dt-1', asociatie_id: 'demo-asoc', topic: '#anunturi', title: 'Reguli pentru zona de parcare', pinned: true,
    created_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    messages: [
      { id: 'dm-1', thread_id: 'dt-1', author_user_id: 'u-com', author_name: 'Ionescu Maria (comitet)', body: 'Vă rugăm să nu blocați accesul la pubele când parcați pe locurile vizitatorilor.', created_at: new Date(Date.now() - 12 * 86_400_000).toISOString() },
      { id: 'dm-2', thread_id: 'dt-1', author_user_id: 'u-res2', author_name: 'Georgescu Elena', body: 'Mulțumim! S-a întâmplat des în ultima vreme.', created_at: new Date(Date.now() - 11 * 86_400_000).toISOString() },
    ],
  },
  {
    id: 'dt-2', asociatie_id: 'demo-asoc', topic: '#curatenie', title: 'Firma de curățenie sare scara B?', pinned: false,
    created_at: new Date(Date.now() - 4 * 86_400_000).toISOString(),
    messages: [
      { id: 'dm-3', thread_id: 'dt-2', author_user_id: 'u-res3', author_name: 'Stan Gabriela', body: 'A treia oară săptămâna asta când scara B nu e măturată. Cineva mai observă?', created_at: new Date(Date.now() - 4 * 86_400_000).toISOString() },
    ],
  },
  {
    id: 'dt-3', asociatie_id: 'demo-asoc', topic: '#vecini', title: 'Schimb de roșii din grădină 🍅', pinned: false,
    created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    messages: [],
  },
];

// F12 — Buget participativ.
export const DEMO_BUDGET_CYCLE: BudgetCycle = {
  id: 'bc-1', asociatie_id: 'demo-asoc', title: 'Fond discreționar 2026 — 5.000 lei', pool: 5000, phase: 'vot',
  proposals: [
    { id: 'bp-1', cycle_id: 'bc-1', title: 'Bănci noi în curte', cost: 2200, author_name: 'Georgescu Elena', votes: 14, voted: false },
    { id: 'bp-2', cycle_id: 'bc-1', title: 'Decorațiuni de sărbători', cost: 1800, author_name: 'Stan Gabriela', votes: 9, voted: false },
    { id: 'bp-3', cycle_id: 'bc-1', title: 'Trei copaci ornamentali', cost: 1500, author_name: 'Marin Vlad', votes: 7, voted: false },
    { id: 'bp-4', cycle_id: 'bc-1', title: 'Suport pentru biciclete', cost: 2600, author_name: 'Popa Radu', votes: 4, voted: false },
  ],
};

// F10 — AGA digitală. Three assemblies across the lifecycle so the demo shows a
// live vote, an upcoming convocator, and a concluded one with a proces-verbal.
const agaTime = (days: number) => `${dayOffset(days)}T18:00:00`;
export const DEMO_AGAS: AgaMeeting[] = [
  {
    id: 'aga-1',
    asociatie_id: 'demo-asoc',
    title: 'AGA ordinară 2026',
    scheduled_at: agaTime(0),
    location: 'Sala de ședințe, parter scara A',
    scheduled_online: false,
    required_quorum_percent: 50,
    status: 'in_desfasurare',
    total_apartments: 40,
    represented_apartments: 23,
    my_rsvp: 'prezent',
    agenda: [
      {
        id: 'agi-1', aga_id: 'aga-1', sort_order: 1, majority_rule: 'simple',
        title: 'Aprobarea bugetului de venituri și cheltuieli pe 2026',
        description: 'Bugetul propus de administrator pentru anul în curs.',
        votes: { pentru: 17, contra: 4, abtinere: 2 }, my_vote: null,
      },
      {
        id: 'agi-2', aga_id: 'aga-1', sort_order: 2, majority_rule: 'absolute',
        title: 'Majorarea fondului de reparații la 0,80 lei/m²/lună',
        description: 'Necesită majoritatea proprietarilor (jumătate plus unu).',
        votes: { pentru: 15, contra: 6, abtinere: 1 }, my_vote: null,
      },
      {
        id: 'agi-3', aga_id: 'aga-1', sort_order: 3, majority_rule: 'qualified_2_3',
        title: 'Contractarea unui credit pentru reabilitarea termică',
        description: 'Lucrare majoră — necesită o majoritate calificată de două treimi.',
        votes: { pentru: 11, contra: 8, abtinere: 2 }, my_vote: null,
      },
    ],
  },
  {
    id: 'aga-2',
    asociatie_id: 'demo-asoc',
    title: 'AGA extraordinară — înlocuire lift',
    scheduled_at: agaTime(18),
    location: '',
    scheduled_online: true,
    required_quorum_percent: 50,
    status: 'convocata',
    total_apartments: 40,
    represented_apartments: 0,
    my_rsvp: null,
    agenda: [
      {
        id: 'agi-4', aga_id: 'aga-2', sort_order: 1, majority_rule: 'qualified_2_3',
        title: 'Aprobarea înlocuirii liftului din scara A',
        description: 'Selectarea ofertei și aprobarea cheltuielii.',
        votes: { pentru: 0, contra: 0, abtinere: 0 }, my_vote: null,
      },
      {
        id: 'agi-5', aga_id: 'aga-2', sort_order: 2, majority_rule: 'simple',
        title: 'Mandatarea comitetului pentru semnarea contractului',
        description: 'Împuternicirea comitetului să semneze cu ofertantul câștigător.',
        votes: { pentru: 0, contra: 0, abtinere: 0 }, my_vote: null,
      },
    ],
  },
  {
    id: 'aga-3',
    asociatie_id: 'demo-asoc',
    title: 'AGA ordinară 2025',
    scheduled_at: agaTime(-210),
    location: 'Sala de ședințe, parter scara A',
    scheduled_online: false,
    required_quorum_percent: 50,
    status: 'incheiata',
    total_apartments: 40,
    represented_apartments: 29,
    my_rsvp: 'prezent',
    agenda: [
      {
        id: 'agi-6', aga_id: 'aga-3', sort_order: 1, majority_rule: 'simple',
        title: 'Aprobarea descărcării de gestiune pe 2024',
        description: 'Pe baza raportului cenzorului.',
        votes: { pentru: 25, contra: 3, abtinere: 1 }, my_vote: 'pentru',
      },
      {
        id: 'agi-7', aga_id: 'aga-3', sort_order: 2, majority_rule: 'absolute',
        title: 'Alegerea noului comitet executiv',
        description: 'Pentru un mandat de doi ani.',
        votes: { pentru: 22, contra: 5, abtinere: 2 }, my_vote: 'pentru',
      },
    ],
  },
];

// F13 — Prioritizare proiecte mari.
export const DEMO_PRIORITIES: PriorityProject[] = [
  { id: 'pr-1', asociatie_id: 'demo-asoc', title: 'Reabilitare acoperiș', description: 'Infiltrații la ultimul etaj; cea mai urgentă lucrare.', rank: 1 },
  { id: 'pr-2', asociatie_id: 'demo-asoc', title: 'Anvelopare termică fațadă', description: 'Reduce costurile de încălzire pe termen lung.', rank: 2 },
  { id: 'pr-3', asociatie_id: 'demo-asoc', title: 'Modernizare lift', description: 'Liftul actual e funcțional dar vechi.', rank: 3 },
  { id: 'pr-4', asociatie_id: 'demo-asoc', title: 'Refacere instalație electrică comună', description: 'Tabloul de la subsol necesită înlocuire.', rank: 4 },
];

// F25 — Rezervare spălătorie.
export const DEMO_LAUNDRY_RESOURCES = ['Mașină 1', 'Mașină 2', 'Uscător'];
export const DEMO_LAUNDRY_BOOKINGS: LaundryBooking[] = [
  { id: 'lb-1', asociatie_id: 'demo-asoc', resource: 'Mașină 1', date: dayOffset(0), slot: '10:00–12:00', user_id: 'u-res2', user_name: 'Georgescu Elena' },
  { id: 'lb-2', asociatie_id: 'demo-asoc', resource: 'Mașină 2', date: dayOffset(0), slot: '18:00–20:00', user_id: 'u-res', user_name: 'Popescu Andrei' },
  { id: 'lb-3', asociatie_id: 'demo-asoc', resource: 'Uscător', date: dayOffset(1), slot: '08:00–10:00', user_id: 'u-res3', user_name: 'Stan Gabriela' },
];

// F26 — Rezervare lift pentru mutare.
export const DEMO_MOVING_BOOKINGS: MovingBooking[] = [
  { id: 'mv-1', asociatie_id: 'demo-asoc', date: dayOffset(2), slot: '08:00–11:00', floor: '4', user_id: 'u-res2', user_name: 'Georgescu Elena' },
  { id: 'mv-2', asociatie_id: 'demo-asoc', date: dayOffset(3), slot: '14:00–17:00', floor: '7', user_id: 'u-res', user_name: 'Popescu Andrei' },
];

// F27 — Rezervare sală comună / terasă.
export const DEMO_VENUE_BOOKINGS: VenueBooking[] = [
  { id: 'vn-1', asociatie_id: 'demo-asoc', venue: 'Sală comună', date: dayOffset(4), slot: '18:00–22:00', purpose: 'Aniversare 7 ani', user_id: 'u-res2', user_name: 'Georgescu Elena' },
  { id: 'vn-2', asociatie_id: 'demo-asoc', venue: 'Terasă', date: dayOffset(6), slot: '14:00–18:00', purpose: 'Grătar de vară', user_id: 'u-res', user_name: 'Popescu Andrei' },
];

// F62 — Kit de bun-venit pentru locatari noi.
export const DEMO_WELCOME_KIT: WelcomeKitItem[] = [
  { id: 'wk-1', asociatie_id: 'demo-asoc', order: 1, title: 'Citește regulamentul de ordine interioară', body: 'Găsești orele de liniște, regulile pentru spațiile comune și animale în secțiunea „Document arhivă”.' },
  { id: 'wk-2', asociatie_id: 'demo-asoc', order: 2, title: 'Salvează numerele de urgență', body: 'Dispecerat lift, apă, gaz și administratorul sunt la un tap distanță în secțiunea „Numere de urgență”.' },
  { id: 'wk-3', asociatie_id: 'demo-asoc', order: 3, title: 'Trimite indexul la contoare', body: 'În fiecare lună, între 1 și 5, trimite-ți indexurile la apă, gaz și căldură din secțiunea „Citire contoare”.' },
  { id: 'wk-4', asociatie_id: 'demo-asoc', order: 4, title: 'Cunoaște-ți vecinii', body: 'Activează-ți profilul în „Agendă vecini” și aruncă o privire la „Canal de discuții” pentru noutățile zilei.' },
  { id: 'wk-5', asociatie_id: 'demo-asoc', order: 5, title: 'Notează-ți următoarea Adunare Generală', body: 'Participarea la AGA contează — vezi convocatorul și ordinea de zi în aplicație de îndată ce este publicată.' },
];

// F64 — Activități copii și adolescenți. Registrul vârstelor păstrează doar numere, niciun nume.
export const DEMO_KIDS_RANGES: KidsAgeRange[] = [
  { id: 'kr-1', asociatie_id: 'demo-asoc', user_id: 'u-res', bucket: '4-6', count: 1 },
  { id: 'kr-2', asociatie_id: 'demo-asoc', user_id: 'u-res2', bucket: '4-6', count: 2 },
  { id: 'kr-3', asociatie_id: 'demo-asoc', user_id: 'u-res3', bucket: '7-10', count: 1 },
  { id: 'kr-4', asociatie_id: 'demo-asoc', user_id: 'u-res2', bucket: '0-3', count: 1 },
  { id: 'kr-5', asociatie_id: 'demo-asoc', user_id: 'u-res3', bucket: '11-14', count: 1 },
];

export const DEMO_KIDS_EVENTS: KidsEvent[] = [
  { id: 'ke-1', asociatie_id: 'demo-asoc', title: 'Întâlnire la locul de joacă', date: dayOffset(2), time: '17:00', location: 'Locul de joacă din curte', bucket: '4-6', note: 'Aducem mingi și cretă pentru desenat pe asfalt.', interested: 3, organizer_user_id: 'u-res2', organizer_name: 'Georgescu Elena', created_at: dayOffset(-3) },
  { id: 'ke-2', asociatie_id: 'demo-asoc', title: 'Săniuș pe derdelușul din spate', date: dayOffset(5), time: '11:00', location: 'Spatele blocului', bucket: 'all', note: 'Dacă ninge până atunci! Confirmăm cu o zi înainte.', interested: 2, organizer_user_id: 'u-res3', organizer_name: 'Stan Gabriela', created_at: dayOffset(-1) },
  { id: 'ke-3', asociatie_id: 'demo-asoc', title: 'Turneu de fotbal pentru adolescenți', date: dayOffset(-6), time: '18:00', location: 'Terenul din parcare', bucket: '11-14', note: 'A fost super, mulțumim tuturor!', interested: 5, organizer_user_id: 'u-res', organizer_name: 'Popescu Andrei', created_at: dayOffset(-12) },
];

// F41 — Urmărire proiecte. Lucrări majore cu faze, buget și contractor.
export const DEMO_PROJECTS: Project[] = [
  {
    id: 'pr-1', asociatie_id: 'demo-asoc',
    title: 'Reabilitare termică (anvelopare)',
    description: 'Izolarea fațadei și a soclului pentru reducerea pierderilor de căldură. Cofinanțare cu primăria.',
    contractor: 'Anvelope Construct SRL', status: 'in_curs',
    budget_allocated: 420000, budget_spent: 168000,
    phases: [
      { id: 'ph-1a', name: 'Proiectare și autorizație', status: 'finalizat' },
      { id: 'ph-1b', name: 'Montare schelă', status: 'finalizat' },
      { id: 'ph-1c', name: 'Termoizolație fațadă', status: 'in_curs' },
      { id: 'ph-1d', name: 'Finisaje și demontare schelă', status: 'asteptare' },
    ],
    created_at: new Date(Date.now() - 60 * 86_400_000).toISOString(),
  },
  {
    id: 'pr-2', asociatie_id: 'demo-asoc',
    title: 'Modernizare lift scara A',
    description: 'Înlocuirea cabinei și a automatizării liftului, conform cerințelor ISCIR.',
    contractor: 'Lift Expert', status: 'planificat',
    budget_allocated: 95000, budget_spent: 0,
    phases: [
      { id: 'ph-2a', name: 'Selecție ofertă', status: 'in_curs' },
      { id: 'ph-2b', name: 'Comandă echipament', status: 'asteptare' },
      { id: 'ph-2c', name: 'Montaj și recepție ISCIR', status: 'asteptare' },
    ],
    created_at: new Date(Date.now() - 20 * 86_400_000).toISOString(),
  },
  {
    id: 'pr-3', asociatie_id: 'demo-asoc',
    title: 'Reabilitare acoperiș terasă',
    description: 'Hidroizolație nouă și refacerea șapei de protecție pe acoperișul tip terasă.',
    contractor: 'AcoperișPro', status: 'finalizat',
    budget_allocated: 78000, budget_spent: 81500,
    phases: [
      { id: 'ph-3a', name: 'Demontare strat vechi', status: 'finalizat' },
      { id: 'ph-3b', name: 'Hidroizolație', status: 'finalizat' },
      { id: 'ph-3c', name: 'Șapă de protecție', status: 'finalizat' },
    ],
    created_at: new Date(Date.now() - 220 * 86_400_000).toISOString(),
  },
];

// F42 — Jurnal foto lucrări. În modul demo imaginile sunt reprezentate prin gradiente.
export const DEMO_PROJECT_PHOTOS: ProjectPhoto[] = [
  { id: 'pp-1', asociatie_id: 'demo-asoc', project_id: 'pr-1', project_title: 'Reabilitare termică (anvelopare)', date: dayOffset(-2), caption: 'Termoizolația a ajuns la etajul 4 pe fațada de sud.', phase: 'Termoizolație fațadă', swatch: 'from-amber-400 to-orange-500', author_name: 'Georgescu Elena', created_at: dayOffset(-2) },
  { id: 'pp-2', asociatie_id: 'demo-asoc', project_id: 'pr-1', project_title: 'Reabilitare termică (anvelopare)', date: dayOffset(-15), caption: 'Schela este montată complet pe toate cele trei fațade.', phase: 'Montare schelă', swatch: 'from-sky-400 to-indigo-500', author_name: 'Popescu Andrei', created_at: dayOffset(-15) },
  { id: 'pp-3', asociatie_id: 'demo-asoc', project_id: 'pr-3', project_title: 'Reabilitare acoperiș terasă', date: dayOffset(-205), caption: 'Recepția finală — terasa cu hidroizolația nouă și șapa turnată.', phase: 'Șapă de protecție', swatch: 'from-emerald-400 to-teal-500', author_name: 'Popescu Andrei', created_at: dayOffset(-205) },
];

// F49 — Cod de siguranță. Profil privat al locatarului demo (Popescu Andrei, ap-2).
export const DEMO_SAFETY_PROFILE: SafetyProfile = {
  id: 'sc-1',
  asociatie_id: 'demo-asoc',
  user_id: 'u-res',
  passphrase: 'Castanul din curte',
  note: 'Dacă cineva sună în numele meu și cere bani sau date, întreabă mai întâi parola de mai sus. Nu deschide nimănui fără să mă suni întâi.',
  contacts: [
    { id: 'tc-1', name: 'Mihai (fiul)', relationship: 'fiu', phone: '+40 740 123 456' },
    { id: 'tc-2', name: 'Dr. Ionescu', relationship: 'medic de familie', phone: '+40 721 987 654' },
  ],
  updated_at: dayOffset(-10),
};

// F50 — Plan de evacuare. Fără imagini binare: traseul și fixările sunt text.
export const DEMO_EVACUATION_PLANS: EvacuationPlan[] = [
  {
    id: 'ev-1', asociatie_id: 'demo-asoc', scara: 'A',
    route: 'Ieșire pe casa scării principale către ușa din față. Nu folosiți liftul. Punct de adunare: parcarea din fața blocului, lângă banca de la intrare.',
    equipment: [
      { id: 'eq-1a', kind: 'stingator', location: 'Casa scării, fiecare palier (lângă lift)' },
      { id: 'eq-1b', kind: 'hidrant', location: 'Holul de la parter, stânga intrării' },
      { id: 'eq-1c', kind: 'iesire', location: 'Ușa principală + ușa de serviciu spre curtea din spate' },
      { id: 'eq-1d', kind: 'tablou_electric', location: 'Tablou general la parter, sub casa scării' },
    ],
    updated_at: dayOffset(-40),
  },
];

// F50 — Marcaje animale: locatarii anunță prezența animalelor pentru pompieri.
export const DEMO_PET_MARKERS: PetMarker[] = [
  { id: 'pm-1', asociatie_id: 'demo-asoc', apartment_id: 'ap-3', apartment_label: 'Ap. 9 (et. 2)', species: '1 pisică', user_id: 'u-res2' },
  { id: 'pm-2', asociatie_id: 'demo-asoc', apartment_id: 'ap-5', apartment_label: 'Ap. 17 (et. 4)', species: '1 câine', user_id: 'u-res3' },
];
